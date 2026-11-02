package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/ia"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// Fila de curadoria assistida (sql/038). O worker (cmd/worker) processa; o Painel
// enfileira, revisa e aplica. Os dois conversam só pela tabela ai_curation_queue.

const (
	tipoSinopseTags = "sinopse_tags"
	tipoEpisodios   = "episodios"

	modoRevisao    = "revisao"
	modoAutomatico = "automatico"

	maxEnfileirarPorVez = 50
)

// itemFila é uma linha de ai_curation_queue.
type itemFila struct {
	ID         string          `json:"id"`
	MalID      int             `json:"mal_id"`
	Tipo       string          `json:"tipo"`
	Status     string          `json:"status"`
	Resultado  json.RawMessage `json:"resultado"`
	Tentativas int             `json:"tentativas"`
}

// configFila é lida de app_settings a cada ciclo, para o Painel mudar sem reiniciar o worker.
type configFila struct {
	Modo             string `json:"modo"`
	Lote             int    `json:"lote"`
	Intervalo        int    `json:"intervalo"`
	EpisodiosPorLote int    `json:"episodios_por_lote"`
	PromptPesquisa   string `json:"prompt_pesquisa"`
	PromptEstruturar string `json:"prompt_estruturar"`
}

var configFilaPadrao = configFila{
	Modo: modoRevisao, Lote: 5, Intervalo: 60, EpisodiosPorLote: 12,
	PromptPesquisa: ia.PromptPesquisaEpisodiosPadrao, PromptEstruturar: ia.PromptEstruturarEpisodiosPadrao,
}

const maxPromptFila = 4000

// resultadoSinopseTags é o que o worker grava para revisão de sinopse e tags.
type resultadoSinopseTags struct {
	Sinopse         string   `json:"sinopse"`
	Tags            []string `json:"tags"`
	TagsDescartadas []string `json:"tags_descartadas"`
}

// resultadoEpisodios guarda a pesquisa estruturada e, sempre, o texto bruto da busca:
// se a estruturação falhar, a busca (que é cobrada) não se perde.
type resultadoEpisodios struct {
	Pesquisa   *ia.Episodios `json:"pesquisa,omitempty"`
	Fontes     []ia.Fonte    `json:"fontes"`
	TextoBruto string        `json:"texto_bruto"`
	De         int           `json:"de"`
	Ate        int           `json:"ate"`
}

// ---------------------------------------------------------------------------
// Regras puras (testadas)
// ---------------------------------------------------------------------------

// validarConfigFila confere os valores vindos do Painel.
func validarConfigFila(c configFila) string {
	if c.Modo != modoRevisao && c.Modo != modoAutomatico {
		return "Modo precisa ser revisao ou automatico."
	}
	if c.Lote < 1 || c.Lote > 20 {
		return "O lote vai de 1 a 20 animes por ciclo."
	}
	if c.Intervalo < 15 || c.Intervalo > 3600 {
		return "O intervalo vai de 15 a 3600 segundos."
	}
	if c.EpisodiosPorLote < 1 || c.EpisodiosPorLote > 24 {
		return "Os episódios por pesquisa vão de 1 a 24."
	}
	if !strings.Contains(c.PromptPesquisa, "{titulo}") {
		return "O prompt de pesquisa precisa do marcador {titulo}: sem ele a IA não sabe qual anime pesquisar."
	}
	if strings.TrimSpace(c.PromptEstruturar) == "" {
		return "O prompt de estruturação não pode ficar vazio."
	}
	if len([]rune(c.PromptPesquisa)) > maxPromptFila || len([]rune(c.PromptEstruturar)) > maxPromptFila {
		return fmt.Sprintf("Cada prompt vai até %d caracteres.", maxPromptFila)
	}
	return ""
}

// filtrarTagsPelaTaxonomia deixa passar só rótulo cadastrado fora da camada "ignorado",
// já com o nome de exibição. O resto vai para o relatório: tag inventada pela IA viraria
// rótulo órfão, o que a view_unmapped_labels existe para caçar.
func filtrarTagsPelaTaxonomia(tags []string, entradas []entradaTaxonomia) (aceitas, descartadas []string) {
	idx := montarIndice(entradas)
	camada := make(map[string]string, len(entradas))
	for _, e := range entradas {
		chave := strings.ToLower(strings.TrimSpace(e.DisplayNamePt))
		if _, existe := camada[chave]; !existe {
			camada[chave] = e.Tier
		}
	}
	aceitas, descartadas = []string{}, []string{}
	vistas := map[string]bool{}
	for _, t := range tags {
		nome := idx.canonico(t)
		if nome == "" || camada[strings.ToLower(nome)] == "ignorado" {
			descartadas = append(descartadas, strings.TrimSpace(t))
			continue
		}
		if vistas[strings.ToLower(nome)] {
			continue
		}
		vistas[strings.ToLower(nome)] = true
		aceitas = append(aceitas, nome)
	}
	return aceitas, descartadas
}

// faixaDeEpisodios escolhe os episódios da próxima pesquisa: a partir do primeiro sem
// título curado, no tamanho do lote.
func faixaDeEpisodios(atuais []episodioCurado, porLote int) (de, ate int) {
	comTitulo := map[int]bool{}
	for _, e := range atuais {
		if strings.TrimSpace(e.Title) != "" {
			comTitulo[e.Number] = true
		}
	}
	de = 1
	for comTitulo[de] {
		de++
	}
	return de, de + porLote - 1
}

// normalizarData aceita RFC 3339 e devolve em UTC. Data inválida volta vazia.
func normalizarData(texto string) string {
	t, err := time.Parse(time.RFC3339, strings.TrimSpace(texto))
	if err != nil {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

// mesclarEpisodios só preenche o que está vazio e nunca muda a numeração (Armadilha 9):
// o número é a chave do progresso já marcado. Valor curado diferente do pesquisado fica
// como está e vai para o relatório, para o admin decidir.
func mesclarEpisodios(atuais []episodioCurado, pesquisados []ia.EpisodioPesquisado) ([]episodioCurado, []string) {
	porNumero := make(map[int]*episodioCurado, len(atuais))
	resultado := make([]episodioCurado, len(atuais))
	copy(resultado, atuais)
	for i := range resultado {
		porNumero[resultado[i].Number] = &resultado[i]
	}

	var relatorio []string
	var novos []episodioCurado
	novoPorNumero := map[int]int{}
	for _, p := range pesquisados {
		if p.Numero < 1 {
			continue
		}
		titulo := strings.TrimSpace(p.Titulo)
		data := normalizarData(p.Data)
		if p.Data != "" && data == "" {
			relatorio = append(relatorio, fmt.Sprintf("Episódio %d: data %q fora do formato, ignorada.", p.Numero, p.Data))
		}

		atual, existe := porNumero[p.Numero]
		if !existe {
			if titulo == "" && data == "" {
				relatorio = append(relatorio, fmt.Sprintf("Episódio %d: sem título nem data na fonte.", p.Numero))
				continue
			}
			if i, repetido := novoPorNumero[p.Numero]; repetido {
				// Número repetido na pesquisa: só completa o que ficou vazio na primeira vez.
				if novos[i].Title == "" {
					novos[i].Title = titulo
				}
				if novos[i].AiredAt == "" {
					novos[i].AiredAt = data
				}
				continue
			}
			novoPorNumero[p.Numero] = len(novos)
			novos = append(novos, episodioCurado{Number: p.Numero, Title: titulo, AiredAt: data})
			continue
		}
		if titulo != "" {
			if atual.Title == "" {
				atual.Title = titulo
			} else if atual.Title != titulo {
				relatorio = append(relatorio, fmt.Sprintf("Episódio %d: título curado mantido; a fonte diz %q.", p.Numero, titulo))
			}
		}
		if data != "" {
			if atual.AiredAt == "" {
				atual.AiredAt = data
			} else if normalizarData(atual.AiredAt) != data {
				relatorio = append(relatorio, fmt.Sprintf("Episódio %d: data curada mantida; a fonte diz %s.", p.Numero, data))
			}
		}
	}

	resultado = append(resultado, novos...)
	sort.SliceStable(resultado, func(i, j int) bool { return resultado[i].Number < resultado[j].Number })
	return resultado, relatorio
}

// mesclarLinks preenche "onde assistir" só quando a curadoria ainda não tem links: link
// curado substitui a lista da AniList inteira (decisão de 27/08), então trocar o que já
// foi conferido à mão seria desfazer curadoria.
func mesclarLinks(atuais []linkCurado, pesquisados []ia.LinkPesquisado) ([]linkCurado, []string) {
	if len(atuais) > 0 {
		if len(pesquisados) > 0 {
			return atuais, []string{"Links curados mantidos; a pesquisa trouxe outros, ver as fontes."}
		}
		return atuais, nil
	}
	var resultado []linkCurado
	var relatorio []string
	for _, l := range pesquisados {
		if strings.TrimSpace(l.Plataforma) == "" || !urlSegura(l.URL) {
			relatorio = append(relatorio, fmt.Sprintf("Link %q recusado: precisa de plataforma e endereço http(s).", l.URL))
			continue
		}
		resultado = append(resultado, linkCurado{Platform: strings.TrimSpace(l.Plataforma), URL: strings.TrimSpace(l.URL)})
	}
	return resultado, relatorio
}

// lerEpisodiosCurados e lerLinksCurados tratam coluna nula como lista vazia.
func lerEpisodiosCurados(bruto json.RawMessage) []episodioCurado {
	var lista []episodioCurado
	if !jsonAusente(bruto) {
		_ = json.Unmarshal(bruto, &lista)
	}
	return lista
}

func lerLinksCurados(bruto json.RawMessage) []linkCurado {
	var lista []linkCurado
	if !jsonAusente(bruto) {
		_ = json.Unmarshal(bruto, &lista)
	}
	return lista
}

// camposParaAplicar monta o UPDATE de curated_animes a partir do resultado revisado.
// Para sinopse e tags, `campos` escolhe o que aplicar (vazio aplica os dois).
func camposParaAplicar(tipo string, resultado json.RawMessage, curado models.CuratedAnime, campos []string, entradas []entradaTaxonomia) (map[string]interface{}, []string, error) {
	mudancas := map[string]interface{}{}
	switch tipo {
	case tipoSinopseTags:
		var r resultadoSinopseTags
		if err := json.Unmarshal(resultado, &r); err != nil {
			return nil, nil, errors.New("resultado da IA em formato inesperado")
		}
		quer := func(campo string) bool {
			if len(campos) == 0 {
				return true
			}
			for _, c := range campos {
				if c == campo {
					return true
				}
			}
			return false
		}
		if quer("sinopse") && strings.TrimSpace(r.Sinopse) != "" {
			mudancas["custom_synopsis"] = strings.TrimSpace(r.Sinopse)
		}
		if quer("tags") {
			// Filtra de novo: a taxonomia pode ter mudado entre o processamento e a revisão.
			aceitas, _ := filtrarTagsPelaTaxonomia(r.Tags, entradas)
			if len(aceitas) > 0 {
				mudancas["custom_tags"] = aceitas
			}
		}
		return mudancas, nil, nil

	case tipoEpisodios:
		var r resultadoEpisodios
		if err := json.Unmarshal(resultado, &r); err != nil || r.Pesquisa == nil {
			return nil, nil, errors.New("pesquisa sem resultado estruturado para aplicar")
		}
		var relatorio []string
		episodios, rel := mesclarEpisodios(lerEpisodiosCurados(curado.CustomEpisodes), r.Pesquisa.Episodios)
		relatorio = append(relatorio, rel...)
		if len(episodios) > 0 {
			mudancas["custom_episodes"] = episodios
		}
		links, rel := mesclarLinks(lerLinksCurados(curado.CustomExternalLinks), r.Pesquisa.Links)
		relatorio = append(relatorio, rel...)
		if len(links) > 0 && len(lerLinksCurados(curado.CustomExternalLinks)) == 0 {
			mudancas["custom_external_links"] = links
		}
		if curado.CustomFirstAiredAt == nil || *curado.CustomFirstAiredAt == "" {
			if estreia := normalizarData(r.Pesquisa.Estreia); estreia != "" {
				mudancas["custom_first_aired_at"] = estreia
			}
		}
		return mudancas, relatorio, nil
	}
	return nil, nil, fmt.Errorf("tipo de trabalho desconhecido: %s", tipo)
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

func lerConfigFila(client *supabase.Client) configFila {
	cfg := configFilaPadrao
	data, _, err := client.From("app_settings").
		Select("key,value", "", false).
		In("key", []string{"ai_fila_modo", "ai_fila_lote", "ai_fila_intervalo", "ai_fila_episodios_por_lote",
			"ai_prompt_pesquisa_episodios", "ai_prompt_estruturar_episodios"}).
		Execute()
	if err != nil {
		log.Printf("[FILA IA] Configuração indisponível, usando o padrão: %v", err)
		return cfg
	}
	var linhas []struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	_ = json.Unmarshal(data, &linhas)
	lido := cfg
	for _, l := range linhas {
		n, _ := strconv.Atoi(strings.TrimSpace(l.Value))
		switch l.Key {
		case "ai_fila_modo":
			lido.Modo = strings.TrimSpace(l.Value)
		case "ai_fila_lote":
			lido.Lote = n
		case "ai_fila_intervalo":
			lido.Intervalo = n
		case "ai_fila_episodios_por_lote":
			lido.EpisodiosPorLote = n
		case "ai_prompt_pesquisa_episodios":
			// Vazio significa "use o padrão do código": o sql/038 cria a chave vazia.
			if strings.TrimSpace(l.Value) != "" {
				lido.PromptPesquisa = l.Value
			}
		case "ai_prompt_estruturar_episodios":
			if strings.TrimSpace(l.Value) != "" {
				lido.PromptEstruturar = l.Value
			}
		}
	}
	if problema := validarConfigFila(lido); problema != "" {
		log.Printf("[FILA IA] Configuração inválida (%s), usando o padrão", problema)
		return cfg
	}
	return lido
}

func lerPromptCuradoria(client *supabase.Client) string {
	data, _, err := client.From("app_settings").Select("value", "", false).Eq("key", "ai_curation_prompt").Execute()
	if err == nil {
		var linhas []struct {
			Value string `json:"value"`
		}
		if json.Unmarshal(data, &linhas) == nil && len(linhas) > 0 && strings.TrimSpace(linhas[0].Value) != "" {
			return linhas[0].Value
		}
	}
	return ia.PromptCuradoriaPadrao
}

func buscarCurado(client *supabase.Client, malID int) (models.CuratedAnime, error) {
	data, _, err := client.From("curated_animes").Select("*", "", false).Eq("mal_id", strconv.Itoa(malID)).Execute()
	if err != nil {
		return models.CuratedAnime{}, err
	}
	var linhas []models.CuratedAnime
	if err := json.Unmarshal(data, &linhas); err != nil {
		return models.CuratedAnime{}, err
	}
	if len(linhas) == 0 {
		return models.CuratedAnime{}, errors.New("o anime não está no catálogo curado")
	}
	return linhas[0], nil
}

func atualizarItem(client *supabase.Client, id string, campos map[string]interface{}) {
	if _, _, err := client.From("ai_curation_queue").Update(campos, "minimal", "").Eq("id", id).Execute(); err != nil {
		log.Printf("[FILA IA] Falha ao gravar o item %s: %v", id, err)
	}
}

func agoraUTC() string { return time.Now().UTC().Format(time.RFC3339) }

func marcarErro(client *supabase.Client, item itemFila, err error, resultado interface{}) {
	log.Printf("[FILA IA] mal_id=%d (%s): %v", item.MalID, item.Tipo, err)
	campos := map[string]interface{}{"status": "erro", "erro": err.Error(), "processed_at": agoraUTC()}
	if resultado != nil {
		campos["resultado"] = resultado
	}
	atualizarItem(client, item.ID, campos)
}

// devolverSeInterrompido trata a falha que veio do próprio worker sendo parado (deploy,
// SIGTERM): o item volta a pendente em vez de virar erro, porque o anime não tem culpa.
// A gravação não usa o ctx (o postgrest-go não recebe contexto), então funciona mesmo
// com ele cancelado.
func devolverSeInterrompido(ctx context.Context, client *supabase.Client, item itemFila) bool {
	if ctx.Err() == nil {
		return false
	}
	log.Printf("[FILA IA] mal_id=%d (%s) interrompido pelo encerramento do worker; volta para a fila", item.MalID, item.Tipo)
	atualizarItem(client, item.ID, map[string]interface{}{"status": "pendente", "pego_em": nil})
	return true
}

func processarSinopseTags(ctx context.Context, client *supabase.Client, item itemFila, cfg configFila) {
	curado, err := buscarCurado(client, item.MalID)
	if err != nil {
		marcarErro(client, item, err, nil)
		return
	}
	if strings.TrimSpace(curado.CustomSynopsis) == "" {
		marcarErro(client, item, errors.New("o anime não tem sinopse curada para reescrever"), nil)
		return
	}

	prompt := fmt.Sprintf("Título do anime: %s\nSinopse original técnica: %s", curado.CustomTitle, curado.CustomSynopsis)
	texto, err := ia.GerarCuradoria(ctx, lerPromptCuradoria(client), prompt)
	if err != nil {
		if devolverSeInterrompido(ctx, client, item) {
			return
		}
		marcarErro(client, item, err, nil)
		return
	}
	sugestao, err := ia.LerCuradoria(texto)
	if err != nil {
		marcarErro(client, item, err, nil)
		return
	}

	aceitas, descartadas := filtrarTagsPelaTaxonomia(sugestao.Tags, taxonomiaAtual().entradas)
	resultado := resultadoSinopseTags{Sinopse: sugestao.Sinopse, Tags: aceitas, TagsDescartadas: descartadas}
	relatorio := ""
	if len(descartadas) > 0 {
		relatorio = "Tags fora da taxonomia, descartadas: " + strings.Join(descartadas, ", ")
	}

	campos := map[string]interface{}{"resultado": resultado, "relatorio": relatorio, "erro": nil, "processed_at": agoraUTC(), "status": "pronto"}
	if cfg.Modo == modoAutomatico {
		mudancas := map[string]interface{}{"custom_synopsis": resultado.Sinopse}
		if len(aceitas) > 0 {
			mudancas["custom_tags"] = aceitas
		}
		if _, _, err := client.From("curated_animes").Update(mudancas, "minimal", "").Eq("mal_id", strconv.Itoa(item.MalID)).Execute(); err != nil {
			marcarErro(client, item, fmt.Errorf("falha ao aplicar no catálogo: %w", err), resultado)
			return
		}
		campos["status"] = "aplicado"
	}
	atualizarItem(client, item.ID, campos)
}

func processarEpisodios(ctx context.Context, client *supabase.Client, item itemFila, cfg configFila) {
	curado, err := buscarCurado(client, item.MalID)
	if err != nil {
		marcarErro(client, item, err, nil)
		return
	}
	de, ate := faixaDeEpisodios(lerEpisodiosCurados(curado.CustomEpisodes), cfg.EpisodiosPorLote)

	pergunta := ia.MontarPerguntaEpisodios(cfg.PromptPesquisa, curado.CustomTitle, item.MalID, de, ate)

	resp1, err := ia.Gerar(ctx, ia.ConfigPesquisa(), pergunta)
	if err != nil {
		if devolverSeInterrompido(ctx, client, item) {
			return
		}
		marcarErro(client, item, err, nil)
		return
	}
	resultado := resultadoEpisodios{Fontes: ia.FontesDaResposta(resp1), TextoBruto: resp1.Text(), De: de, Ate: ate}
	if strings.TrimSpace(resultado.TextoBruto) == "" {
		marcarErro(client, item, errors.New("a pesquisa voltou vazia"), nil)
		return
	}

	estruturar := cfg.PromptEstruturar + "\n\n" + resultado.TextoBruto
	resp2, err := ia.Gerar(ctx, ia.ConfigEstruturarEpisodios(), estruturar)
	if err != nil {
		if devolverSeInterrompido(ctx, client, item) {
			return
		}
		marcarErro(client, item, fmt.Errorf("a estruturação falhou; o texto da pesquisa ficou guardado: %w", err), resultado)
		return
	}
	pesquisa, err := ia.LerEpisodios(resp2.Text())
	if err != nil {
		marcarErro(client, item, fmt.Errorf("a estruturação falhou; o texto da pesquisa ficou guardado: %w", err), resultado)
		return
	}
	resultado.Pesquisa = &pesquisa

	// Episódio, data e link nunca entram sozinhos, em nenhum modo: data errada quebra o
	// Calendário e o progresso sem erro nenhum.
	atualizarItem(client, item.ID, map[string]interface{}{
		"resultado": resultado, "relatorio": strings.Join(pesquisa.Ressalvas, "\n"),
		"erro": nil, "processed_at": agoraUTC(), "status": "pronto",
	})
}

// RodarCicloFilaIA processa até um lote da fila e devolve quanto esperar até o próximo
// ciclo. Erro num anime não interrompe os outros: ele fica em "erro" com a mensagem.
func RodarCicloFilaIA(ctx context.Context) time.Duration {
	client, err := database.ServiceRoleClient()
	if err != nil {
		log.Printf("[FILA IA] Cliente indisponível: %v", err)
		return time.Duration(configFilaPadrao.Intervalo) * time.Second
	}
	cfg := lerConfigFila(client)

	for i := 0; i < cfg.Lote && ctx.Err() == nil; i++ {
		dados, err := callRPC("pegar_proximo_da_fila_ia", nil)
		if err != nil {
			log.Printf("[FILA IA] Falha ao pegar o próximo item: %v", err)
			break
		}
		var itens []itemFila
		if err := json.Unmarshal(dados, &itens); err != nil || len(itens) == 0 {
			break
		}
		item := itens[0]
		log.Printf("[FILA IA] Processando mal_id=%d (%s, tentativa %d)", item.MalID, item.Tipo, item.Tentativas)
		switch item.Tipo {
		case tipoEpisodios:
			processarEpisodios(ctx, client, item, cfg)
		default:
			processarSinopseTags(ctx, client, item, cfg)
		}
	}
	return time.Duration(cfg.Intervalo) * time.Second
}

// ---------------------------------------------------------------------------
// Rotas do Painel
// ---------------------------------------------------------------------------

type FilaIAHandler struct{}

func clienteDoAdmin(w http.ResponseWriter, r *http.Request) (*supabase.Client, bool) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return nil, false
	}
	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return nil, false
	}
	return client, true
}

// HandleEnfileirar põe animes na fila. Enfileirar de novo recomeça o trabalho do zero.
func (h *FilaIAHandler) HandleEnfileirar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MalIDs []int  `json:"mal_ids"`
		Tipo   string `json:"tipo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}
	if req.Tipo == "" {
		req.Tipo = tipoSinopseTags
	}
	if req.Tipo != tipoSinopseTags && req.Tipo != tipoEpisodios {
		http.Error(w, "Tipo precisa ser sinopse_tags ou episodios.", http.StatusBadRequest)
		return
	}
	if len(req.MalIDs) == 0 || len(req.MalIDs) > maxEnfileirarPorVez {
		http.Error(w, fmt.Sprintf("Envie de 1 a %d animes.", maxEnfileirarPorVez), http.StatusBadRequest)
		return
	}
	linhas := make([]map[string]interface{}, 0, len(req.MalIDs))
	vistos := map[int]bool{}
	for _, id := range req.MalIDs {
		if err := ValidarMalID(id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if vistos[id] {
			continue
		}
		vistos[id] = true
		linhas = append(linhas, map[string]interface{}{
			"mal_id": id, "tipo": req.Tipo, "status": "pendente", "resultado": nil, "relatorio": nil,
			"erro": nil, "tentativas": 0, "pego_em": nil, "processed_at": nil, "created_at": agoraUTC(),
		})
	}

	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	if _, _, err := client.From("ai_curation_queue").Upsert(linhas, "mal_id,tipo", "minimal", "").Execute(); err != nil {
		log.Printf("[FILA IA] Falha ao enfileirar: %v", err)
		http.Error(w, "Não foi possível enfileirar. A fila (sql/038) foi aplicada?", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"enfileirados": len(linhas)})
}

// HandleListar devolve a fila, do mais recente para o mais antigo.
func (h *FilaIAHandler) HandleListar(w http.ResponseWriter, r *http.Request) {
	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	data, _, err := client.From("ai_curation_queue").
		Select("id,mal_id,tipo,status,resultado,relatorio,erro,tentativas,created_at,processed_at", "", false).
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Limit(200, "").
		Execute()
	if err != nil {
		log.Printf("[FILA IA] Falha ao listar: %v", err)
		http.Error(w, "Não foi possível ler a fila. A fila (sql/038) foi aplicada?", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func buscarItemDoAdmin(client *supabase.Client, id string) (itemFila, error) {
	data, _, err := client.From("ai_curation_queue").Select("id,mal_id,tipo,status,resultado,tentativas", "", false).Eq("id", id).Execute()
	if err != nil {
		return itemFila{}, err
	}
	var itens []itemFila
	if err := json.Unmarshal(data, &itens); err != nil || len(itens) == 0 {
		return itemFila{}, errors.New("item não encontrado")
	}
	return itens[0], nil
}

// HandleAplicar grava no catálogo o resultado revisado. Só item "pronto" é aplicado.
func (h *FilaIAHandler) HandleAplicar(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Campos []string `json:"campos"`
	}
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Payload inválido", http.StatusBadRequest)
			return
		}
	}
	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	item, err := buscarItemDoAdmin(client, chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Item não encontrado.", http.StatusNotFound)
		return
	}
	if item.Status != "pronto" {
		http.Error(w, "Só um item pronto pode ser aplicado.", http.StatusConflict)
		return
	}
	curado, err := buscarCurado(client, item.MalID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	mudancas, relatorio, err := camposParaAplicar(item.Tipo, item.Resultado, curado, req.Campos, taxonomiaAtual().entradas)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}
	if len(mudancas) > 0 {
		if _, _, err := client.From("curated_animes").Update(mudancas, "minimal", "").Eq("mal_id", strconv.Itoa(item.MalID)).Execute(); err != nil {
			log.Printf("[FILA IA] Falha ao aplicar mal_id=%d: %v", item.MalID, err)
			http.Error(w, "Não foi possível gravar no catálogo.", http.StatusInternalServerError)
			return
		}
	}
	campos := map[string]interface{}{"status": "aplicado"}
	if len(relatorio) > 0 {
		campos["relatorio"] = strings.Join(relatorio, "\n")
	}
	if _, _, err := client.From("ai_curation_queue").Update(campos, "minimal", "").Eq("id", item.ID).Execute(); err != nil {
		log.Printf("[FILA IA] Aplicado, mas falhou ao marcar o item %s: %v", item.ID, err)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"aplicados": len(mudancas), "relatorio": relatorio})
}

// HandleDescartar tira o item da revisão sem tocar no catálogo.
func (h *FilaIAHandler) HandleDescartar(w http.ResponseWriter, r *http.Request) {
	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	if _, _, err := client.From("ai_curation_queue").
		Update(map[string]string{"status": "descartado"}, "minimal", "").
		Eq("id", chi.URLParam(r, "id")).
		Execute(); err != nil {
		http.Error(w, "Não foi possível descartar.", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// HandleGetConfig e HandleUpdateConfig mexem no modo, lote e intervalo do worker.
func (h *FilaIAHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lerConfigFila(client))
}

func (h *FilaIAHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	var cfg configFila
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}
	if problema := validarConfigFila(cfg); problema != "" {
		http.Error(w, problema, http.StatusBadRequest)
		return
	}
	client, ok := clienteDoAdmin(w, r)
	if !ok {
		return
	}
	agora := agoraUTC()
	linhas := []map[string]string{
		{"key": "ai_fila_modo", "value": cfg.Modo, "updated_at": agora},
		{"key": "ai_fila_lote", "value": strconv.Itoa(cfg.Lote), "updated_at": agora},
		{"key": "ai_fila_intervalo", "value": strconv.Itoa(cfg.Intervalo), "updated_at": agora},
		{"key": "ai_fila_episodios_por_lote", "value": strconv.Itoa(cfg.EpisodiosPorLote), "updated_at": agora},
		{"key": "ai_prompt_pesquisa_episodios", "value": cfg.PromptPesquisa, "updated_at": agora},
		{"key": "ai_prompt_estruturar_episodios", "value": cfg.PromptEstruturar, "updated_at": agora},
	}
	if _, _, err := client.From("app_settings").Upsert(linhas, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[FILA IA] Falha ao salvar a configuração: %v", err)
		http.Error(w, "Não foi possível salvar.", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}
