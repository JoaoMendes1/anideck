package handlers

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/go-chi/chi/v5"
)

// capaPNG gera uma capa de mentira com a largura pedida, na proporção de pôster (2:3).
func capaPNG(t *testing.T, largura int) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, largura, largura*3/2))
	for x := 0; x < largura; x++ {
		img.Set(x, x, color.RGBA{R: 200, A: 255})
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// montar sobe um "Storage" falso e um roteador com o handler apontando para ele.
// O contador diz quantas vezes o Storage foi consultado.
func montar(t *testing.T, arquivos map[string][]byte) (http.Handler, *int32) {
	t.Helper()
	var consultas int32
	storage := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&consultas, 1)
		conteudo, ok := arquivos[r.URL.Path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		w.Write(conteudo)
	}))
	t.Cleanup(storage.Close)

	h := NovoMiniaturaHandler(storage.URL + "/")
	r := chi.NewRouter()
	r.Get("/api/miniatura/*", h.HandleMiniatura)
	return r, &consultas
}

func pedir(roteador http.Handler, caminho string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	roteador.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, caminho, nil))
	return rec
}

func TestMiniaturaReduzCapaGrande(t *testing.T) {
	roteador, consultas := montar(t, map[string][]byte{"/imagens/grande.png": capaPNG(t, 600)})

	rec := pedir(roteador, "/api/miniatura/imagens/grande.png")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, esperado 200", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); got != "image/jpeg" {
		t.Errorf("Content-Type = %q, esperado image/jpeg", got)
	}
	if got := rec.Header().Get("Cache-Control"); got != "public, max-age=31536000, immutable" {
		t.Errorf("Cache-Control = %q", got)
	}
	img, err := jpeg.Decode(rec.Body)
	if err != nil {
		t.Fatalf("resposta não é um JPEG válido: %v", err)
	}
	if l, a := img.Bounds().Dx(), img.Bounds().Dy(); l != larguraMiniatura || a != 600 {
		t.Errorf("miniatura com %dx%d, esperado %dx600 (proporção mantida)", l, a, larguraMiniatura)
	}

	// Segunda vez: sai da memória, sem ir ao Storage de novo.
	pedir(roteador, "/api/miniatura/imagens/grande.png")
	if n := atomic.LoadInt32(consultas); n != 1 {
		t.Errorf("Storage consultado %d vezes, esperado 1", n)
	}
}

func TestMiniaturaRedirecionaQuandoNaoHaGanho(t *testing.T) {
	roteador, _ := montar(t, map[string][]byte{"/imagens/pequena.png": capaPNG(t, 300)})

	rec := pedir(roteador, "/api/miniatura/imagens/pequena.png")
	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, esperado 302 para a original", rec.Code)
	}
}

func TestMiniaturaRedirecionaQuandoStorageFalha(t *testing.T) {
	roteador, _ := montar(t, map[string][]byte{})

	rec := pedir(roteador, "/api/miniatura/imagens/sumiu.webp")
	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d, esperado 302: a capa não pode sumir por falha da miniatura", rec.Code)
	}
}

func TestMiniaturaRecusaCaminhoForaDoPadrao(t *testing.T) {
	roteador, consultas := montar(t, map[string][]byte{})

	for _, caminho := range []string{
		"/api/miniatura/imagens/../../segredo.webp",
		"/api/miniatura/imagens/capa.svg",
		"/api/miniatura/imagens/capa",
	} {
		if rec := pedir(roteador, caminho); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, esperado 400", caminho, rec.Code)
		}
	}
	if n := atomic.LoadInt32(consultas); n != 0 {
		t.Errorf("Storage consultado %d vezes com caminho inválido, esperado 0", n)
	}
}
