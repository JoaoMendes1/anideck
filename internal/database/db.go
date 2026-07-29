package database

import (
	"fmt"
	"os"

	"github.com/nedpals/supabase-go"
)

// Client guarda a conexão ativa com o Supabase
var Client *supabase.Client

// Connect inicializa o cliente usando as variáveis de ambiente já validadas pelo config.
// Retorna erro se as credenciais estiverem ausentes, evitando que o servidor suba
// aparentemente OK com banco quebrado.
func Connect() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL ou SUPABASE_SERVICE_KEY ausentes")
	}

	Client = supabase.CreateClient(supabaseURL, supabaseKey)
	return nil
}