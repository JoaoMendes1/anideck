package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/supabase-community/supabase-go"
)

// Usado quando app_settings não responde: melhor um scan com valor padrão do que
// um scan que não acontece.
const limitePadraoSugestoes = 10

// lerLimiteSugestoes busca quantos candidatos o scan grava por execução.
//
// Menos que isso deixa a aba vazia; mais vira lista que ninguém revisa — e o
// ponto de equilíbrio muda conforme o catálogo cresce, por isso está no banco.
func lerLimiteSugestoes(dbClient *supabase.Client) int {
	data, _, err := dbClient.From("app_settings").
		Select("value", "exact", false).
		Eq("key", "olheiro_limite_sugestoes").
		Execute()
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao ler o limite, usando %d: %v", limitePadraoSugestoes, err)
		return limitePadraoSugestoes
	}

	var linhas []struct {
		Value string `json:"value"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil || len(linhas) == 0 {
		return limitePadraoSugestoes
	}

	// O valor é TEXT no banco. Lixo digitado ali não pode zerar o scan.
	limite, err := strconv.Atoi(strings.TrimSpace(linhas[0].Value))
	if err != nil || limite <= 0 {
		log.Printf("[OLHEIRO] Limite inválido (%q), usando %d", linhas[0].Value, limitePadraoSugestoes)
		return limitePadraoSugestoes
	}

	return limite
}

// Os pesos vêm de olheiro_tags (sql/035); antes eram literais aqui, e mudar um
// exigia deploy. O Rotulo não é guardado lá: é o display_name_pt da
// genre_taxonomy, lido por JOIN, para o nome do rótulo ter um lugar só.
type TagDesejada struct {
	Peso   float64
	Rotulo string
}

// PerfilOlheiro é o retrato do gosto do usuário no momento do scan.
// Fica separado da requisição HTTP de propósito: é o que a função de
// pontuação recebe, e o que permite testá-la sem banco e sem rede.
type PerfilOlheiro struct {
	// Rótulos de maior afinidade, do mais assistido para o menos.
	GenerosFavoritos []string
	// Nota média que o usuário costuma dar. Serve de régua para não
	// sugerir obra muito abaixo do padrão dele.
	NotaMedia float64
}

// Candidato é um anime vindo da AniList que ainda não está no catálogo curado.
type Candidato struct {
	MalID      int
	Titulo     string
	ImagemURL  string
	Generos    []string
	Nota       float64
	Popularity int
}

// Sugestao é o resultado da pontuação, pronto para virar linha no banco.
type Sugestao struct {
	MalID     int     `json:"mal_id"`
	Titulo    string  `json:"titulo"`
	ImagemURL string  `json:"imagem_url"`
	Motivo    string  `json:"motivo"`
	Score     float64 `json:"score"`
}

// SugestaoPendente é o que a aba do Admin recebe para montar cada card.
type SugestaoPendente struct {
	ID        int64   `json:"id"`
	MalID     int     `json:"mal_id"`
	Titulo    string  `json:"titulo"`
	ImagemURL string  `json:"imagem_url"`
	Motivo    string  `json:"motivo"`
	Score     float64 `json:"score"`
}

// Função pura: sem banco, sem rede, sem relógio. Os pesos entram por parâmetro
// justamente para ela continuar assim depois que passaram a vir do banco.
func PontuarCandidato(c Candidato, p PerfilOlheiro, pesos map[string]TagDesejada) (score float64, motivo string) {
	var rotulos []string
	contados := make(map[string]bool)

	// O buscarCandidatos entrega Genres e Tags na mesma lista, e o admin pode
	// cadastrar peso em qualquer rótulo da taxonomia — inclusive num que seja
	// gênero e tag ao mesmo tempo. Sem esta guarda, ele contaria peso dobrado.
	for _, g := range c.Generos {
		if tag, existe := pesos[g]; existe && !contados[g] {
			contados[g] = true
			score += tag.Peso
			rotulos = append(rotulos, strings.ToLower(tag.Rotulo))
		}
	}

	if len(rotulos) == 0 {
		return 0, ""
	}

	return score, "Tem " + strings.Join(rotulos, ", ")
}

// OlheiroHandler concentra o scan e a revisão da fila. Todas as rotas rodam
// autenticadas como admin — não existe caminho de cron, e por isso nenhuma
// função no banco precisa contornar a RLS (ver sql/011).
type OlheiroHandler struct {
	AniListClient anilist.Service
}

// ---------------------------------------------------------------------------
// Vocabulário da AniList
// ---------------------------------------------------------------------------

// vocabularioAni guarda gênero e tag SEPARADOS, porque a AniList filtra por
// genre_in e tag_in — e mandar um gênero em tag_in devolve lista vazia sem erro
// nenhum. Foi o que fez o scan parar de achar qualquer coisa quando a tela
// passou a aceitar gêneros.
type vocabularioAni struct {
	Generos map[string]bool
	Tags    map[string]bool
}

func (v *vocabularioAni) conhece(nome string) bool {
	return v.Generos[nome] || v.Tags[nome]
}

// O vocabulário muda raramente — tag nova é evento de semanas. Guardar em
// memória evita uma chamada à API a cada vez que a tela abre.
var (
	vocabMutex    sync.RWMutex
	vocabCache    *vocabularioAni
	vocabExpiraEm time.Time
)

const vocabValidadePor = 24 * time.Hour

func (h *OlheiroHandler) vocabularioAniList(ctx context.Context) (*vocabularioAni, error) {
	vocabMutex.RLock()
	if vocabCache != nil && time.Now().Before(vocabExpiraEm) {
		defer vocabMutex.RUnlock()
		return vocabCache, nil
	}
	vocabMutex.RUnlock()

	v, err := h.AniListClient.GetVocabulario(ctx)
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

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

// HandleScan busca candidatos na AniList, pontua e grava os melhores na fila.
//
// Disparado pelo botão "Buscar sugestões" no Painel Admin. Roda com o JWT do
// admin, então a policy do sql/009 autoriza a escrita — sem RPC, sem
// SECURITY DEFINER, sem chave secreta compartilhada.
func (h *OlheiroHandler) HandleScan(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()

	perfil, err := carregarPerfilOlheiro(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao carregar perfil: %v", err)
		http.Error(w, "Erro ao carregar perfil de gosto", http.StatusInternalServerError)
		return
	}

	pesos, err := carregarTagsDesejadas(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao carregar pesos: %v", err)
		http.Error(w, "Erro ao carregar a configuração do Olheiro", http.StatusInternalServerError)
		return
	}
	if len(pesos) == 0 {
		// Tabela vazia não derruba o scan: ele roda, não pontua ninguém e diz o
		// porquê no log. Silêncio aqui viraria "o Olheiro parou de achar coisa".
		log.Printf("[OLHEIRO] Nenhum rótulo ativo em olheiro_tags: o scan não vai pontuar ninguém")
	}

	// O que já foi curado ou julgado é lido ANTES da busca: ele agora serve de
	// filtro dentro do laço de páginas, e é o que faz a busca continuar descendo
	// até achar coisa nova.
	jaConhecidos, err := malIDsJaConhecidos(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao ler o que já é conhecido: %v", err)
		http.Error(w, "Erro ao consultar o catálogo", http.StatusInternalServerError)
		return
	}

	vocab, err := h.vocabularioAniList(ctx)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao buscar o vocabulário: %v", err)
		http.Error(w, "Serviço da AniList indisponível no momento", http.StatusServiceUnavailable)
		return
	}

	limite := lerLimiteSugestoes(dbClient)

	candidatos, err := h.buscarCandidatos(ctx, pesos, vocab, jaConhecidos, limite)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao buscar candidatos: %v", err)
		http.Error(w, "Serviço da AniList indisponível no momento", http.StatusServiceUnavailable)
		return
	}

	var sugestoes []Sugestao

	for _, c := range candidatos {
		score, motivo := PontuarCandidato(c, perfil, pesos)
		if score <= 0 || motivo == "" {
			continue
		}

		sugestoes = append(sugestoes, Sugestao{
			MalID:     c.MalID,
			Titulo:    c.Titulo,
			ImagemURL: c.ImagemURL,
			Motivo:    motivo,
			Score:     score,
		})
	}

	// Melhores primeiro, corta no limite.
	sort.Slice(sugestoes, func(i, j int) bool {
		return sugestoes[i].Score > sugestoes[j].Score
	})
	if len(sugestoes) > limite {
		sugestoes = sugestoes[:limite]
	}

	if len(sugestoes) > 0 {
		// O UNIQUE(mal_id) do sql/009 garante a idempotência: rodar o scan duas
		// vezes não duplica nem ressuscita dispensado. O upsert faz o Postgres
		// ignorar o conflito em vez de devolver erro.
		_, _, err := dbClient.From("curation_suggestions").
			Insert(sugestoes, true, "mal_id", "minimal", "exact").
			Execute()
		if err != nil {
			log.Printf("[OLHEIRO] Falha ao gravar sugestões: %v", err)
			http.Error(w, "Erro ao gravar sugestões", http.StatusInternalServerError)
			return
		}
	}

	log.Printf("[OLHEIRO] Scan concluído: %d candidatos, %d pontuados",
		len(candidatos), len(sugestoes))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"candidatos": len(candidatos),
		"pontuados":  len(sugestoes),
	})
}

// buscarCandidatos consulta a AniList por rótulo, descendo páginas até juntar
// candidatos novos o bastante.
//
// Duas correções em relação à versão anterior:
//
//   - gênero vai em genre_in e tag vai em tag_in. Mandar "Adventure" como tag
//     devolvia lista vazia, sem erro — o scan parecia rodar e não trazia nada.
//   - o que já foi curado ou julgado é descartado DENTRO do laço, e a busca
//     avança de página até achar coisa nova. Antes só a primeira página era
//     lida, então, com o topo do ranking já curado, o resultado era zero.
func (h *OlheiroHandler) buscarCandidatos(
	ctx context.Context,
	pesos map[string]TagDesejada,
	vocab *vocabularioAni,
	jaConhecidos map[int]bool,
	alvoPorRotulo int,
) ([]Candidato, error) {
	const (
		porPagina  = 50 // teto da AniList por requisição
		maxPaginas = 4  // 4 páginas × 2s de espera por rótulo é o limite do razoável
	)

	vistos := make(map[int]bool)
	var candidatos []Candidato

	coletar := func(res *anilist.AnimeSearchResponse) int {
		if res == nil {
			return 0
		}
		novos := 0
		for _, a := range res.Data {
			if a.MalID <= 0 || vistos[a.MalID] || jaConhecidos[a.MalID] {
				continue
			}
			vistos[a.MalID] = true
			novos++

			// Gêneros e tags entram na mesma lista: para a pontuação, ambos são
			// apenas rótulos que podem ou não bater com o gosto declarado.
			generos := make([]string, 0, len(a.Genres)+len(a.Tags))
			for _, g := range a.Genres {
				generos = append(generos, g.Name)
			}
			generos = append(generos, a.Tags...)

			candidatos = append(candidatos, Candidato{
				MalID:      a.MalID,
				Titulo:     a.Title,
				ImagemURL:  a.Images.JPG.ImageURL,
				Generos:    generos,
				Nota:       a.Score,
				Popularity: a.Popularity,
			})
		}
		return novos
	}

	sucessos := 0

	for rotulo := range pesos {
		filtros := anilist.SearchFilters{Sort: "SCORE_DESC"}
		switch {
		case vocab.Generos[rotulo]:
			filtros.Genres = []string{rotulo}
		case vocab.Tags[rotulo]:
			filtros.Tags = []string{rotulo}
		default:
			log.Printf("[OLHEIRO] %q não é gênero nem tag na AniList: pulando", rotulo)
			continue
		}

		novosDoRotulo := 0

		for pagina := 1; pagina <= maxPaginas && novosDoRotulo < alvoPorRotulo; pagina++ {
			res, err := h.AniListClient.GetTopAnime(ctx, pagina, porPagina, filtros)
			if err != nil {
				// Um rótulo que falha não derruba o scan inteiro.
				log.Printf("[OLHEIRO] Busca por %q (página %d) falhou: %v", rotulo, pagina, err)
				break
			}
			sucessos++

			if res == nil || len(res.Data) == 0 {
				break // acabaram os resultados deste rótulo
			}

			novosDoRotulo += coletar(res)
			time.Sleep(2 * time.Second) // limite de 30 req/min da AniList
		}

		log.Printf("[OLHEIRO] %q: %d candidatos novos", rotulo, novosDoRotulo)
	}

	if sucessos == 0 {
		return nil, fmt.Errorf("nenhuma busca na AniList teve sucesso")
	}

	return candidatos, nil
}

// malIDsJaConhecidos junta o catálogo curado com tudo que já passou pela fila.
// O UNIQUE em curation_suggestions já impediria a duplicata, mas filtrar aqui
// evita gastar pontuação com quem seria descartado de qualquer forma.
func malIDsJaConhecidos(dbClient *supabase.Client) (map[int]bool, error) {
	conhecidos := make(map[int]bool)

	for _, tabela := range []string{"curated_animes", "curation_suggestions"} {
		data, _, err := dbClient.From(tabela).
			Select("mal_id", "exact", false).
			Execute()
		if err != nil {
			return nil, fmt.Errorf("tabela %s: %w", tabela, err)
		}

		var linhas []struct {
			MalID int `json:"mal_id"`
		}
		if err := json.Unmarshal(data, &linhas); err != nil {
			return nil, fmt.Errorf("tabela %s: payload inesperado: %w", tabela, err)
		}
		for _, l := range linhas {
			conhecidos[l.MalID] = true
		}
	}

	return conhecidos, nil
}

// carregarPerfilOlheiro lê a view de afinidade que já alimenta as Estatísticas.
// Como o scan roda com o JWT do admin, o auth.uid() dentro da view resolve
// sozinho — não precisa de função parametrizada nem de RPC.
//
// Tags temáticas ficam de fora pelo mesmo motivo documentado no DECISIONS.md
// para o Perfil Especialista/Explorador: aparecem em quase todo anime e não
// discriminam gosto.
func carregarPerfilOlheiro(dbClient *supabase.Client) (PerfilOlheiro, error) {
	data, _, err := dbClient.From("view_user_genre_affinity").
		Select("genre,tier,total_watched,media_nota_genero", "exact", false).
		Order("total_watched", &postgrest.OrderOpts{Ascending: false}).
		Execute()
	if err != nil {
		return PerfilOlheiro{}, err
	}

	var linhas []struct {
		Genre           string  `json:"genre"`
		Tier            string  `json:"tier"`
		TotalWatched    int     `json:"total_watched"`
		MediaNotaGenero float64 `json:"media_nota_genero"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return PerfilOlheiro{}, fmt.Errorf("payload inesperado: %w", err)
	}

	perfil := PerfilOlheiro{}
	var soma float64
	var contados int

	for _, l := range linhas {
		if l.Tier == "tag_tematica" || strings.TrimSpace(l.Genre) == "" {
			continue
		}
		if len(perfil.GenerosFavoritos) < 5 {
			perfil.GenerosFavoritos = append(perfil.GenerosFavoritos, l.Genre)
		}
		if l.MediaNotaGenero > 0 {
			soma += l.MediaNotaGenero
			contados++
		}
	}

	if contados > 0 {
		perfil.NotaMedia = soma / float64(contados)
	}

	return perfil, nil
}

// carregarTagsDesejadas lê os pesos do Olheiro e o nome de exibição de cada um.
//
// O nome vem da genre_taxonomy pelo relacionamento da chave estrangeira — é o
// mesmo dado que a tela mostra, sem segunda cópia. Só rótulo ativo entra.
func carregarTagsDesejadas(dbClient *supabase.Client) (map[string]TagDesejada, error) {
	data, _, err := dbClient.From("olheiro_tags").
		Select("raw_name,peso,genre_taxonomy(display_name_pt)", "exact", false).
		Eq("ativo", "true").
		Execute()
	if err != nil {
		return nil, err
	}

	var linhas []struct {
		RawName string  `json:"raw_name"`
		Peso    float64 `json:"peso"`
		Rotulo  struct {
			DisplayNamePT string `json:"display_name_pt"`
		} `json:"genre_taxonomy"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return nil, fmt.Errorf("payload inesperado: %w", err)
	}

	pesos := make(map[string]TagDesejada, len(linhas))
	for _, l := range linhas {
		rotulo := l.Rotulo.DisplayNamePT
		if rotulo == "" {
			// Não deveria acontecer: a FK garante a linha na taxonomia. Se
			// acontecer, o raw_name em inglês é melhor que texto vazio.
			rotulo = l.RawName
		}
		pesos[l.RawName] = TagDesejada{Peso: l.Peso, Rotulo: rotulo}
	}

	return pesos, nil
}

// ---------------------------------------------------------------------------
// Configuração do Olheiro (tela do Painel de Controle)
// ---------------------------------------------------------------------------

// HandleListarTagsDesejadas devolve os pesos para a tela de configuração.
//
// Inclui os inativos de propósito: o scan os ignora, mas quem administra precisa
// vê-los para reativar. Ordenado por peso, que é a leitura natural — "o que mais
// pesa no meu gosto".
func (h *OlheiroHandler) HandleListarTagsDesejadas(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("olheiro_tags").
		Select("raw_name,peso,ativo,genre_taxonomy(display_name_pt,tier)", "exact", false).
		Order("peso", &postgrest.OrderOpts{Ascending: false}).
		Order("raw_name", &postgrest.OrderOpts{Ascending: true}).
		Execute()
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao listar pesos: %v", err)
		http.Error(w, "Não foi possível ler a configuração do Olheiro.", http.StatusInternalServerError)
		return
	}

	var linhas []struct {
		RawName string  `json:"raw_name"`
		Peso    float64 `json:"peso"`
		Ativo   bool    `json:"ativo"`
		Rotulo  struct {
			DisplayNamePT string `json:"display_name_pt"`
			Tier          string `json:"tier"`
		} `json:"genre_taxonomy"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[OLHEIRO] olheiro_tags: payload inesperado: %v", err)
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	// A resposta é achatada: a tela não precisa saber que o nome veio de outra
	// tabela, e aninhar obrigaria o front a conhecer a forma do JOIN.
	type tagResposta struct {
		RawName string  `json:"raw_name"`
		Rotulo  string  `json:"rotulo"`
		Camada  string  `json:"camada"`
		Peso    float64 `json:"peso"`
		Ativo   bool    `json:"ativo"`
	}

	resposta := make([]tagResposta, 0, len(linhas))
	for _, l := range linhas {
		rotulo := l.Rotulo.DisplayNamePT
		if rotulo == "" {
			rotulo = l.RawName
		}
		resposta = append(resposta, tagResposta{
			RawName: l.RawName,
			Rotulo:  rotulo,
			Camada:  l.Rotulo.Tier,
			Peso:    l.Peso,
			Ativo:   l.Ativo,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resposta); err != nil {
		log.Printf("[OLHEIRO] Falha ao serializar pesos: %v", err)
	}
}

// HandleSalvarTagDesejada cria ou atualiza o peso de um rótulo.
//
// Upsert em vez de POST/PUT separados: a tela edita e cria pelo mesmo formulário,
// e "já existe" não é erro aqui — é o caso de quem reativou um rótulo removido.
func (h *OlheiroHandler) HandleSalvarTagDesejada(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req struct {
		RawName string   `json:"raw_name"`
		Peso    *float64 `json:"peso"`
		Ativo   *bool    `json:"ativo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	req.RawName = strings.TrimSpace(req.RawName)
	if req.RawName == "" {
		http.Error(w, "Informe o rótulo.", http.StatusBadRequest)
		return
	}

	// Ponteiro e não float64: com valor puro, peso ausente no JSON viraria 0 e o
	// CHECK do banco recusaria com erro cru (item 16 do PITFALLS.md).
	if req.Peso == nil {
		http.Error(w, "Informe o peso.", http.StatusBadRequest)
		return
	}
	if *req.Peso <= 0 {
		http.Error(w, "O peso precisa ser maior que zero.", http.StatusBadRequest)
		return
	}

	ativo := true
	if req.Ativo != nil {
		ativo = *req.Ativo
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	linha := map[string]interface{}{
		"raw_name": req.RawName,
		"peso":     *req.Peso,
		"ativo":    ativo,
	}

	if _, _, err := dbClient.From("olheiro_tags").
		Upsert(linha, "raw_name", "representation", "exact").
		Execute(); err != nil {
		log.Printf("[OLHEIRO] Falha ao salvar peso de %q: %v", req.RawName, err)

		// O rótulo não existe na taxonomia. A tela só oferece os cadastrados, então
		// isso só acontece por requisição direta ou por remoção concorrente.
		if violaChaveEstrangeira(err) {
			http.Error(w, "Este rótulo não está cadastrado na taxonomia. Cadastre-o na aba Rótulos primeiro.", http.StatusConflict)
			return
		}

		http.Error(w, "Não foi possível salvar o peso.", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleRemoverTagDesejada tira o rótulo do gosto declarado.
//
// Remove a linha em vez de desativar: desativado já existe como estado, e manter
// as duas coisas deixaria a lista cheia de rótulo que ninguém quer mais ver.
func (h *OlheiroHandler) HandleRemoverTagDesejada(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	rawName := strings.TrimSpace(chi.URLParam(r, "rawName"))
	if rawName == "" {
		http.Error(w, "Informe o rótulo.", http.StatusBadRequest)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	if _, _, err := dbClient.From("olheiro_tags").
		Delete("", "exact").
		Eq("raw_name", rawName).
		Execute(); err != nil {
		log.Printf("[OLHEIRO] Falha ao remover peso de %q: %v", rawName, err)
		http.Error(w, "Não foi possível remover o rótulo.", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetOlheiroSettings devolve os ajustes do scan.
//
// Um objeto, e não um número solto, para o próximo ajuste não exigir endpoint novo.
func (h *OlheiroHandler) HandleGetOlheiroSettings(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{
		"limite_sugestoes": lerLimiteSugestoes(dbClient),
		"limite_padrao":    limitePadraoSugestoes,
	})
}

// HandleUpdateOlheiroSettings salva o limite de sugestões por scan.
func (h *OlheiroHandler) HandleUpdateOlheiroSettings(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	var req struct {
		LimiteSugestoes *int `json:"limite_sugestoes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	// Ponteiro pelo mesmo motivo do peso: campo ausente viraria 0 e zeraria a fila
	// sem ninguém pedir (item 16 do PITFALLS.md).
	if req.LimiteSugestoes == nil || *req.LimiteSugestoes <= 0 {
		http.Error(w, "Informe um limite maior que zero.", http.StatusBadRequest)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	// app_settings guarda TEXT; a conversão de volta é do lerLimiteSugestoes.
	if _, _, err := dbClient.From("app_settings").
		Update(map[string]string{"value": strconv.Itoa(*req.LimiteSugestoes)}, "representation", "exact").
		Eq("key", "olheiro_limite_sugestoes").
		Execute(); err != nil {
		log.Printf("[OLHEIRO] Falha ao salvar o limite: %v", err)
		http.Error(w, "Não foi possível salvar o limite.", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleListarRotulosDisponiveis devolve o que pode virar peso do Olheiro.
//
// O cruzamento é feito aqui, e não na tela, porque depende de três fontes: a
// taxonomia, o que já tem peso e o vocabulário da AniList. A tela só desenha.
func (h *OlheiroHandler) HandleListarRotulosDisponiveis(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	vocab, err := h.vocabularioAniList(r.Context())
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao buscar o vocabulário da AniList: %v", err)
		http.Error(w, "A AniList não respondeu. Tente de novo em instantes.", http.StatusServiceUnavailable)
		return
	}

	data, _, err := dbClient.From("genre_taxonomy").
		Select("raw_name,display_name_pt,tier", "exact", false).
		Neq("tier", "ignorado").
		Order("display_name_pt", &postgrest.OrderOpts{Ascending: true}).
		Execute()
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao ler a taxonomia: %v", err)
		http.Error(w, "Não foi possível ler a taxonomia.", http.StatusInternalServerError)
		return
	}

	var linhas []struct {
		RawName       string `json:"raw_name"`
		DisplayNamePT string `json:"display_name_pt"`
		Tier          string `json:"tier"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	jaTemPeso, err := carregarTagsDesejadas(dbClient)
	if err != nil {
		log.Printf("[OLHEIRO] Falha ao ler os pesos: %v", err)
		http.Error(w, "Não foi possível ler a configuração do Olheiro.", http.StatusInternalServerError)
		return
	}

	type disponivel struct {
		RawName string `json:"raw_name"`
		Rotulo  string `json:"rotulo"`
		Camada  string `json:"camada"`
	}

	resposta := make([]disponivel, 0, len(linhas))
	for _, l := range linhas {
		if !vocab.conhece(l.RawName) {
			continue // texto em português: a AniList não o reconhece
		}
		if _, existe := jaTemPeso[l.RawName]; existe {
			continue
		}
		resposta = append(resposta, disponivel{
			RawName: l.RawName,
			Rotulo:  l.DisplayNamePT,
			Camada:  l.Tier,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resposta)
}

// ---------------------------------------------------------------------------
// Fila de sugestões
// ---------------------------------------------------------------------------

// DemandaCuradoria é um anime que existe no deck de alguém e não no catálogo.
type DemandaCuradoria struct {
	MalID         int      `json:"mal_id"`
	Titulo        string   `json:"titulo"`
	TotalUsuarios int      `json:"total_usuarios"`
	TemAdmin      bool     `json:"tem_admin"`
	Usuarios      []string `json:"usuarios"`
	UltimoAdd     string   `json:"ultimo_add"`
}

// HandleListarDemanda devolve o que os usuários já adicionaram e ninguém curou.
//
// Não tem scan nem fila: a RPC lê media_entries na hora. O que entra aqui não
// passa por PontuarCandidato — demanda de gente real não precisa combinar com o
// gosto declarado para valer curadoria.
func (h *OlheiroHandler) HandleListarDemanda(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	// A RPC é SECURITY DEFINER para atravessar a RLS da media_entries, e o
	// is_admin() dentro dela é o que fecha a porta: conta comum recebe [].
	bruto := dbClient.Rpc("listar_demanda_curadoria", "", nil)

	var linhas []DemandaCuradoria
	if err := json.Unmarshal([]byte(bruto), &linhas); err != nil {
		log.Printf("[OLHEIRO] listar_demanda_curadoria: payload inesperado: %s", bruto)
		http.Error(w, "Não foi possível ler a demanda.", http.StatusInternalServerError)
		return
	}

	for i := range linhas {
		if strings.TrimSpace(linhas[i].Titulo) == "" {
			// Anime sem ficha no cache: o mal_id é o que temos, e é o bastante
			// para abrir no editor de curadoria.
			linhas[i].Titulo = fmt.Sprintf("mal_id %d", linhas[i].MalID)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(linhas)
}

// HandleListarSugestoes devolve a fila pendente, melhor pontuada primeiro.
func (h *OlheiroHandler) HandleListarSugestoes(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("curation_suggestions").
		Select("id,mal_id,titulo,imagem_url,motivo,score", "exact", false).
		Eq("status", "pendente").
		Order("score", &postgrest.OrderOpts{Ascending: false}).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarSugestoes: %v", err)
		http.Error(w, "Erro ao listar sugestões", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// HandleRevisarSugestao marca uma sugestão como curada ou dispensada.
//
// Os dois casos viraram um endpoint só porque a operação é idêntica — muda
// apenas o valor gravado. O CHECK do sql/009 rejeita qualquer outro status,
// mas a validação aqui devolve 400 em vez de deixar o banco dar 500.
func (h *OlheiroHandler) HandleRevisarSugestao(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autorizado", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID ausente", http.StatusBadRequest)
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Corpo inválido", http.StatusBadRequest)
		return
	}
	if body.Status != "curado" && body.Status != "dispensado" {
		http.Error(w, "Status deve ser 'curado' ou 'dispensado'", http.StatusBadRequest)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	_, _, err = dbClient.From("curation_suggestions").
		Update(map[string]interface{}{
			"status":      body.Status,
			"reviewed_at": time.Now().UTC().Format(time.RFC3339),
		}, "minimal", "exact").
		Eq("id", id).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleRevisarSugestao (id=%s): %v", id, err)
		http.Error(w, "Erro ao atualizar sugestão", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}