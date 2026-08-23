package database

import (
	"fmt"
	"os"

	"github.com/supabase-community/supabase-go"
)

var Client *supabase.Client

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

// ServiceRoleClient devolve um client que ignora RLS.
//
// POR QUE ELE EXISTE: o Client comum usa a ANON_KEY e depende de um JWT de
// usuário (ver ClientWithToken) para passar pelas policies. Isso cobre todo o
// app, onde toda escrita nasce de alguém logado.
//
// O motor de ranking é a exceção: roda num worker de background, a cada 12h,
// sem nenhum usuário envolvido. Não existe JWT para anexar.
//
// A alternativa seria uma policy de INSERT liberada na ranking_snapshots —
// mas a ANON_KEY é pública (vive no bundle do frontend), então qualquer pessoa
// poderia gravar posições falsas no histórico.
//
// USE COM PARCIMÔNIA: esta chave enxerga e altera TUDO, inclusive o deck de
// outros usuários. Só para trabalho de background sem usuário. Qualquer coisa
// disparada por uma requisição HTTP deve continuar usando ClientWithToken.
func ServiceRoleClient() (*supabase.Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || serviceKey == "" {
		return nil, fmt.Errorf("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes")
	}

	return supabase.NewClient(supabaseURL, serviceKey, nil)
}

func ClientWithToken(token string) (*supabase.Client, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_ANON_KEY")

	options := &supabase.ClientOptions{
		Headers: map[string]string{
			"Authorization": "Bearer " + token,
		},
	}

	return supabase.NewClient(supabaseURL, supabaseKey, options)
}