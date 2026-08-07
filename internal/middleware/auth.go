package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"os"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"
const TokenKey contextKey = "jwtToken" 

var jwks keyfunc.Keyfunc

func InitJWKS(supabaseURL string) error {
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)

	k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
	if err != nil {
		return fmt.Errorf("erro ao carregar JWKS da Supabase: %w", err)
	}
	jwks = k
	return nil
}

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

		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Token não contém identificação de usuário", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, TokenKey, tokenString) 
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := r.Context().Value(UserIDKey).(string)
		adminID := os.Getenv("ADMIN_USER_ID")

		if !ok || userID != adminID {
			http.Error(w, "Acesso negado: apenas o administrador tem permissão de curadoria", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}