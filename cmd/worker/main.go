// Worker da fila de curadoria assistida (sql/038).
//
// Processo próprio, e não goroutine do app: roda num container separado e não é
// derrubado a cada deploy do site. Conversa com o Painel só pela tabela da fila.
package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"
	"time"

	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/handlers"
)

func main() {
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot do worker: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Erro crítico ao conectar ao banco: %v", err)
	}

	// Para no SIGTERM do Docker sem cortar um item no meio do ciclo seguinte.
	ctx, parar := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer parar()

	log.Println("[WORKER] Fila de curadoria iniciada")
	for {
		espera := handlers.RodarCicloFilaIA(ctx)
		select {
		case <-ctx.Done():
			log.Println("[WORKER] Encerrado")
			return
		case <-time.After(espera):
		}
	}
}
