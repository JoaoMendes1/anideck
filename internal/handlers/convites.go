package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

type ConvitesHandler struct{}

type RegrasConvites struct {
	AniCoinsAnfitriao      int    `json:"anicoins_anfitriao"`
	XPAnfitriao            int    `json:"xp_anfitriao"`
	AniCoinsConvidado      int    `json:"anicoins_convidado"`
	AniCoinsConvidadoAdmin int    `json:"anicoins_convidado_admin"`
	TituloConvidadoAdmin   string `json:"titulo_convidado_admin"`
}

const ChaveRegrasConvites = "regras_convites"

func RegrasConvitesPadrao() RegrasConvites {
	return RegrasConvites{
		AniCoinsAnfitriao:      50,
		XPAnfitriao:            100,
		AniCoinsConvidado:      30,
		AniCoinsConvidadoAdmin: 100,
		TituloConvidadoAdmin:   "Afilhado do Fundador",
	}
}

type ResgatarConviteRequest struct {
	Codigo string `json:"codigo"`
}

// HandleObterMeuConvite retorna o link e código de convite do membro logado.
func (h *ConvitesHandler) HandleObterMeuConvite(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	raw := strings.TrimSpace(client.Rpc("obter_meu_convite", "", nil))
	if raw == "" || strings.HasPrefix(raw, "error") || strings.Contains(raw, "\"code\"") {
		log.Printf("[CONVITES] Erro ao obter meu convite: %s", raw)
		http.Error(w, "Erro ao obter código de convite.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleResgatarConvite processa um código de convite para um novo membro ou membro sem convite.
func (h *ConvitesHandler) HandleResgatarConvite(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	var req ResgatarConviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	codigo := strings.TrimSpace(req.Codigo)
	if codigo == "" {
		http.Error(w, "Código de convite obrigatório.", http.StatusBadRequest)
		return
	}

	raw := strings.TrimSpace(client.Rpc("resgatar_codigo_convite", "", map[string]interface{}{
		"p_codigo": codigo,
	}))

	if raw == "" || strings.HasPrefix(raw, "error") || strings.Contains(raw, "\"code\"") {
		msg := "Falha ao resgatar código de convite."
		var errObj struct {
			Message string `json:"message"`
			Details string `json:"details"`
		}
		if json.Unmarshal([]byte(raw), &errObj) == nil && errObj.Message != "" {
			msg = errObj.Message
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sucesso": false,
			"erro":    msg,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(raw))
}

// HandleAdminGetConfigConvites retorna as regras de convites configuradas em app_settings.
func (h *ConvitesHandler) HandleAdminGetConfigConvites(w http.ResponseWriter, r *http.Request) {
	client := database.Client
	if client == nil {
		if token, ok := r.Context().Value(middleware.TokenKey).(string); ok && token != "" {
			client, _ = database.ClientWithToken(token)
		}
	}

	regras := RegrasConvitesPadrao()
	if client != nil {
		data, _, err := client.From("app_settings").Select("value", "", false).Eq("key", ChaveRegrasConvites).Execute()
		if err == nil {
			var linhas []struct {
				Value string `json:"value"`
			}
			if json.Unmarshal(data, &linhas) == nil && len(linhas) > 0 {
				_ = json.Unmarshal([]byte(linhas[0].Value), &regras)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(regras)
}

// HandleAdminSaveConfigConvites salva as regras de convites no app_settings.
func (h *ConvitesHandler) HandleAdminSaveConfigConvites(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		http.Error(w, "Não autorizado.", http.StatusUnauthorized)
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil || client == nil {
		http.Error(w, "Erro ao conectar ao banco.", http.StatusInternalServerError)
		return
	}

	var req RegrasConvites
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Corpo inválido.", http.StatusBadRequest)
		return
	}

	if req.AniCoinsAnfitriao < 0 || req.AniCoinsConvidado < 0 || req.AniCoinsConvidadoAdmin < 0 {
		http.Error(w, "As moedas de recompensa não podem ser negativas.", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.TituloConvidadoAdmin) == "" {
		req.TituloConvidadoAdmin = "Afilhado do Fundador"
	}

	bytes, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "Erro ao serializar regras.", http.StatusInternalServerError)
		return
	}

	linha := map[string]interface{}{
		"key":   ChaveRegrasConvites,
		"value": string(bytes),
	}

	if _, _, err := client.From("app_settings").Upsert(linha, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[CONVITES] Erro ao salvar regras em app_settings: %v", err)
		http.Error(w, "Falha ao gravar configurações.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(req)
}
