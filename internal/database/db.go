package database

import (
	"os"

	"github.com/nedpals/supabase-go"
)

// Client guarda a conexão ativa com o supabase 
var Client *supabase.Client

// Connect inicializa o cliente usando as variáveis de ambiente já validadas 
func Connect() {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_PUBLIC_KEY")

	Client = supabase.CreateClient(supabaseURL, supabaseKey)
}