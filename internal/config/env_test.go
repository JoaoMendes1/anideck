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
	os.Setenv("SUPABASE_SERVICE_KEY", "chave-admin-123")

	err = LoadAndValidateEnv()
	if err != nil {
		t.Errorf("Não esperava erro, mas obteve: %v", err)
	}
}