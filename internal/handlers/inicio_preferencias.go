package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

// InicioPreferenciasHandler persiste e lê a organização da tela Início por usuário (#275).
type InicioPreferenciasHandler struct{}

// SecoesInicioPadrao define todas as seções conhecidas e a ordem inicial padrão.
var SecoesInicioPadrao = []string{
	"continuar",
	"missoes",
	"semana",
	"chefao",
	"cla",
	"destaques",
	"recomendados",
	"lacuna",
	"trilhas",
	"ranking",
}

// FontesDestaqueValidas define os 4 presets aceitos para a seção "Em destaque".
var FontesDestaqueValidas = map[string]bool{
	"curadoria":     true,
	"lancamento":    true,
	"bem_avaliados": true,
	"populares":     true,
}

type ConfigInicio struct {
	Ordem         []string `json:"ordem"`
	Ocultas       []string `json:"ocultas"`
	Minimizadas   []string `json:"minimizadas"`
	DestaqueFonte string   `json:"destaque_fonte"`
}

func ConfigInicioPadrao() ConfigInicio {
	ordem := make([]string, len(SecoesInicioPadrao))
	copy(ordem, SecoesInicioPadrao)
	return ConfigInicio{
		Ordem:         ordem,
		Ocultas:       []string{},
		Minimizadas:   []string{},
		DestaqueFonte: "curadoria",
	}
}

func NormalizarConfigInicio(c ConfigInicio) ConfigInicio {
	secoesValidas := make(map[string]bool, len(SecoesInicioPadrao))
	for _, s := range SecoesInicioPadrao {
		secoesValidas[s] = true
	}

	vistosOrdem := make(map[string]bool, len(SecoesInicioPadrao))
	ordem := make([]string, 0, len(SecoesInicioPadrao))
	for _, id := range c.Ordem {
		if secoesValidas[id] && !vistosOrdem[id] {
			vistosOrdem[id] = true
			ordem = append(ordem, id)
		}
	}
	for _, id := range SecoesInicioPadrao {
		if !vistosOrdem[id] {
			vistosOrdem[id] = true
			ordem = append(ordem, id)
		}
	}

	filtrarUnicas := func(origem []string) []string {
		vistos := make(map[string]bool, len(origem))
		saida := make([]string, 0, len(origem))
		for _, id := range origem {
			if secoesValidas[id] && !vistos[id] {
				vistos[id] = true
				saida = append(saida, id)
			}
		}
		return saida
	}

	fonte := c.DestaqueFonte
	if !FontesDestaqueValidas[fonte] {
		fonte = "curadoria"
	}

	return ConfigInicio{
		Ordem:         ordem,
		Ocultas:       filtrarUnicas(c.Ocultas),
		Minimizadas:   filtrarUnicas(c.Minimizadas),
		DestaqueFonte: fonte,
	}
}

func (h *InicioPreferenciasHandler) HandleGetPreferencias(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk || token == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	data, _, err := dbClient.From("user_preferences").
		Select("inicio_config", "", false).
		Eq("user_id", userID).
		Execute()
	if err != nil {
		log.Printf("[ERRO DB] HandleGetPreferencias: %v", err)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ConfigInicioPadrao())
		return
	}

	var linhas []struct {
		InicioConfig ConfigInicio `json:"inicio_config"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil || len(linhas) == 0 {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ConfigInicioPadrao())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(NormalizarConfigInicio(linhas[0].InicioConfig))
}

func (h *InicioPreferenciasHandler) HandleSalvarPreferencias(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok || userID == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}
	token, tokenOk := r.Context().Value(middleware.TokenKey).(string)
	if !tokenOk || token == "" {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var entrada ConfigInicio
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		http.Error(w, "Preferências em formato inválido", http.StatusBadRequest)
		return
	}

	normalizada := NormalizarConfigInicio(entrada)

	dbClient, errClient := database.ClientWithToken(token)
	if errClient != nil {
		http.Error(w, "Erro interno de conexão", http.StatusInternalServerError)
		return
	}

	linha := map[string]any{
		"user_id":       userID,
		"inicio_config": normalizada,
		"updated_at":    time.Now().UTC().Format(time.RFC3339),
	}
	if _, _, err := dbClient.From("user_preferences").Upsert(linha, "user_id", "minimal", "").Execute(); err != nil {
		log.Printf("[ERRO DB] HandleSalvarPreferencias: %v", err)
		http.Error(w, "Não foi possível salvar suas preferências", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(normalizada)
}
