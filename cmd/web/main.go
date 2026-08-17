package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/handlers"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func main() {
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Erro crítico ao conectar ao banco de dados: %v", err)
	}
	log.Println("Conexão com o banco de dados estabelecida!")

	if err := middleware.InitJWKS(os.Getenv("SUPABASE_URL")); err != nil {
		log.Fatalf("Erro crítico ao carregar JWKS: %v", err)
	}

	var anilistService anilist.Service

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Inicializando Mock Client para a AniList (Sem consumo real de API)")
		anilistService = anilist.NewMockClient()
	} else {
		anilistService = anilist.NewClient()
	}

	searchHandler := &handlers.SearchHandler{AniListClient: anilistService}
	animeHandler := &handlers.AnimeHandler{AniListClient: anilistService}
	
	// AQUI ESTAVA O ERRO NO MAIN.GO: Voltando ao normal!
	entriesHandler := &handlers.EntriesHandler{} 
	
	statsHandler := &handlers.StatsHandler{}
	rankingHandler := &handlers.RankingHandler{AniListClient: anilistService}
	curationHandler := &handlers.CurationHandler{}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	r.Get("/api/search", searchHandler.HandleSearch)
	r.Get("/api/anime/{id}", animeHandler.HandleGetAnime)
	r.Get("/api/anime/{id}/statistics", animeHandler.HandleGetStats)
	r.Get("/api/ranking", rankingHandler.HandleGetTopAnime)
	r.Get("/api/curation", curationHandler.HandleList)

	r.Post("/api/anime/bulk", animeHandler.HandleGetAnimesByIDs)

	r.Group(func(protegido chi.Router) {
		protegido.Use(middleware.RequireAuth)

		protegido.Get("/api/entries", entriesHandler.HandleList)
		protegido.Post("/api/entries", entriesHandler.HandleCreate)
		protegido.Put("/api/entries/{id}", entriesHandler.HandleUpdate)
		protegido.Delete("/api/entries/{id}", entriesHandler.HandleDelete)
		protegido.Get("/api/stats/user", statsHandler.HandleGetUserStats)
	})

	r.Group(func(admin chi.Router) {
		admin.Use(middleware.RequireAuth)
		admin.Use(middleware.RequireAdmin)

		admin.Get("/api/admin/verify", func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"admin": true}`))
		})

		// Rotas de CRUD da curadoria
		admin.Post("/api/curation", curationHandler.HandleCreate)
		admin.Put("/api/curation/{id}", curationHandler.HandleUpdate)
		admin.Delete("/api/curation/{id}", curationHandler.HandleDelete)

		admin.Post("/api/admin/curation/ai/rewrite", curationHandler.HandleAIRewrite)
		admin.Get("/api/admin/settings/ai-prompt", curationHandler.HandleGetAIPrompt)
		admin.Put("/api/admin/settings/ai-prompt", curationHandler.HandleUpdateAIPrompt)
	})

	workDir, _ := os.Getwd()
	filesDir := filepath.Join(workDir, "client", "dist")

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		path := filepath.Join(filesDir, req.URL.Path)
		_, err := os.Stat(path)

		if os.IsNotExist(err) || req.URL.Path == "/" {
			http.ServeFile(w, req, filepath.Join(filesDir, "index.html"))
			return
		}

		http.ServeFile(w, req, path)
	})

	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}