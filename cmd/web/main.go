package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
)

func main() {
	// Carrega variáveis de ambiente e valida configuração inicial
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot: %v", err)
	}

	// Inicializa a conexão com o banco de dados 
	database.Connect()
	log.Println("Conexão com o banco de dados estabelecida!")

	// Cria o roteador principal usando o framework Chi
	r := chi.NewRouter()

	r.Use(middleware.RequestID) // gera um ID único por requisição (útil para rastrear logs)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}

}