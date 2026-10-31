package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/JoaoMendes1/anideck/internal/models"
)

// As trilhas vivem numa chave de app_settings, em JSON: são poucas, editadas por um
// admin só e lidas inteiras. Ver a decisão de 31/10/2026 no DECISIONS.md.
const chaveTrilhas = "trilhas_curadas"

// Limites que mantêm a home legível e o JSON pequeno.
const (
	maxTrilhas         = 12
	maxAnimesPorTrilha = 20
	maxNomeTrilha      = 60
	maxSubtituloTrilha = 100
	maxNotaTrilha      = 280
)

// Trilha é como a trilha fica gravada: a ordem de MalIDs é a ordem exibida.
type Trilha struct {
	ID        string `json:"id"`
	Nome      string `json:"nome"`
	Subtitulo string `json:"subtitulo"`
	Nota      string `json:"nota"`
	MalIDs    []int  `json:"mal_ids"`
}

// animeDaTrilha é o mínimo que o card da home exibe.
type animeDaTrilha struct {
	MalID    int    `json:"mal_id"`
	Titulo   string `json:"titulo"`
	ImageURL string `json:"image_url"`
}

// trilhaPublica é a trilha com os animes já resolvidos pela curadoria.
type trilhaPublica struct {
	ID        string          `json:"id"`
	Nome      string          `json:"nome"`
	Subtitulo string          `json:"subtitulo"`
	Nota      string          `json:"nota"`
	Animes    []animeDaTrilha `json:"animes"`
}

// validarTrilhas limpa espaços e confere os limites. Devolve a mensagem para o 400.
func validarTrilhas(trilhas []Trilha) ([]Trilha, string) {
	if len(trilhas) > maxTrilhas {
		return nil, fmt.Sprintf("No máximo %d trilhas.", maxTrilhas)
	}
	limpas := make([]Trilha, 0, len(trilhas))
	ids := make(map[string]bool, len(trilhas))
	for i, t := range trilhas {
		t.ID = strings.TrimSpace(t.ID)
		t.Nome = strings.TrimSpace(t.Nome)
		t.Subtitulo = strings.TrimSpace(t.Subtitulo)
		t.Nota = strings.TrimSpace(t.Nota)

		posicao := i + 1
		if t.ID == "" || ids[t.ID] {
			return nil, fmt.Sprintf("Trilha %d sem identificador único.", posicao)
		}
		ids[t.ID] = true
		if t.Nome == "" {
			return nil, fmt.Sprintf("Trilha %d sem nome.", posicao)
		}
		if utf8.RuneCountInString(t.Nome) > maxNomeTrilha {
			return nil, fmt.Sprintf("Nome da trilha %d passa de %d caracteres.", posicao, maxNomeTrilha)
		}
		if utf8.RuneCountInString(t.Subtitulo) > maxSubtituloTrilha {
			return nil, fmt.Sprintf("Subtítulo da trilha %d passa de %d caracteres.", posicao, maxSubtituloTrilha)
		}
		if utf8.RuneCountInString(t.Nota) > maxNotaTrilha {
			return nil, fmt.Sprintf("Nota da trilha %d passa de %d caracteres.", posicao, maxNotaTrilha)
		}
		if len(t.MalIDs) > maxAnimesPorTrilha {
			return nil, fmt.Sprintf("Trilha %d passa de %d animes.", posicao, maxAnimesPorTrilha)
		}
		vistos := make(map[int]bool, len(t.MalIDs))
		malIDs := make([]int, 0, len(t.MalIDs))
		for _, id := range t.MalIDs {
			if id <= 0 {
				return nil, fmt.Sprintf("Trilha %d tem um mal_id inválido.", posicao)
			}
			if vistos[id] {
				continue
			}
			vistos[id] = true
			malIDs = append(malIDs, id)
		}
		t.MalIDs = malIDs
		limpas = append(limpas, t)
	}
	return limpas, ""
}

// resolverTrilhas troca os mal_ids pelos dados da curadoria. Anime que saiu do catálogo
// some da trilha em vez de quebrar a home, e trilha que fica vazia não é exibida.
func resolverTrilhas(trilhas []Trilha, curados map[int]models.CuratedAnime) []trilhaPublica {
	publicas := make([]trilhaPublica, 0, len(trilhas))
	for _, t := range trilhas {
		p := trilhaPublica{ID: t.ID, Nome: t.Nome, Subtitulo: t.Subtitulo, Nota: t.Nota, Animes: []animeDaTrilha{}}
		for _, id := range t.MalIDs {
			c, ok := curados[id]
			if !ok {
				continue
			}
			p.Animes = append(p.Animes, animeDaTrilha{MalID: id, Titulo: c.CustomTitle, ImageURL: c.CustomCoverImage})
		}
		if len(p.Animes) > 0 {
			publicas = append(publicas, p)
		}
	}
	return publicas
}

// lerTrilhas lê a chave de app_settings. Chave ausente é "nenhuma trilha", não erro.
func lerTrilhas() ([]Trilha, error) {
	data, _, err := database.Client.From("app_settings").
		Select("value", "", false).
		Eq("key", chaveTrilhas).
		Execute()
	if err != nil {
		return nil, err
	}
	var linhas []struct {
		Value string `json:"value"`
	}
	if err := json.Unmarshal(data, &linhas); err != nil {
		return nil, err
	}
	if len(linhas) == 0 || strings.TrimSpace(linhas[0].Value) == "" {
		return []Trilha{}, nil
	}
	var trilhas []Trilha
	if err := json.Unmarshal([]byte(linhas[0].Value), &trilhas); err != nil {
		return nil, err
	}
	return trilhas, nil
}

type TrilhasHandler struct{}

// HandleListarPublicas devolve as trilhas prontas para a home, na ordem do Painel.
func (h *TrilhasHandler) HandleListarPublicas(w http.ResponseWriter, r *http.Request) {
	trilhas, err := lerTrilhas()
	if err != nil {
		log.Printf("[TRILHAS] Falha ao ler: %v", err)
		http.Error(w, "Trilhas indisponíveis no momento.", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resolverTrilhas(trilhas, CarregarCuradoria(database.Client))); err != nil {
		log.Printf("[ERRO] HandleListarPublicas: falha ao serializar resposta: %v", err)
	}
}

// HandleListarAdmin devolve as trilhas como estão gravadas, com os mal_ids, para o Painel.
func (h *TrilhasHandler) HandleListarAdmin(w http.ResponseWriter, r *http.Request) {
	trilhas, err := lerTrilhas()
	if err != nil {
		log.Printf("[TRILHAS] Falha ao ler: %v", err)
		http.Error(w, "Não foi possível ler as trilhas.", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(trilhas); err != nil {
		log.Printf("[ERRO] HandleListarAdmin: falha ao serializar resposta: %v", err)
	}
}

// HandleSalvar grava a lista inteira de trilhas. A ordem da lista é a ordem da home.
func (h *TrilhasHandler) HandleSalvar(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok {
		http.Error(w, "Não autenticado", http.StatusUnauthorized)
		return
	}

	var trilhas []Trilha
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256*1024)).Decode(&trilhas); err != nil {
		http.Error(w, "Payload inválido", http.StatusBadRequest)
		return
	}
	limpas, problema := validarTrilhas(trilhas)
	if problema != "" {
		http.Error(w, problema, http.StatusBadRequest)
		return
	}

	valor, err := json.Marshal(limpas)
	if err != nil {
		http.Error(w, "Não foi possível montar as trilhas.", http.StatusInternalServerError)
		return
	}

	dbClient, err := database.ClientWithToken(token)
	if err != nil {
		http.Error(w, "Falha ao conectar ao banco.", http.StatusInternalServerError)
		return
	}
	// O JWT do admin passa pelas policies de INSERT e UPDATE de app_settings (sql/016).
	linha := map[string]string{
		"key":        chaveTrilhas,
		"value":      string(valor),
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	}
	if _, _, err := dbClient.From("app_settings").Upsert(linha, "key", "minimal", "").Execute(); err != nil {
		log.Printf("[TRILHAS] Falha ao gravar: %v", err)
		http.Error(w, "Não foi possível salvar as trilhas.", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(limpas); err != nil {
		log.Printf("[ERRO] HandleSalvar: falha ao serializar resposta: %v", err)
	}
}
