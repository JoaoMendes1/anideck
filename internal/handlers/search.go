package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/JoaoMendes1/anideck/internal/jikan"
)

// Estrutura para guardar as ferramentas que a rota precisa
type SearchHandler struct {
	JikanClient *jikan.Client
}

// Função que vai rodar toda vez que alguem acessar /api/search
func (h *SearchHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	// 1. Pegamos o que o usuário digitou na URL. Ex: /api/search?q=naruto
	query := r.URL.Query().Get("q")
	if query == "" {
		// Se vier vazio, retornamos um erro 400 (Bad Request) na hora. 
		http.Error(w, "O parâmetro 'q' é obrigatório para a busca", http.StatusBadRequest)
		return
	}

	// Chamando cliente interno da Jikan
	resultados, err := h.JikanClient.SearchAnime(r.Context(), query)
	if err != nil {
		log.Printf("[ERRO JIKAN] Falha ao buscar '%s: %v", query, err)

		// 3. O GATE EXPLÍCITO: O Mock só é ativado se o desenvolvedor ligar a chave.
		// Em produção, essa variável não existirá, então o if será falso.
			if os.Getenv("MOCK_JIKAN") == "true" {
			log.Println("[MOCK] Variável MOCK_JIKAN ativada. Retornando dados falsos para desenvolvimento...")

		resultados = &jikan.AnimeSearchResponse{
				Data: []jikan.Anime{
					{MalID: 20, Title: "Naruto (Mock de Desenvolvimento)", Status: "Finished Airing"},
					{MalID: 1735, Title: "Naruto: Shippuuden (Mock)", Status: "Finished Airing"},
					{MalID: 31964, Title: "Boku no Hero Academia (Mock)", Status: "Finished Airing"},
				},
			}
		} else {
			// 4. COMPORTAMENTO DE PRODUÇÃO (Fail-Fast)
			// Se der erro e não formos nós desenvolvendo, devolvemos um erro claro pro frontend tratar.
			http.Error(w, "Busca indisponível no momento. Tente novamente mais tarde.", http.StatusServiceUnavailable)
			return
		}
	}

	// 3. Deu tudo certo! Dizemos pro navegador que a resposta é um JSON
	w.Header().Set("Content-Type", "application/json")
	//... e transformamos os dados(structs do GO) de volta em texto JSON para o React ler. 
	json.NewEncoder(w).Encode(resultados)

}

