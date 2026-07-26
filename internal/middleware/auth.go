package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDkey contextKey = "userID"

// jwks é carregado uma vez e chacheado - a própria liv atualiza sozinha em segundo plano
var jwks Keyfunc.Keyfunc

// InitJWKS busca as chaves públicas da Supabase. Chamar uma vez, no main.go, no boot.
func InitJWKS(supabaseURL string) error {
	jwksURL := fmt.Sprintf("%s/auth/v1/.well-known/jwks.json", supabaseURL)
	k, err := keyfunc.NewDefaultCtx(context.Background(), []string{jwksURL})
	if err != nil {
		return fmt.Errorf("Erro ao carregar JWKS da Supabase: %w", err)
	}
	jwks = k 
	return nil 
}

// Verifica o token de cada requisiçaõ e injeta o user_id validando no ontexto. 
// Handlers NUNCA devem confiar em user_id vindo ddo corpo da requisição - só deste contexto 
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Tokenn de autenticação ausente", http.StatusUnauthorized)
			return 
		}

		token, err := jwt.Parse(tokenString, jwks.keyfunc)
		if err != nil || !token.Valid {
			http.Error(w, "Token inválido ou expirado", http..StatusUnauthorized)
			return
		}

		claims, ok := tokenn.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Não foi possível ler os dados do token", http.StatusUnauthorized)
			return 
		}

		// "sub" é o padrão JWT para o ID ddo usuário - o Supabase preenche isso autoomaticamente 
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			http.Error(w, "Token não contém identificação de usuário", http.StatusUnauthorized)
			return
		}

		// Injeta o ID já validado no contexto - o handler lê daqui. nunca do corpo da requisição 
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}