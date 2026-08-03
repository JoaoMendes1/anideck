package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/handlers"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func main() {
	//1. Carrega variáveis de ambiente e valida configuração inicial
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Erro crítico ao conectar ao banco de dados: %v", err)
	}
	log.Println("Conexão com o banco de dados estabelecida!")

	// 2. Carrega as chaves públicas da Supabase pra validar token de usuário
	if err := middleware.InitJWKS(os.Getenv("SUPABASE_URL")); err != nil {
		log.Fatalf("Erro crítico ao carregar JWKS: %v", err)
	}

	// 3. Inicializa o cliente da AniList (que contém o rate limiter)
	anilistClient := anilist.NewClient()

	searchHandler := &handlers.SearchHandler{AniListClient: anilistClient}
	animeHandler := &handlers.AnimeHandler{AniListClient: anilistClient}
	entriesHandler := handlers.EntriesHandler{}
	rankingHandler := &handlers.RankingHandler{AniListClient: anilistClient}
	curationHandler := &handlers.CurationHandler{}

	// 4. Configuração das rotas (chi)
	// Cria o roteador principal usando o framework Chi
	r := chi.NewRouter()
	r.Use(chimw.RequestID) // gera um ID único por requisição (útil para rastrear logs)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Rotas públicas — sem login necessário
	r.Get("/api/search", searchHandler.HandleSearch)
	r.Get("/api/anime/{id}", animeHandler.HandleGetAnime)
	r.Get("/api/anime/{id}/statistics", animeHandler.HandleGetStatistics)
	r.Get("/api/ranking", rankingHandler.HandleGetTopAnime)
	r.Get("/api/curation", curationHandler.HandleList)

	// 5. Rotas protegidas que exigem token válido
	r.Group(func(protegido chi.Router) {
		protegido.Use(middleware.RequireAuth)

		protegido.Get("/api/entries", entriesHandler.HandleList)
		protegido.Post("/api/entries", entriesHandler.HandleCreate)
		protegido.Put("/api/entries/{id}", entriesHandler.HandleUpdate)
		protegido.Delete("/api/entries/{id}", entriesHandler.HandleDelete)

	})

	// 6. Rotas de Admin (Requer Login E ser o dono do sistema)
	r.Group(func(admin chi.Router) {
		admin.Use(middleware.RequireAuth)
<<<<<<< HEAD
		admin.Use(middleware.RequireAdmin) // O nosso novo escudo!
=======
		admin.Use(middleware.RequireAdmin) // O nosso escudo de administrador!
>>>>>>> a66a1b3f772a700982e1d4577db5c9cc62726384

		admin.Post("/api/curation", curationHandler.HandleCreate)
		admin.Put("/api/curation/{id}", curationHandler.HandleUpdate)
		admin.Delete("/api/curation/{id}", curationHandler.HandleDelete)
	})
<<<<<<< HEAD
=======
	
>>>>>>> a66a1b3f772a700982e1d4577db5c9cc62726384
	// Inicia o servidor
	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}

}
