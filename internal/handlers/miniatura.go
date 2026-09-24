package handlers

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png" // registra o PNG no image.Decode, para capas antigas que não são WebP
	"io"
	"log"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp" // registra o WebP no image.Decode: é o formato do upload
)

// larguraMiniatura é a largura entregue aos cards. Eles aparecem com ~150 a 220 px na
// tela; 400 px deixa a capa nítida em tela de alta densidade (2x) sem trafegar a
// original, que sai do upload com até 600 px e 300 KB.
//
// É uma largura só, de propósito. Aceitar qualquer largura pela URL deixaria alguém
// encher a memória do servidor pedindo 1, 2, 3... pixels da mesma capa.
const larguraMiniatura = 400

// maxMiniaturasEmMemoria limita o que fica guardado. A curadoria tem pouco mais de
// cem capas e cada miniatura tem poucas dezenas de KB: o teto folgado dá dezenas de
// MB no pior caso, numa VPS com 6 GB.
const maxMiniaturasEmMemoria = 1000

// caminhoDeCapa aceita só o formato dos arquivos do bucket (imagens/abc123.webp).
// Sem ponto fora da extensão, não há como montar um "../" e sair do bucket.
var caminhoDeCapa = regexp.MustCompile(`^[A-Za-z0-9_/-]+\.(webp|jpe?g|png)$`)

// MiniaturaHandler entrega as capas da curadoria reduzidas para os cards.
//
// A original continua intacta no Supabase: ela é o dado insubstituível do projeto e
// segue sendo usada em Detalhes, onde a capa é grande. A miniatura é gerada sob demanda
// na primeira vez que alguém pede, guardada em memória, e vai para o navegador com
// cache de um ano. Um deploy novo zera a memória; a próxima visita gera de novo, o que
// leva milissegundos por capa.
type MiniaturaHandler struct {
	origem  string // URL pública do bucket, terminando em "/"
	cliente *http.Client

	mu      sync.Mutex
	prontas map[string][]byte // caminho -> JPEG; slice vazio = "a original já é pequena"
}

func NovoMiniaturaHandler(origem string) *MiniaturaHandler {
	return &MiniaturaHandler{
		origem:  origem,
		cliente: &http.Client{Timeout: 10 * time.Second},
		prontas: make(map[string][]byte),
	}
}

func (h *MiniaturaHandler) HandleMiniatura(w http.ResponseWriter, r *http.Request) {
	caminho := chi.URLParam(r, "*")
	if !caminhoDeCapa.MatchString(caminho) {
		http.Error(w, "Caminho de capa inválido", http.StatusBadRequest)
		return
	}
	original := h.origem + caminho

	h.mu.Lock()
	pronta, jaTem := h.prontas[caminho]
	h.mu.Unlock()

	if !jaTem {
		var err error
		pronta, err = h.gerar(r.Context(), original)
		if err != nil {
			// Falhar aqui não pode sumir com a capa: manda o navegador para a original.
			log.Printf("[MINIATURA] %s: %v (servindo a original)", caminho, err)
			http.Redirect(w, r, original, http.StatusFound)
			return
		}
		h.mu.Lock()
		if len(h.prontas) < maxMiniaturasEmMemoria {
			h.prontas[caminho] = pronta
		}
		h.mu.Unlock()
	}

	if len(pronta) == 0 {
		http.Redirect(w, r, original, http.StatusFound)
		return
	}

	// O nome de cada capa é sorteado no upload (ver PainelAdmin): trocar a capa gera
	// outra URL. Então o conteúdo de uma URL nunca muda e o cache pode ser de um ano.
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Write(pronta)
}

// gerar baixa a original e devolve a miniatura em JPEG. Devolve um slice vazio quando
// a original já é estreita o bastante: reduzir não ganharia nada.
//
// JPEG e não WebP porque a biblioteca padrão do Go só codifica JPEG e PNG, e o
// golang.org/x/image só decodifica WebP. Em 400 px, um JPEG de qualidade 80 fica
// na casa das dezenas de KB, que é o que importa aqui.
func (h *MiniaturaHandler) gerar(ctx context.Context, original string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, original, nil)
	if err != nil {
		return nil, err
	}
	resp, err := h.cliente.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("storage respondeu %d", resp.StatusCode)
	}

	// Limite de 10 MB na leitura: uma capa real tem no máximo 300 KB, e o teto evita
	// que um arquivo anômalo no bucket consuma memória sem fim.
	img, _, err := image.Decode(io.LimitReader(resp.Body, 10<<20))
	if err != nil {
		return nil, fmt.Errorf("decodificando: %w", err)
	}

	limites := img.Bounds()
	if limites.Dx() <= larguraMiniatura {
		return []byte{}, nil
	}
	altura := limites.Dy() * larguraMiniatura / limites.Dx()
	destino := image.NewRGBA(image.Rect(0, 0, larguraMiniatura, altura))
	// CatmullRom é o redimensionamento de melhor qualidade do pacote. É o mais lento,
	// mas roda uma vez por capa e o resultado fica em memória.
	draw.CatmullRom.Scale(destino, destino.Bounds(), img, limites, draw.Src, nil)

	var saida bytes.Buffer
	if err := jpeg.Encode(&saida, destino, &jpeg.Options{Quality: 80}); err != nil {
		return nil, fmt.Errorf("codificando: %w", err)
	}
	return saida.Bytes(), nil
}
