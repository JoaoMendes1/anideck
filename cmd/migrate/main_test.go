package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestListarMigrations_OrdenaERecusaDuplicada(t *testing.T) {
	dir := t.TempDir()

	// Arquivo auxiliar que nao segue o padrao NNN_nome.sql deve ser ignorado.
	if err := os.WriteFile(filepath.Join(dir, "snapshot_schema.sql"), []byte("SELECT 1;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "010_segunda.sql"), []byte("SELECT 2;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "002_primeira.sql"), []byte("SELECT 1;\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	lista, err := listarMigrations(dir)
	if err != nil {
		t.Fatalf("erro inesperado: %v", err)
	}
	if len(lista) != 2 {
		t.Fatalf("esperava 2 migrations, obteve %d", len(lista))
	}
	if lista[0].Nome != "002_primeira.sql" || lista[1].Nome != "010_segunda.sql" {
		t.Fatalf("ordem incorreta: %v, %v", lista[0].Nome, lista[1].Nome)
	}
	if len(lista[0].Checksum) != 64 {
		t.Fatalf("checksum SHA-256 invalido: %q", lista[0].Checksum)
	}

	// Prefixo duplicado deve abortar imediatamente.
	if err := os.WriteFile(filepath.Join(dir, "010_conflito.sql"), []byte("SELECT 3;\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := listarMigrations(dir); err == nil {
		t.Fatal("esperava erro para prefixo numerico duplicado")
	}
}

func TestValidarConteudoMigration(t *testing.T) {
	okSQL := "DO $$\nBEGIN\n  PERFORM 1;\nEND $$;\n"
	if err := validarConteudoMigration("140_valida.sql", okSQL); err != nil {
		t.Fatalf("DO block valido nao deveria falhar: %v", err)
	}

	casosInvalidos := []struct {
		nome string
		sql  string
	}{
		{"140_vazia.sql", "   \n"},
		{"140_crlf.sql", "SELECT 1;\r\n"},
		{"140_begin.sql", "BEGIN;\nSELECT 1;\nCOMMIT;\n"},
		{"140_commit.sql", "SELECT 1;\n  commit ;\n"},
		{"140_rollback.sql", "SELECT 1;\nROLLBACK;\n"},
	}

	for _, c := range casosInvalidos {
		if err := validarConteudoMigration(c.nome, c.sql); err == nil {
			t.Errorf("esperava rejeicao para %s", c.nome)
		}
	}
}

func TestMontarScriptExecucao(t *testing.T) {
	m := migrationFile{
		Numero:   140,
		Nome:     "140_teste.sql",
		Conteudo: "SELECT 'ok';",
		Checksum: strings.Repeat("a", 64),
	}

	script := montarScriptExecucao(m, true)
	trechosObrigatorios := []string{
		"BEGIN;",
		"SELECT pg_advisory_xact_lock(748291034);",
		"WHERE arquivo = '140_teste.sql'",
		"SELECT 'ok';",
		"INSERT INTO public.schema_migrations (arquivo, checksum) VALUES ('140_teste.sql', '" + m.Checksum + "') ON CONFLICT (arquivo) DO NOTHING;",
		"COMMIT;",
	}
	for _, trecho := range trechosObrigatorios {
		if !strings.Contains(script, trecho) {
			t.Errorf("script nao contem trecho esperado %q\n%s", trecho, script)
		}
	}
}

func TestSQLMigrationsDoRepositorio_Integridade(t *testing.T) {
	sqlDir := filepath.Join("..", "..", "sql")
	lista, err := listarMigrations(sqlDir)
	if err != nil {
		t.Fatalf("falha ao validar sql/ do repositorio: %v", err)
	}
	if len(lista) == 0 {
		t.Fatal("nenhuma migration encontrada em sql/")
	}

	for _, m := range lista {
		if strings.Contains(m.Conteudo, "\r") {
			t.Errorf("%s contem CRLF; execute com LF", m.Nome)
		}
		if m.Numero > marcoInicialNumero {
			if err := validarConteudoMigration(m.Nome, m.Conteudo); err != nil {
				t.Errorf("migration gerenciada invalida: %v", err)
			}
		}
	}
}
