// Leituras e correções de diagnóstico do Painel de Controle: coisas que hoje só
// são visíveis abrindo o SQL Editor ou o painel do Supabase.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	supabase "github.com/supabase-community/supabase-go"
)

type DiagnosticoHandler struct{}

// rotuloOrfao espelha uma linha de view_unmapped_labels.
type rotuloOrfao struct {
	RawName         string `json:"raw_name"`
	Animes          int    `json:"animes"`
	VeioDeCuradoria bool   `json:"veio_de_curadoria"`
}

// rotuloOrfaoDetalhe espelha uma linha de view_unmapped_labels_detalhe.
//
// Titulo e CuratedID são ponteiros porque a view faz LEFT JOIN: anime no deck sem
// curadoria e sem cache volta com os dois nulos. Tipo não-ponteiro viraria string
// vazia e a tela não distinguiria "sem título" de "não sei o título".
// CuratedID não nulo é o que permite abrir o anime direto no editor.
type rotuloOrfaoDetalhe struct {
	RawName         string  `json:"raw_name"`
	MalID           int     `json:"mal_id"`
	Titulo          *string `json:"titulo"`
	VeioDeCuradoria bool    `json:"veio_de_curadoria"`
	CuratedID       *string `json:"curated_id"`
}

// entradaTaxonomia espelha uma linha de genre_taxonomy.
type entradaTaxonomia struct {
	RawName       string `json:"raw_name"`
	DisplayNamePt string `json:"display_name_pt"`
	Tier          string `json:"tier"`
}

// usoBucket espelha o retorno da RPC uso_do_bucket_curadoria (sql/028).
type usoBucket struct {
	Arquivos int64 `json:"arquivos"`
	Bytes    int64 `json:"bytes"`
}

// erroPostgREST é o corpo que o PostgREST devolve em qualquer status 4xx/5xx.
type erroPostgREST struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details"`
	Hint    string `json:"hint"`
}

// interpretarRespostaRPC separa sucesso, recusa do banco e falha de transporte.
//
// POR QUE EXISTE: o Rpc do supabase-go devolve APENAS string. Ele repassa o Rpc do
// postgrest-go, que nunca inspeciona o resp.StatusCode e guarda erro de transporte
// num campo `rest` NÃO EXPORTADO — inalcançável daqui.
//
// Sobram dois sinais legíveis, e os dois precisam ser checados:
//
//   - string VAZIA         -> o Rpc retorna "" em todos os seus caminhos de falha
//     (rede caiu, corpo ilegível, erro ao montar a requisição)
//   - JSON com `message`   -> status 4xx/5xx do PostgREST, ex.: a guarda de
//     is_admin() das RPCs do sql/031, que chega como P0001
//
// Sem isso, a conversão de tipo do resultado vira o único guarda — usar efeito
// colateral como controle de fluxo, e erro de rede indistinguível de sem permissão.
//
// Devolve (corpoBruto, mensagemParaOUsuario, statusHTTP). Mensagem vazia é sucesso.
func interpretarRespostaRPC(nome, bruto string) (string, string, int) {
	bruto = strings.TrimSpace(bruto)

	if bruto == "" {
		log.Printf("[RPC %s] resposta vazia: falha de transporte ou requisição malformada", nome)
		return "", "Não foi possível falar com o banco.", http.StatusBadGateway
	}

	// A resposta de sucesso destas RPCs é um inteiro puro ou um array; só o corpo
	// de erro desserializa como objeto com `message` preenchida.
	var falha erroPostgREST
	if err := json.Unmarshal([]byte(bruto), &falha); err == nil && falha.Message != "" {
		log.Printf("[RPC %s] recusada pelo banco: %s (%s)", nome, falha.Message, falha.Code)

		// P0001 é o RAISE EXCEPTION das nossas funções — a guarda do is_admin().
		if falha.Code == "P0001" {
			return "", falha.Message, http.StatusForbidden
		}
		return "", "O banco recusou a operação.", http.StatusInternalServerError
	}

	return bruto, "", http.StatusOK
}

// chamarRPCInteiro executa uma RPC que devolve um inteiro só.
func chamarRPCInteiro(client *supabase.Client, nome string, corpo interface{}) (int, string, int) {
	bruto, problema, status := interpretarRespostaRPC(nome, client.Rpc(nome, "", corpo))
	if problema != "" {
		return 0, problema, status
	}

	valor, err := strconv.Atoi(bruto)
	if err != nil {
		log.Printf("[RPC %s] esperava inteiro, veio: %q", nome, bruto)
		return 0, "Resposta do banco em formato inesperado.", http.StatusInternalServerError
	}
	return valor, "", http.StatusOK
}

// HandleListarRotulosOrfaos devolve os rótulos que não existem na genre_taxonomy.
//
// Desde o sql/013, rótulo sem correspondência cai no tier 'ignorado' e some das
// telas em silêncio. A view existe exatamente para tornar esse descarte visível.
//
// Lida com ClientWithToken e não com ServiceRoleClient: a view tem
// security_invoker = on e filtra por auth.uid(), então precisa de um JWT para
// recortar o lado do deck. Desde o sql/030 ela também cobre a curadoria inteira,
// inclusive anime que ninguém adicionou ao deck.
//
// O campo veio_de_curadoria separa dois problemas de urgência diferente: false é
// tag da AniList que ainda não foi cadastrada, true é rótulo gravado na curadoria
// — e o anime some dos gráficos por causa dele.
func (h *DiagnosticoHandler) HandleListarRotulosOrfaos(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := client.From("view_unmapped_labels").
		Select("*", "exact", false).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarRotulosOrfaos: %v", err)
		http.Error(w, "Não foi possível ler os rótulos órfãos.", http.StatusInternalServerError)
		return
	}

	var linhas []rotuloOrfao
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[ERRO DB] view_unmapped_labels: payload inesperado: %v", err)
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	// Lista vazia é resultado legítimo (nenhum rótulo órfão), não erro. O make
	// garante [] no JSON em vez de null, que o React trataria como ausência.
	if linhas == nil {
		linhas = make([]rotuloOrfao, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(linhas)
}

// HandleListarAnimesDoRotulo devolve os animes que usam um rótulo órfão.
//
// A lista agregada diz quantos, nunca quais — e sem os títulos não dá para
// corrigir sem abrir o SQL Editor, que é o que esta aba veio eliminar.
func (h *DiagnosticoHandler) HandleListarAnimesDoRotulo(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	rotulo := strings.TrimSpace(r.URL.Query().Get("raw_name"))
	if rotulo == "" {
		http.Error(w, "O parâmetro raw_name é obrigatório.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := client.From("view_unmapped_labels_detalhe").
		Select("*", "exact", false).
		Eq("raw_name", rotulo).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarAnimesDoRotulo (%q): %v", rotulo, err)
		http.Error(w, "Não foi possível listar os animes.", http.StatusInternalServerError)
		return
	}

	var linhas []rotuloOrfaoDetalhe
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[ERRO DB] view_unmapped_labels_detalhe: payload inesperado: %v", err)
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	if linhas == nil {
		linhas = make([]rotuloOrfaoDetalhe, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(linhas)
}

// HandleUsoDoBucket devolve quantos arquivos e quantos bytes o bucket curadoria ocupa.
//
// Chama a RPC uso_do_bucket_curadoria em vez de consultar storage.objects direto:
// o cliente Go só alcança o schema public, e a tabela vive em storage. A RPC não é
// SECURITY DEFINER, então a policy de SELECT do sql/028 continua sendo quem decide
// o que ela enxerga.
//
// Zero arquivos é reportado com a flag `vazio` para a tela poder dizer "bucket
// vazio" em vez de exibir "0 MB" — sem a policy do sql/028 a RPC devolveria zero
// sem erro, e os dois casos ficariam idênticos.
func (h *DiagnosticoHandler) HandleUsoDoBucket(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	const nomeRPC = "uso_do_bucket_curadoria"
	bruto, problema, status := interpretarRespostaRPC(nomeRPC, client.Rpc(nomeRPC, "", nil))
	if problema != "" {
		http.Error(w, problema, status)
		return
	}

	// RETURNS TABLE devolve um array, mesmo com uma linha só.
	var linhas []usoBucket
	if err := json.Unmarshal([]byte(bruto), &linhas); err != nil || len(linhas) == 0 {
		log.Printf("[DIAGNOSTICO] %s: payload inesperado: %s", nomeRPC, bruto)
		http.Error(w, "Não foi possível ler o uso do bucket.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"arquivos": linhas[0].Arquivos,
		"bytes":    linhas[0].Bytes,
		// O bucket não tem limite configurado (snapshot, seção [6]). O teto de 1 GB
		// é do plano Free e não está no banco, então a tela o exibe como referência.
		"vazio": linhas[0].Arquivos == 0,
	})
}

// HandleRenomearTag troca uma tag por outra em todos os animes curados.
//
// Operação em lote e sem desfazer: a tela precisa mostrar quantos e quais antes de
// chamar. O número devolvido é o que de fato mudou, para a tela poder confrontar
// com o que prometeu.
//
// A RPC do sql/031 preserva a POSIÇÃO da tag no array — a ordem é prioridade
// editorial e aparece nos cards. Um UPDATE com array_agg reordenaria e destruiria
// curadoria manual em silêncio; aconteceu em 13/09/2026.
func (h *DiagnosticoHandler) HandleRenomearTag(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		TagAntiga string `json:"tag_antiga"`
		TagNova   string `json:"tag_nova"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	req.TagAntiga = strings.TrimSpace(req.TagAntiga)
	req.TagNova = strings.TrimSpace(req.TagNova)
	if req.TagAntiga == "" || req.TagNova == "" {
		http.Error(w, "Informe a tag de origem e a de destino.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	afetados, problema, status := chamarRPCInteiro(client, "renomear_tag_curadoria", map[string]string{
		"tag_antiga": req.TagAntiga,
		"tag_nova":   req.TagNova,
	})
	if problema != "" {
		http.Error(w, problema, status)
		return
	}

	// A curadoria alimenta o Top Global: mudar tag em lote muda o que a busca
	// filtrada devolve, e o cache em RAM ficaria com os rótulos antigos.
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"afetados": afetados,
	})
}

// HandleRemoverTag apaga uma tag de todos os animes curados.
func (h *DiagnosticoHandler) HandleRemoverTag(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		Tag string `json:"tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	req.Tag = strings.TrimSpace(req.Tag)
	if req.Tag == "" {
		http.Error(w, "Informe a tag a remover.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	afetados, problema, status := chamarRPCInteiro(client, "remover_tag_curadoria", map[string]string{
		"tag_alvo": req.Tag,
	})
	if problema != "" {
		http.Error(w, problema, status)
		return
	}

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"afetados": afetados,
	})
}

// HandleListarTaxonomia devolve a taxonomia inteira.
//
// Alimenta duas telas: o dashboard de rótulos e o autocomplete do editor de
// curadoria. São ~90 linhas e mudam raramente, então vem tudo de uma vez em vez
// de paginar ou filtrar no servidor.
//
// A policy de SELECT é TO authenticated USING (true) — a taxonomia não é dado de
// usuário. O endpoint fica em /admin mesmo assim porque só o Painel a consome.
func (h *DiagnosticoHandler) HandleListarTaxonomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := client.From("genre_taxonomy").
		Select("raw_name,display_name_pt,tier", "exact", false).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleListarTaxonomia: %v", err)
		http.Error(w, "Não foi possível ler a taxonomia.", http.StatusInternalServerError)
		return
	}

	var linhas []entradaTaxonomia
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[ERRO DB] genre_taxonomy: payload inesperado: %v", err)
		http.Error(w, "Resposta do banco em formato inesperado.", http.StatusInternalServerError)
		return
	}

	if linhas == nil {
		linhas = make([]entradaTaxonomia, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(linhas)
}

// violaChaveEstrangeira reconhece o 23503 do Postgres, que é a recusa de apagar
// algo ainda referenciado por outra tabela.
//
// O texto do erro é o que o PostgREST devolve; não existe código tipado aqui.
// Se um dia a mensagem mudar de formato, o pior caso é voltar ao 500 genérico.
func violaChaveEstrangeira(err error) bool {
	if err == nil {
		return false
	}
	texto := strings.ToLower(err.Error())
	return strings.Contains(texto, "23503") ||
		strings.Contains(texto, "foreign key constraint")
}


func (h *DiagnosticoHandler) HandleRemoverDaTaxonomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		RawName    string `json:"raw_name"`
		Confirmado bool   `json:"confirmado"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	req.RawName = strings.TrimSpace(req.RawName)
	if req.RawName == "" {
		http.Error(w, "Informe o rótulo a remover.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	emUso, problema, status := chamarRPCInteiro(client, "contar_animes_com_tag", map[string]string{
		"tag_alvo": req.RawName,
	})
	if problema != "" {
		http.Error(w, problema, status)
		return
	}

	if !req.Confirmado {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"confirmado": false,
			"em_uso":     emUso,
		})
		return
	}

		if _, _, err := client.From("genre_taxonomy").
		Delete("", "exact").
		Eq("raw_name", req.RawName).
		Execute(); err != nil {
		log.Printf("[ERRO DB] HandleRemoverDaTaxonomia (%q): %v", req.RawName, err)

		// O Olheiro tem peso cadastrado nesse rótulo (sql/035). A remoção é
		// recusada de propósito: em cascata, o scan encolheria em silêncio.
		if violaChaveEstrangeira(err) {
			http.Error(w, "Este rótulo tem peso cadastrado no Olheiro. Remova o peso na aba do Olheiro antes de excluir o rótulo.", http.StatusConflict)
			return
		}

		http.Error(w, "Não foi possível remover o rótulo.", http.StatusInternalServerError)
		return
	}

	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"confirmado": true,
		"em_uso":     emUso,
	})
}

func (h *DiagnosticoHandler) HandleCadastrarNaTaxonomia(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		RawName       string `json:"raw_name"`
		DisplayNamePt string `json:"display_name_pt"`
		Tier          string `json:"tier"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo da requisição inválido", http.StatusBadRequest)
		return
	}

	req.RawName = strings.TrimSpace(req.RawName)
	req.DisplayNamePt = strings.TrimSpace(req.DisplayNamePt)
	req.Tier = strings.TrimSpace(req.Tier)

	if req.RawName == "" || req.DisplayNamePt == "" {
		http.Error(w, "Informe o nome de entrada e o nome de exibição.", http.StatusBadRequest)
		return
	}

	// Validado aqui e não só no formulário: tier fora desta lista faz a tag sumir
	// dos gráficos de novo, que é exatamente o problema que esta tela resolve.
	tiersValidos := map[string]bool{
		"genero": true, "tag_tematica": true, "demografia": true, "ignorado": true,
	}
	if !tiersValidos[req.Tier] {
		http.Error(w, "Camada inválida.", http.StatusBadRequest)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	if _, _, err := client.From("genre_taxonomy").
		Insert(map[string]string{
			"raw_name":        req.RawName,
			"display_name_pt": req.DisplayNamePt,
			"tier":            req.Tier,
		}, false, "", "minimal", "exact").
		Execute(); err != nil {
		log.Printf("[ERRO DB] HandleCadastrarNaTaxonomia (%q): %v", req.RawName, err)
		http.Error(w, "Não foi possível cadastrar. O nome de entrada já existe?", http.StatusInternalServerError)
		return
	}

	// O rótulo novo muda como a curadoria é lida na busca e nas estatísticas.
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Rótulo cadastrado.",
	})
}