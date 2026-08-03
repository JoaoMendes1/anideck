package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

// contextKey evita colisão com outras chaves de contexto no projeto
type contextKey string

const UserIDKey contextKey = "userID"

// jwks é carregado uma vez e cacheado — a própria lib atualiza sozinha em segundo plano
var jwks keyfunc.Keyfunc

// InitJWKS busca as chaves públicas da Supabase. Chamar uma vez, no main.go, no boot.
func InitJWKS(supabaseURL string) error {
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)

	k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
	if err != nil {
		return fmt.Errorf("erro ao carregar JWKS da Supabase: %w", err)
	}
	jwks = k
	return nil
}

// RequireAuth verifica o token de cada requisição e injeta o user_id validado no contexto.
// Handlers NUNCA devem confiar em um user_id vindo do corpo da requisição — só deste contexto.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Token de autenticação ausente", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, jwks.Keyfunc)
		if err != nil || !token.Valid {
			http.Error(w, "Token inválido ou expirado", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Não foi possível ler os dados do token", http.StatusUnauthorized)
			return
		}

		// "sub" é o padrão JWT para o ID do usuário — a Supabase preenche isso automaticamente
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Token não contém identificação de usuário", http.StatusUnauthorized)
			return
		}

		// Injeta o ID JÁ VALIDADO no contexto — o handler lê daqui, nunca do corpo da requisição
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
	
}

// RequireAdmin é um escudo extra. Ele só deixa a requisição passar se o usuário logado
// for o dono do ADMIN_USER_ID definido no .env.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Pegamos o ID do usuário que já foi validado pelo middleware RequireAuth
		userID, ok := r.Context().Value(UserIDKey).(string)

		// 2. Pegamos o ID do dono do site lá do .env
		adminID := os.Getenv("ADMIN_USER_ID")

		// 3. Se não for o dono do site, barramos na mesma hora com um Erro 403 (Proibido)
		if !ok || userID != adminID {
			http.Error(w, "Acesso negado: apenas o administrador tem permissão de curadoria", http.StatusForbidden)
			return
		}

		// 4. Se for você mesmo, abrimos a porta e deixamos a requisição seguir para salvar o anime
		next.ServeHTTP(w, r)
	})
}
