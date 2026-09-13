// Leituras de diagnóstico do Painel de Controle: coisas que hoje só são visíveis
// abrindo o SQL Editor ou o painel do Supabase.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type DiagnosticoHandler struct{}

// rotuloOrfao espelha uma linha de view_unmapped_labels.
type rotuloOrfao struct {
	RawName         string `json:"raw_name"`
	Animes          int    `json:"animes"`
	VeioDeCuradoria bool   `json:"veio_de_curadoria"`
}

// usoBucket espelha o retorno da RPC uso_do_bucket_curadoria (sql/028).
type usoBucket struct {
	Arquivos int64 `json:"arquivos"`
	Bytes    int64 `json:"bytes"`
}

// HandleListarRotulosOrfaos devolve os rótulos que não existem na genre_taxonomy.
//
// Desde o sql/013, rótulo sem correspondência cai no tier 'ignorado' e some das
// telas em silêncio. A view existe exatamente para tornar esse descarte visível.
//
// Lida com ClientWithToken e não com ServiceRoleClient: a view tem
// security_invoker = on e filtra por auth.uid(), então precisa de um JWT para
// recortar. Com service role ela devolveria o deck de todos os usuários.
//
// Consequência a exibir na tela: o que volta aqui é o que está órfão no deck de
// QUEM consulta. Com um admin só isso equivale ao catálogo; num beta com mais
// gente, não.
//
// O campo veio_de_curadoria separa dois problemas de urgência diferente: false é
// tag da AniList que ainda não foi cadastrada (cauda longa, normal), true é
// rótulo digitado à mão no Painel — provável erro de digitação, e o anime some
// da tela por causa dele.
func (h *DiagnosticoHandler) HandleListarRotulosOrfaos(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Falha ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	data, _, err := client.From("view_unmapped_labels").
		Select("*", "exact", false).
		Execute()
	if err != nil {
		log.Printf("[DIAGNOSTICO] Falha ao ler view_unmapped_labels: %v", err)
		http.Error(w, "Não foi possível ler os rótulos órfãos.", http.StatusInternalServerError)
		return
	}

	var linhas []rotuloOrfao
	if err := json.Unmarshal(data, &linhas); err != nil {
		log.Printf("[DIAGNOSTICO] view_unmapped_labels ilegível: %v", err)
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

// HandleUsoDoBucket devolve quantos arquivos e quantos bytes o bucket curadoria ocupa.
//
// Chama a RPC uso_do_bucket_curadoria em vez de consultar storage.objects direto:
// o cliente Go do PostgREST só alcança o schema public, e a tabela vive em storage.
// A RPC não é SECURITY DEFINER, então a policy de SELECT do sql/028 continua sendo
// quem decide o que ela enxerga.
//
// Zero arquivos é reportado com a flag `vazio` para a tela poder dizer "bucket
// vazio" em vez de exibir "0 MB" -- se a policy do sql/028 não tiver sido
// aplicada, a RPC devolve zero SEM ERRO, e os dois casos ficariam idênticos.
func (h *DiagnosticoHandler) HandleUsoDoBucket(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Falha ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	bruto := client.Rpc("uso_do_bucket_curadoria", "", nil)

	var linhas []usoBucket
	if err := json.Unmarshal([]byte(bruto), &linhas); err != nil || len(linhas) == 0 {
		log.Printf("[DIAGNOSTICO] uso_do_bucket_curadoria devolveu resposta inesperada: %s", bruto)
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