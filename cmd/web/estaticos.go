package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// servirEstaticos entrega o build do Vite (client/dist). Qualquer caminho que não seja
// um arquivo cai no index.html, que é o que faz um F5 em /deck ou /anime/123 funcionar:
// quem resolve a rota é o React Router, não o servidor.
//
// O cabeçalho de cache depende do que está sendo entregue:
//
//   - /assets/*: o Vite põe um hash no nome (index-MRoy7_FZ.js). Um deploy novo gera
//     outro nome, então o conteúdo de um nome nunca muda. O navegador pode guardar
//     por um ano sem nem perguntar ao servidor.
//   - Todo o resto (index.html, sw.js, manifest.json, o fallback da SPA): no-cache.
//     O navegador guarda, mas confere a cada visita. É o index.html que aponta para
//     os nomes novos; se ele ficasse preso em cache, o usuário continuaria na versão
//     antiga depois do deploy.
//
// O immutable só vai para arquivo que EXISTE. Depois de um deploy, um navegador pode
// pedir um /assets antigo, que já não existe e cai no fallback. Se o index.html
// servido ali levasse immutable, ele ficaria um ano no lugar daquele JS.
//
// Pasta também cai no fallback. Antes, http.ServeFile num caminho como /assets/
// listava o conteúdo da pasta para quem pedisse.
func servirEstaticos(dir string) http.HandlerFunc {
	indice := filepath.Join(dir, "index.html")

	return func(w http.ResponseWriter, r *http.Request) {
		caminho := filepath.Join(dir, r.URL.Path)

		info, err := os.Stat(caminho)
		if err != nil || info.IsDir() {
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFile(w, r, indice)
			return
		}

		if strings.HasPrefix(r.URL.Path, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-cache")
		}
		http.ServeFile(w, r, caminho)
	}
}
