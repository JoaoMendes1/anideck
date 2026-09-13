// Cria o endpoint que retorna o status da API AniList, incluindo o estado do kill switch e a saúde geral da API.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type SystemHandler struct{}

func (h *SystemHandler) HandleGetSystemStatus(w http.ResponseWriter, r *http.Request) {
	anilist.StateMutex.RLock()
	offline := anilist.ForceOffline
	health := anilist.ApiHealth
	anilist.StateMutex.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"force_offline": offline,
		"api_health":    health,
	})
}

func (h *SystemHandler) HandleToggleKillSwitch(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		ForceOffline bool `json:"force_offline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	// Altera imediatamente na RAM do Go para efeito instantâneo
	anilist.SetForceOffline(req.ForceOffline)

	// Tenta persistir no Supabase (em background/silencioso para não travar a UI)
	dbClient, errClient := database.ClientWithToken(token)
	if errClient == nil {
		valStr := "false"
		if req.ForceOffline {
			valStr = "true"
		}
		updateData := map[string]string{"value": valStr}
		if _, _, errUp := dbClient.From("app_settings").
			Update(updateData, "minimal", "exact").
			Eq("key", "anilist_force_offline").
			Execute(); errUp != nil {
			log.Printf("[KILL SWITCH] Falha ao persistir o estado: %v", errUp)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Status alterado com sucesso",
		"force_offline": req.ForceOffline,
	})
}

// HandleGetRankingSettings devolve o estado do motor de ranking para a aba de Controle:
// o peso do voto local e quando foi o último ciclo.
//
// O LastUpdated vem da RAM e não do banco de propósito: é o instante em que o Top que
// está sendo servido AGORA foi calculado. A tabela ranking_current_cache guarda o mesmo
// dado, mas ela é o retrato para o próximo boot, não o estado corrente.
func (h *SystemHandler) HandleGetRankingSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"peso_voto_comunitario": lerPesoVotoComunitario(),
		"peso_padrao":           pesoVotoComunitarioPadrao,
		"ultimo_ciclo":          UltimoCicloRanking(),
		"total_animes":          TotalAnimesRanking(),
	})
}

// HandleUpdateRankingSettings grava o peso do voto comunitário e dispara o recálculo.
//
// Ao contrário do Kill Switch, aqui a falha na gravação NÃO é engolida. Lá o efeito
// principal já aconteceu na RAM e o banco é só persistência; aqui o banco é a única
// fonte do valor — devolver 200 sem ter gravado faria o usuário mudar o número, ver
// o ranking igual e não ter como descobrir por quê.
func (h *SystemHandler) HandleUpdateRankingSettings(w http.ResponseWriter, r *http.Request) {
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var req struct {
		PesoVotoComunitario float64 `json:"peso_voto_comunitario"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}

	// Validado aqui e não só no formulário: o campo é numérico, então ausência vira 0
	// (item 16 do PITFALLS), e 0 anularia o vLocal do cálculo — a comunidade sairia do
	// ranking inteiro sem nenhum erro na tela.
	if req.PesoVotoComunitario <= 0 {
		http.Error(w, "O peso precisa ser maior que zero.", http.StatusBadRequest)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Falha ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	// FormatFloat com -1 usa a menor representação que volta ao mesmo número: 350 grava
	// "350" e não "350.00000". O valor é lido de volta como texto na tela.
	valor := strconv.FormatFloat(req.PesoVotoComunitario, 'f', -1, 64)

	if _, _, err := dbClient.From("app_settings").
		Update(map[string]string{"value": valor}, "minimal", "exact").
		Eq("key", chavePesoVotoComunitario).
		Execute(); err != nil {
		log.Printf("[RANKING] Falha ao gravar %s: %v", chavePesoVotoComunitario, err)
		http.Error(w, "Não foi possível salvar o peso.", http.StatusInternalServerError)
		return
	}

	// Recalcula em background. O InvalidateRankingCache já trata execução concorrente
	// com CompareAndSwap, então dois cliques seguidos não disparam dois ciclos.
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":               "Peso salvo. O ranking está sendo recalculado.",
		"peso_voto_comunitario": req.PesoVotoComunitario,
	})
}

// HandleRecalcularRanking força um ciclo fora da cadência de 12h, sem alterar nada.
//
// Devolve 202: o ciclo roda em background e leva ~20s (10 páginas da AniList com espera
// entre elas). A resposta não espera o resultado -- mesmo padrão do resync de metadados.
func (h *SystemHandler) HandleRecalcularRanking(w http.ResponseWriter, r *http.Request) {
	InvalidateRankingCache()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Recálculo iniciado. Leva cerca de 20 segundos.",
	})
}

// HandleTestarAniList faz uma chamada real à AniList e devolve se ela respondeu.
//
// Existe porque o api_health do HandleGetSystemStatus é PASSIVO: ele guarda o resultado
// de chamadas que aconteceram por outro motivo. Sem tráfego, ele envelhece e passa a
// descrever um estado que pode não ser mais verdade.
//
// Ignora o Kill Switch de propósito: o ponto é justamente saber se dá para religar.
func (h *SystemHandler) HandleTestarAniList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	cliente := anilist.NewClient()
	_, err := cliente.GetTopAnime(r.Context(), 1, 1, anilist.SearchFilters{})

	if err != nil {
		// 200 e não 5xx: a chamada de diagnóstico funcionou, quem falhou foi o terceiro.
		// Devolver erro aqui faria a tela dizer "erro ao testar" em vez de "AniList fora".
		json.NewEncoder(w).Encode(map[string]interface{}{
			"respondeu": false,
			"detalhe":   strings.TrimSpace(err.Error()),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"respondeu": true,
	})
}