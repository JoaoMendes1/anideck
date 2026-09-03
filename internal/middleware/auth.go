package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"os"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"
const TokenKey contextKey = "jwtToken"
const AuthTimeKey contextKey = "authTime"

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
		if quando, ok := amrMaisRecente(claims); ok {
			ctx = context.WithValue(ctx, AuthTimeKey, quando)
		}
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

// amrMaisRecente devolve o instante da autenticação mais recente registrada no
// token. A claim amr lista cada método usado ({method, timestamp}); renovar o
// token NÃO cria entrada nova, então esse instante é prova de autenticação
// recente — ao contrário do iat, que muda a cada refresh automático.
//
// Devolve false quando o token não traz amr no formato detalhado. Quem depende
// disso deve tratar a ausência como "não reautenticado", nunca como liberado.
func amrMaisRecente(claims jwt.MapClaims) (time.Time, bool) {
	lista, ok := claims["amr"].([]interface{})
	if !ok {
		return time.Time{}, false
	}

	var maisRecente int64
	for _, item := range lista {
		entrada, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		ts, ok := entrada["timestamp"].(float64)
		if !ok {
			continue
		}
		if int64(ts) > maisRecente {
			maisRecente = int64(ts)
		}
	}

	if maisRecente == 0 {
		return time.Time{}, false
	}
	return time.Unix(maisRecente, 0), true
}