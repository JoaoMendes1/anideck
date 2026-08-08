package database

import (
	"fmt"
	"os"

	"github.com/supabase-community/supabase-go"
)

// Client guarda a conexão global usando a anon_key (usada para ler dados públicos)
var Client *supabase.Client

// Connect inicializa o cliente global
func Connect() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("SUPABASE_URL ou SUPABASE_ANON_KEY ausentes")
	}

	client, err := supabase.NewClient(supabaseURL, supabaseKey, nil)
	if err != nil {
		return fmt.Errorf("erro ao inicializar cliente Supabase: %w", err)
	}

	Client = client
	return nil
}

// criar um cliente seguro e descartável por requisição
// ClientWithToken cria uma conexão que repassa o JWT do usuário logado para o Supabase.
// Isso delega a segurança ao Row Level Security (RLS) do banco de dados.
func ClientWithToken(token string) (*supabase.Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	// Criamos um mapa de cabeçalhos injetando o JWT do usuário
	options := &supabase.ClientOptions{
		Headers: map[string]string{
			"Authorization": "Bearer " + token,
		},
	}

	// Retorna uma instância nova e isolada para esta requisição específica
	return supabase.NewClient(supabaseURL, supabaseKey, options)
}