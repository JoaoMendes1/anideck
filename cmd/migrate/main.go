package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

const (
	// advisoryLockID evita execucao concorrente de migrations entre dois deploys simultaneos.
	advisoryLockID = int64(748291034)
	// marcoInicialNumero marca o ultimo SQL aplicado manualmente antes da automacao na VPS.
	marcoInicialNumero = 138
	defaultMigrations  = "/app/sql"
)

var (
	padraoNomeMigration = regexp.MustCompile(`^([0-9]{3})_[a-zA-Z0-9_]+\.sql$`)
	padraoTxTopo        = regexp.MustCompile(`(?im)^\s*(BEGIN(?:\s+(?:TRANSACTION|WORK))?|COMMIT(?:\s+(?:TRANSACTION|WORK))?|ROLLBACK(?:\s+(?:TRANSACTION|WORK))?)\s*;`)
)

type migrationFile struct {
	Numero   int
	Nome     string
	Caminho  string
	Conteudo string
	Checksum string
}

func main() {
	if err := executar(os.Getenv); err != nil {
		fmt.Fprintf(os.Stderr, "migrate: erro: %v\n", err)
		os.Exit(1)
	}
}

func executar(getenv func(string) string) error {
	dbURL := strings.TrimSpace(getenv("DATABASE_URL"))
	if dbURL == "" {
		return errors.New("variavel obrigatoria DATABASE_URL ausente")
	}

	dir := strings.TrimSpace(getenv("MIGRATIONS_DIR"))
	if dir == "" {
		dir = defaultMigrations
	}

	migrations, err := listarMigrations(dir)
	if err != nil {
		return err
	}
	if len(migrations) == 0 {
		return fmt.Errorf("nenhuma migration encontrada em %s", dir)
	}

	// Valida formato e ausencia de controle transacional manual em arquivos >= marco + 1.
	for _, m := range migrations {
		if m.Numero > marcoInicialNumero {
			if err := validarConteudoMigration(m.Nome, m.Conteudo); err != nil {
				return err
			}
		}
	}

	if err := garantirTabelaMigrations(dbURL); err != nil {
		return fmt.Errorf("bootstrap schema_migrations: %w", err)
	}

	if err := registrarBaselineSeNecessario(dbURL, migrations); err != nil {
		return fmt.Errorf("baseline automatico: %w", err)
	}

	aplicadas, err := carregarMigrationsAplicadas(dbURL)
	if err != nil {
		return fmt.Errorf("leitura de schema_migrations: %w", err)
	}

	for _, m := range migrations {
		checksumAplicado, jaAplicada := aplicadas[m.Nome]
		if jaAplicada {
			if checksumAplicado != "baseline" && checksumAplicado != m.Checksum {
				return fmt.Errorf(
					"checksum divergente na migration ja aplicada %s (esperado %s, atual %s); migrations aplicadas sao imutaveis",
					m.Nome, checksumAplicado, m.Checksum,
				)
			}
			continue
		}

		// Arquivos <= marcoInicialNumero so entram via baseline no banco ja populado;
		// em banco vazio, eles precisam rodar em ordem antes dos novos.
		if m.Numero > marcoInicialNumero {
			if err := validarConteudoMigration(m.Nome, m.Conteudo); err != nil {
				return err
			}
		}

		fmt.Printf("migrate: aplicando %s...\n", m.Nome)
		script := montarScriptExecucao(m, true)
		if _, err := rodarPsqlStdin(dbURL, script); err != nil {
			return fmt.Errorf("falha ao aplicar %s: %w", m.Nome, err)
		}
		fmt.Printf("migrate: %s aplicada com sucesso\n", m.Nome)
	}

	fmt.Println("migrate: banco sincronizado com sucesso")
	return nil
}

func listarMigrations(dir string) ([]migrationFile, error) {
	entradas, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("leitura do diretorio %s: %w", dir, err)
	}

	var lista []migrationFile
	porNumero := make(map[int]string)

	for _, entrada := range entradas {
		if entrada.IsDir() {
			continue
		}
		nome := entrada.Name()
		matches := padraoNomeMigration.FindStringSubmatch(nome)
		if matches == nil {
			continue
		}

		numero, err := strconv.Atoi(matches[1])
		if err != nil {
			return nil, fmt.Errorf("prefixo numerico invalido em %s: %w", nome, err)
		}
		if existente, dup := porNumero[numero]; dup {
			return nil, fmt.Errorf("prefixo %03d duplicado entre %s e %s", numero, existente, nome)
		}
		porNumero[numero] = nome

		caminho := filepath.Join(dir, nome)
		raw, err := os.ReadFile(caminho)
		if err != nil {
			return nil, fmt.Errorf("leitura de %s: %w", nome, err)
		}

		soma := sha256.Sum256(raw)
		lista = append(lista, migrationFile{
			Numero:   numero,
			Nome:     nome,
			Caminho:  caminho,
			Conteudo: string(raw),
			Checksum: hex.EncodeToString(soma[:]),
		})
	}

	sort.Slice(lista, func(i, j int) bool {
		return lista[i].Numero < lista[j].Numero
	})
	return lista, nil
}

func validarConteudoMigration(nome, sqlText string) error {
	if strings.TrimSpace(sqlText) == "" {
		return fmt.Errorf("%s: arquivo vazio", nome)
	}
	if strings.Contains(sqlText, "\r") {
		return fmt.Errorf("%s: fim de linha CRLF detectado; use LF", nome)
	}
	if padraoTxTopo.MatchString(sqlText) {
		return fmt.Errorf("%s: nao inclua BEGIN/COMMIT/ROLLBACK no arquivo; o executor envolve cada migration em transacao unica", nome)
	}
	return nil
}

func montarScriptExecucao(m migrationFile, aplicarGuard bool) string {
	var b strings.Builder
	nomeEsc := escaparLiteralSQL(m.Nome)
	checksumEsc := escaparLiteralSQL(m.Checksum)

	b.WriteString("BEGIN;\n")
	fmt.Fprintf(&b, "SELECT pg_advisory_xact_lock(%d);\n", advisoryLockID)
	if aplicarGuard {
		b.WriteString("DO $$\nBEGIN\n")
		fmt.Fprintf(&b, "  IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE arquivo = '%s') THEN\n", nomeEsc)
		fmt.Fprintf(&b, "    RAISE EXCEPTION 'migration ja aplicada: %%', '%s';\n", nomeEsc)
		b.WriteString("  END IF;\nEND $$;\n")
	}
	b.WriteString(m.Conteudo)
	if !strings.HasSuffix(m.Conteudo, "\n") {
		b.WriteByte('\n')
	}
	fmt.Fprintf(
		&b,
		"INSERT INTO public.schema_migrations (arquivo, checksum) VALUES ('%s', '%s') ON CONFLICT (arquivo) DO NOTHING;\n",
		nomeEsc, checksumEsc,
	)
	b.WriteString("COMMIT;\n")
	return b.String()
}

func garantirTabelaMigrations(dbURL string) error {
	const sqlBootstrap = `
BEGIN;
SELECT pg_advisory_xact_lock(748291034);
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  arquivo     TEXT PRIMARY KEY,
  checksum    TEXT NOT NULL,
  aplicado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.schema_migrations TO service_role;
COMMIT;
`
	_, err := rodarPsqlStdin(dbURL, sqlBootstrap)
	return err
}

func registrarBaselineSeNecessario(dbURL string, migrations []migrationFile) error {
	const sqlCheck = `
SELECT
  (to_regclass('public.rpg_personagens') IS NOT NULL)::text || '|' ||
  EXISTS (
    SELECT 1 FROM public.schema_migrations
    WHERE substring(arquivo FROM '^[0-9]{3}')::int <= 138
  )::text;
`
	out, err := rodarPsqlQuery(dbURL, sqlCheck)
	if err != nil {
		return err
	}
	partes := strings.Split(strings.TrimSpace(out), "|")
	if len(partes) != 2 {
		return fmt.Errorf("resposta inesperada ao verificar baseline: %q", strings.TrimSpace(out))
	}
	bancoPopulado := partes[0] == "true"
	temMarcoAplicado := partes[1] == "true"
	if !bancoPopulado || temMarcoAplicado {
		return nil
	}

	var b strings.Builder
	b.WriteString("BEGIN;\n")
	fmt.Fprintf(&b, "SELECT pg_advisory_xact_lock(%d);\n", advisoryLockID)
	count := 0
	for _, m := range migrations {
		if m.Numero > marcoInicialNumero {
			continue
		}
		fmt.Fprintf(
			&b,
			"INSERT INTO public.schema_migrations (arquivo, checksum) VALUES ('%s', 'baseline') ON CONFLICT (arquivo) DO NOTHING;\n",
			escaparLiteralSQL(m.Nome),
		)
		count++
	}
	b.WriteString("COMMIT;\n")

	if count == 0 {
		return nil
	}
	if _, err := rodarPsqlStdin(dbURL, b.String()); err != nil {
		return err
	}
	fmt.Printf("migrate: baseline registrado para %d migrations historicas (<= %03d)\n", count, marcoInicialNumero)
	return nil
}

func carregarMigrationsAplicadas(dbURL string) (map[string]string, error) {
	out, err := rodarPsqlQuery(dbURL, "SELECT arquivo || '|' || checksum FROM public.schema_migrations ORDER BY arquivo;")
	if err != nil {
		return nil, err
	}
	aplicadas := make(map[string]string)
	for _, linha := range strings.Split(out, "\n") {
		linha = strings.TrimSpace(linha)
		if linha == "" {
			continue
		}
		partes := strings.SplitN(linha, "|", 2)
		if len(partes) != 2 {
			return nil, fmt.Errorf("linha invalida em schema_migrations: %q", linha)
		}
		aplicadas[partes[0]] = partes[1]
	}
	return aplicadas, nil
}

func escaparLiteralSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func rodarPsqlStdin(dbURL, script string) (string, error) {
	cmd := exec.Command("psql", "-X", "-v", "ON_ERROR_STOP=1", "-d", dbURL, "-f", "-")
	cmd.Env = append(os.Environ(), "PGCONNECT_TIMEOUT=15")
	cmd.Stdin = strings.NewReader(script)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return "", errors.New(msg)
	}
	return stdout.String(), nil
}

func rodarPsqlQuery(dbURL, query string) (string, error) {
	cmd := exec.Command("psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", dbURL, "-c", query)
	cmd.Env = append(os.Environ(), "PGCONNECT_TIMEOUT=15")

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = err.Error()
		}
		return "", errors.New(msg)
	}
	return stdout.String(), nil
}
