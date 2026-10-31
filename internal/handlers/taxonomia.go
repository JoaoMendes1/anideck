package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// indiceRotulos liga qualquer texto de rótulo (raw_name ou nome de exibição, em
// minúsculas) ao nome de exibição em português. É a mesma informação da
// genre_taxonomy, lida do banco: a Busca deixa de manter uma cópia própria.
type indiceRotulos map[string]string

// taxonomiaCarregada guarda as linhas e o índice montado a partir delas.
type taxonomiaCarregada struct {
	entradas []entradaTaxonomia
	indice   indiceRotulos
}

// A taxonomia muda só quando o admin edita, e InvalidaCuradoriaDepois descarta o cache
// nessa hora. Os dez minutos cobrem escrita feita fora do Painel.
var taxonomiaEmCache = novoCacheComValidade[taxonomiaCarregada](10 * time.Minute)

// taxonomiaAtual devolve a taxonomia em cache, lendo do banco quando vencida.
//
// A leitura usa o service role porque a Busca é pública e a policy de SELECT da
// genre_taxonomy só cobre authenticated. A tabela é vocabulário, sem dado de usuário,
// e a leitura acontece no carregamento do cache, não a cada requisição.
func taxonomiaAtual() taxonomiaCarregada {
	return taxonomiaEmCache.obter(func() (taxonomiaCarregada, bool) {
		client, err := database.ServiceRoleClient()
		if err != nil {
			log.Printf("[TAXONOMIA] Cliente indisponível: %v", err)
			return taxonomiaCarregada{}, false
		}
		data, _, err := client.From("genre_taxonomy").
			Select("raw_name,display_name_pt,tier", "", false).
			Execute()
		if err != nil {
			log.Printf("[TAXONOMIA] Erro ao ler genre_taxonomy: %v", err)
			return taxonomiaCarregada{}, false
		}
		var entradas []entradaTaxonomia
		if err := json.Unmarshal(data, &entradas); err != nil {
			log.Printf("[TAXONOMIA] Payload inesperado: %v", err)
			return taxonomiaCarregada{}, false
		}
		return taxonomiaCarregada{entradas: entradas, indice: montarIndice(entradas)}, true
	})
}

// montarIndice liga cada raw_name e cada nome de exibição ao nome de exibição.
func montarIndice(entradas []entradaTaxonomia) indiceRotulos {
	idx := make(indiceRotulos, len(entradas)*2)
	for _, e := range entradas {
		nome := strings.TrimSpace(e.DisplayNamePt)
		if nome == "" {
			continue
		}
		idx[strings.ToLower(strings.TrimSpace(e.RawName))] = nome
		idx[strings.ToLower(nome)] = nome
	}
	return idx
}

// canonico devolve o nome de exibição do texto, ou "" se ele não está na taxonomia.
func (idx indiceRotulos) canonico(texto string) string {
	return idx[strings.ToLower(strings.TrimSpace(texto))]
}

// termosAniList escolhe, para um rótulo, o termo que vai à AniList.
//
// Só um termo por rótulo: a AniList exige todos os termos de um mesmo filtro, e
// mandar "Female Harem" e "Male Harem" juntos devolveria só animes com os dois.
// Gênero tem preferência sobre tag, porque é o filtro principal da AniList. O
// bool é false quando nenhum termo do rótulo existe na AniList (rótulo só do AniDeck).
func termosAniList(entradas []entradaTaxonomia, rotulo string, vocab *vocabularioAni) (genero, tag string, ok bool) {
	var termos []string
	for _, e := range entradas {
		if strings.EqualFold(strings.TrimSpace(e.DisplayNamePt), strings.TrimSpace(rotulo)) {
			termos = append(termos, strings.TrimSpace(e.RawName))
		}
	}
	sort.Strings(termos)
	for _, t := range termos {
		if vocab.Generos[t] {
			return t, "", true
		}
	}
	for _, t := range termos {
		if vocab.Tags[t] {
			return "", t, true
		}
	}
	return "", "", false
}

// rotuloPublico é um rótulo como a Busca o mostra.
type rotuloPublico struct {
	Nome    string `json:"nome"`
	Camada  string `json:"camada"`
	Curados int    `json:"curados"`
}

// ordemDasCamadas define a ordem dos grupos de chips na Busca.
var ordemDasCamadas = map[string]int{"genero": 0, "demografia": 1, "tag_tematica": 2}

// montarRotulosPublicos agrupa a taxonomia por nome de exibição e conta quantos
// animes curados têm o rótulo entre as tags principais (as mesmas que a Busca usa).
// Rótulo da camada "ignorado" fica de fora: ele não entra em gráfico nem em filtro.
func montarRotulosPublicos(entradas []entradaTaxonomia, curados map[int]models.CuratedAnime) []rotuloPublico {
	idx := montarIndice(entradas)

	porNome := make(map[string]*rotuloPublico)
	for _, e := range entradas {
		nome := strings.TrimSpace(e.DisplayNamePt)
		if nome == "" || e.Tier == "ignorado" {
			continue
		}
		chave := strings.ToLower(nome)
		if _, existe := porNome[chave]; !existe {
			porNome[chave] = &rotuloPublico{Nome: nome, Camada: e.Tier}
		}
	}

	for _, c := range curados {
		tags := c.CustomTags
		if len(tags) > maxTagsFiltro {
			tags = tags[:maxTagsFiltro]
		}
		contado := make(map[string]bool, len(tags))
		for _, tag := range tags {
			chave := strings.ToLower(idx.canonico(tag))
			if chave == "" || contado[chave] {
				continue
			}
			if r, ok := porNome[chave]; ok {
				r.Curados++
				contado[chave] = true
			}
		}
	}

	lista := make([]rotuloPublico, 0, len(porNome))
	for _, r := range porNome {
		lista = append(lista, *r)
	}
	sort.Slice(lista, func(i, j int) bool {
		ci, cj := ordemDasCamadas[lista[i].Camada], ordemDasCamadas[lista[j].Camada]
		if ci != cj {
			return ci < cj
		}
		if lista[i].Curados != lista[j].Curados {
			return lista[i].Curados > lista[j].Curados
		}
		return lista[i].Nome < lista[j].Nome
	})
	return lista
}

// obterVocabularioAniList devolve gêneros e tags da AniList, guardados por 24 horas.
func obterVocabularioAniList(ctx context.Context, svc anilist.Service) (*vocabularioAni, error) {
	vocabMutex.RLock()
	if vocabCache != nil && time.Now().Before(vocabExpiraEm) {
		defer vocabMutex.RUnlock()
		return vocabCache, nil
	}
	vocabMutex.RUnlock()

	v, err := svc.GetVocabulario(ctx)
	if err != nil {
		return nil, err
	}

	vocab := &vocabularioAni{
		Generos: make(map[string]bool, len(v.Generos)),
		Tags:    make(map[string]bool, len(v.Tags)),
	}
	for _, g := range v.Generos {
		vocab.Generos[g] = true
	}
	for _, t := range v.Tags {
		vocab.Tags[t] = true
	}

	vocabMutex.Lock()
	vocabCache = vocab
	vocabExpiraEm = time.Now().Add(vocabValidadePor)
	vocabMutex.Unlock()

	return vocab, nil
}

type TaxonomiaHandler struct{}

// HandleListarRotulos devolve os rótulos da taxonomia para os chips da Busca.
//
// Rota pública: a Busca funciona sem login. Rótulo cadastrado no Painel aparece
// aqui na próxima leitura, sem deploy.
func (h *TaxonomiaHandler) HandleListarRotulos(w http.ResponseWriter, r *http.Request) {
	tax := taxonomiaAtual()
	if len(tax.entradas) == 0 {
		http.Error(w, "Rótulos indisponíveis no momento.", http.StatusServiceUnavailable)
		return
	}

	rotulos := montarRotulosPublicos(tax.entradas, CarregarCuradoria(database.Client))

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(rotulos); err != nil {
		log.Printf("[ERRO] HandleListarRotulos: falha ao serializar resposta: %v", err)
	}
}
