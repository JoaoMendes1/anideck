package config

import (
	"os"
	"testing"
)

func TestLoadAndValidateEnv (t *testing.T) {
	// Limpeza do ambiente
	os.Clearenv()

	err := LoadAndValidateEnv()
	if err == nil {
		t.Error("Esperava um erro por faltar variáveis, mas obteve nil")
	}

		os.Setenv("PORT", "8080")
	os.Setenv("SUPABASE_URL", "https://teste.com")
	os.Setenv("SUPABASE_PUBLIC_KEY", "chave123")
	os.Setenv("SUPABASE_ANON_KEY", "chave-anon-123")
	os.Setenv("SUPABASE_SERVICE_ROLE_KEY", "chave-service-123")
	os.Setenv("ADMIN_USER_ID", "uuid-de-teste")
	os.Setenv("GEMINI_API_KEY", "chave-gemini")
	os.Setenv("VAPID_PUBLIC_KEY", "vapid-pub")
	os.Setenv("VAPID_PRIVATE_KEY", "vapid-priv")
	os.Setenv("CRON_SECRET", "segredo-cron")

	err = LoadAndValidateEnv()
	if err != nil {
		t.Errorf("Não esperava erro, mas obteve: %v", err)
	}
}