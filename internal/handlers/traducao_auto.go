package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/ia"
)

// generosPadraoPT garante a tradução dos gêneros básicos da AniList mesmo quando o
// banco não está acessível (testes unitários ou falha temporária na leitura da taxonomia).
// Em produção, a genre_taxonomy do banco sempre tem precedência sobre este mapa.
var generosPadraoPT = map[string]string{
	"action":        "Ação",
	"adventure":     "Aventura",
	"comedy":        "Comédia",
	"drama":         "Drama",
	"ecchi":         "Ecchi",
	"fantasy":       "Fantasia",
	"horror":        "Terror",
	"mahou shoujo":  "Garota Mágica",
	"mecha":         "Mecha",
	"music":         "Música",
	"mystery":       "Mistério",
	"psychological": "Psicológico",
	"romance":       "Romance",
	"sci-fi":        "Ficção Científica",
	"slice of life": "Cotidiano",
	"sports":        "Esportes",
	"supernatural":  "Sobrenatural",
	"thriller":      "Suspense",
	"isekai":        "Isekai",
	"school":        "Escolar",
	"magic":         "Magia",
	"military":      "Militar",
	"historical":    "Histórico",
	"mythology":     "Mitologia",
	"parody":        "Paródia",
	"samurai":       "Samurai",
	"seinen":        "Seinen",
	"shounen":       "Shounen",
	"shoujo":        "Shoujo",
	"josei":         "Josei",
	"vampire":       "Vampiros",
	"demons":        "Demônios",
	"time travel":   "Viagem no Tempo",
	"cyberpunk":     "Cyberpunk",
	"martial arts":  "Artes Marciais",
	"space":         "Espacial",
	"super power":   "Superpoderes",
}

// TraduzirGenerosComIndice converte a lista de gêneros para português usando o índice da
// genre_taxonomy como fonte primária e eliminando duplicatas mantendo a ordem original.
func TraduzirGenerosComIndice(generos []anilist.Genre, idx indiceRotulos) []anilist.Genre {
	if len(generos) == 0 {
		return generos
	}
	vistos := make(map[string]bool, len(generos))
	traduzidos := make([]anilist.Genre, 0, len(generos))

	for _, g := range generos {
		bruto := strings.TrimSpace(g.Name)
		if bruto == "" {
			continue
		}
		nomePT := ""
		if idx != nil {
			nomePT = idx.canonico(bruto)
		}
		if nomePT == "" {
			if padrao, ok := generosPadraoPT[strings.ToLower(bruto)]; ok {
				nomePT = padrao
			} else {
				nomePT = bruto
			}
		}
		chave := strings.ToLower(nomePT)
		if vistos[chave] {
			continue
		}
		vistos[chave] = true
		traduzidos = append(traduzidos, anilist.Genre{Name: nomePT})
	}
	return traduzidos
}

// TraduzirGenerosNaoCurados aplica a tradução da taxonomia aos gêneros do anime.
func TraduzirGenerosNaoCurados(anime *anilist.Anime) {
	if anime == nil || len(anime.Genres) == 0 {
		return
	}
	tax := taxonomiaAtual()
	anime.Genres = TraduzirGenerosComIndice(anime.Genres, tax.indice)
}

var (
	sinopsesTraduzidasMu  sync.RWMutex
	sinopsesTraduzidasMem = make(map[int]string)

	reQuebraLinhaHTML = regexp.MustCompile(`(?i)<br\s*/?>`)
	reTagsHTML        = regexp.MustCompile(`<[^>]+>`)
	reFonteFinal      = regexp.MustCompile(`(?is)\s*(\(Source:[^)]+\)|\[Written by[^\]]+\])\s*$`)

	// tradutorDeSinopse permite injetar um tradutor falso nos testes unitários.
	tradutorDeSinopse = traduzirSinopsePadrao
	// leitorCacheSinopseBanco e gravadorCacheSinopseBanco permitem testar o cache sem rede.
	leitorCacheSinopseBanco   = lerSinopseTraduzidaDoBanco
	gravadorCacheSinopseBanco = salvarSinopseTraduzidaNoBanco
)

func chaveCacheSinopse(malID int) string {
	return fmt.Sprintf("auto_synopsis_pt:%d", malID)
}

// limparSinopseBruta remove marcações HTML e créditos finais da AniList/MAL.
func limparSinopseBruta(texto string) string {
	s := strings.TrimSpace(texto)
	if s == "" {
		return ""
	}
	s = reQuebraLinhaHTML.ReplaceAllString(s, "\n")
	s = reTagsHTML.ReplaceAllString(s, "")
	s = strings.NewReplacer(
		"&quot;", `"`,
		"&#34;", `"`,
		"&#39;", `'`,
		"&apos;", `'`,
		"&amp;", `&`,
		"&mdash;", "—",
		"&ndash;", "–",
	).Replace(s)
	s = reFonteFinal.ReplaceAllString(s, "")
	// Normaliza excesso de quebras de linha consecutivas.
	linhas := strings.Split(s, "\n")
	var limpas []string
	vazioAnterior := false
	for _, l := range linhas {
		l = strings.TrimSpace(l)
		if l == "" {
			if !vazioAnterior && len(limpas) > 0 {
				limpas = append(limpas, "")
				vazioAnterior = true
			}
			continue
		}
		limpas = append(limpas, l)
		vazioAnterior = false
	}
	return strings.TrimSpace(strings.Join(limpas, "\n"))
}

// parecePortugues detecta se o texto já está redigido em português para evitar chamadas desnecessárias.
func parecePortugues(texto string) bool {
	baixo := " " + strings.ToLower(texto) + " "
	sinais := []string{" não ", " para ", " uma ", " com ", " história ", " quando ", " mundo ", " também ", " após ", " até ", " porém ", " entre "}
	encontrados := 0
	for _, p := range sinais {
		if strings.Contains(baixo, p) {
			encontrados++
			if encontrados >= 2 {
				return true
			}
		}
	}
	return false
}

func lerSinopseTraduzidaDoBanco(malID int) (string, bool) {
	if malID <= 0 {
		return "", false
	}
	client := database.Client
	if client == nil {
		if srv, err := database.ServiceRoleClient(); err == nil {
			client = srv
		}
	}
	if client == nil {
		return "", false
	}
	data, _, err := client.From("app_settings").
		Select("value", "", false).
		Eq("key", chaveCacheSinopse(malID)).
		Execute()
	if err != nil {
		return "", false
	}
	var linhas []struct {
		Value string `json:"value"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil || len(linhas) == 0 {
		return "", false
	}
	val := strings.TrimSpace(linhas[0].Value)
	return val, val != ""
}

func salvarSinopseTraduzidaNoBanco(malID int, sinopse string) {
	if malID <= 0 || strings.TrimSpace(sinopse) == "" {
		return
	}
	client, err := database.ServiceRoleClient()
	if err != nil || client == nil {
		return
	}
	payload := map[string]string{
		"key":        chaveCacheSinopse(malID),
		"value":      strings.TrimSpace(sinopse),
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	}
	if _, _, err := client.From("app_settings").Upsert(payload, "", "", "key").Execute(); err != nil {
		log.Printf("[TRADUÇÃO AUTO] Falha ao gravar cache de sinopse para mal_id %d: %v", malID, err)
	}
}

func traduzirSinopsePadrao(ctx context.Context, titulo, sinopse string) (string, error) {
	if texto, err := traduzirViaGoogleGTX(ctx, sinopse); err == nil && strings.TrimSpace(texto) != "" {
		return texto, nil
	}
	if ia.GroqDisponivel() {
		instrucao := `Traduza fielmente a sinopse do anime para Português do Brasil (pt-BR), mantendo os parágrafos e sem adicionar spoilers. Retorne APENAS um JSON com a chave "sinopse".`
		saida, err := ia.GerarGroq(ctx, instrucao, fmt.Sprintf("Título: %s\nSinopse: %s", titulo, sinopse))
		if err == nil {
			var res struct {
				Sinopse string `json:"sinopse"`
			}
			if json.Unmarshal([]byte(saida), &res) == nil && strings.TrimSpace(res.Sinopse) != "" {
				return strings.TrimSpace(res.Sinopse), nil
			}
		}
	}
	return "", errors.New("serviço de tradução indisponível")
}

func traduzirViaGoogleGTX(ctx context.Context, texto string) (string, error) {
	prazo, cancelar := context.WithTimeout(ctx, 3500*time.Millisecond)
	defer cancelar()

	u := "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=" + url.QueryEscape(texto)
	req, err := http.NewRequestWithContext(prazo, http.MethodGet, u, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status HTTP %d", resp.StatusCode)
	}

	bruto, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", err
	}

	var parsed []any
	if err := json.Unmarshal(bruto, &parsed); err != nil || len(parsed) == 0 {
		return "", errors.New("resposta inválida do tradutor")
	}

	frases, ok := parsed[0].([]any)
	if !ok {
		return "", errors.New("formato inesperado de sentenças")
	}

	var sb strings.Builder
	for _, item := range frases {
		partes, ok := item.([]any)
		if !ok || len(partes) == 0 {
			continue
		}
		if trecho, ok := partes[0].(string); ok {
			sb.WriteString(trecho)
		}
	}

	resultado := strings.TrimSpace(sb.String())
	if resultado == "" {
		return "", errors.New("tradução vazia")
	}
	return resultado, nil
}

// GarantirSinopseEmPortugues traduz a sinopse em inglês de obras ainda não curadas,
// preservando a precedência da curadoria manual e usando cache em memória + banco.
func GarantirSinopseEmPortugues(ctx context.Context, anime *anilist.Anime) {
	if anime == nil || anime.IsCurated {
		return
	}
	limpa := limparSinopseBruta(anime.Synopsis)
	if limpa == "" {
		return
	}
	anime.Synopsis = limpa

	if parecePortugues(limpa) {
		return
	}

	if anime.MalID > 0 {
		sinopsesTraduzidasMu.RLock()
		emMem, ok := sinopsesTraduzidasMem[anime.MalID]
		sinopsesTraduzidasMu.RUnlock()
		if ok && emMem != "" {
			anime.Synopsis = emMem
			return
		}

		if doBanco, ok := leitorCacheSinopseBanco(anime.MalID); ok {
			sinopsesTraduzidasMu.Lock()
			sinopsesTraduzidasMem[anime.MalID] = doBanco
			sinopsesTraduzidasMu.Unlock()
			anime.Synopsis = doBanco
			return
		}
	}

	traduzida, err := tradutorDeSinopse(ctx, anime.Title, limpa)
	if err != nil || strings.TrimSpace(traduzida) == "" {
		return
	}

	traduzida = strings.TrimSpace(traduzida)
	anime.Synopsis = traduzida

	if anime.MalID > 0 {
		sinopsesTraduzidasMu.Lock()
		sinopsesTraduzidasMem[anime.MalID] = traduzida
		sinopsesTraduzidasMu.Unlock()
		gravadorCacheSinopseBanco(anime.MalID, traduzida)
	}
}
