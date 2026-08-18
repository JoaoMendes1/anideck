package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// LoadAndValidateEnv carrega o .env local (se existir) e verifica as chaves obrigatórias.
func LoadAndValidateEnv() error {
	// Tentativa carregar arquivo .env
	_ = godotenv.Load()

	requiredVars := []string{
		"PORT",
		"SUPABASE_URL", 
		"SUPABASE_PUBLIC_KEY", 
		"SUPABASE_ANON_KEY",
		"ADMIN_USER_ID",
		"GEMINI_API_KEY",
		"VAPID_PUBLIC_KEY",
		"VAPID_PRIVATE_KEY",
		"CRON_SECRET",
	}

	for _, v := range requiredVars {
		if os.Getenv(v) == "" {
			return fmt.Errorf("variável de ambiente obrigatória ausente: %s", v)
		}
	}

	return nil

}