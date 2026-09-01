// Exclusao de conta pelo proprio usuario.
//
// O supabase.auth do frontend nao apaga a propria conta: isso so existe na API
// admin do Supabase, que exige service role. Nao ha alternativa com RLS --
// apagar linha de auth.users nao e operacao de tabela, esta fora do alcance de
// policy. Segundo caminho do projeto com service role, depois do callRPC do cron.
//
// O user_id vem EXCLUSIVAMENTE do contexto do middleware. Nao existe leitura de
// user_id do body, da URL ou da query, e nao deve passar a existir: com o
// CASCADE do sql/021, um id vindo de fora apagaria a conta e o deck de outra
// pessoa, sem volta (Armadilha 7).
package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type AccountHandler struct {
	// Injetavel para teste: em producao fica nil e cai no padrao, que chama a
	// API admin de verdade. O teste substitui por uma funcao falsa e verifica
	// com qual id ela foi chamada -- sem tocar o Supabase.
	Deletar func(userID string) error
}

func (h *AccountHandler) HandleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

		deletar := h.Deletar
	if deletar == nil {
		deletar = deletarUsuarioSupabase
	}

	// A conta do admin nao se apaga por esta rota. Ela e referenciada pela
	// variavel ADMIN_USER_ID, pela tabela app_admins e pela policy do bucket
	// curadoria -- apaga-la deixaria o projeto sem administrador.
	if userID == os.Getenv("ADMIN_USER_ID") {
		http.Error(w, "A conta de administrador não pode ser excluída por esta rota", http.StatusForbidden)
		return
	}

	// Registrado ANTES de executar: com o CASCADE, depois do DELETE nao sobra
	// vestigio em lugar nenhum. Este log e a unica evidencia de que a exclusao
	// aconteceu. Guarda id e horario, nenhum dado pessoal.
	log.Printf("[EXCLUSAO CONTA] iniciando exclusao do usuario %s em %s",
		userID, time.Now().Format(time.RFC3339))

		if err := deletar(userID); err != nil {
		log.Printf("[ERRO EXCLUSAO CONTA] usuario %s: %v", userID, err)
		http.Error(w, "Não foi possível excluir a conta", http.StatusInternalServerError)
		return
	}

	log.Printf("[EXCLUSAO CONTA] usuario %s excluido com sucesso", userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Conta excluída com sucesso",
	})
}

// Chama DELETE /auth/v1/admin/users/{id} na API do Supabase.
//
// Nao usa o ServiceRoleClient() do database: aquele cliente fala com o
// PostgREST (schema public). auth.users pertence a API de autenticacao, que e
// outro endpoint. A credencial e a mesma.
func deletarUsuarioSupabase(userID string) error {
	baseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if baseURL == "" || serviceKey == "" {
		return fmt.Errorf("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes")
	}

	url := fmt.Sprintf("%s/auth/v1/admin/users/%s", baseURL, userID)

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("montando requisicao: %w", err)
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("chamando a API admin: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		corpo, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return fmt.Errorf("API admin respondeu %d: %s", res.StatusCode, string(corpo))
	}

	return nil
}