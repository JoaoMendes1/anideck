package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLojaHandler_Validacoes(t *testing.T) {
	h := &LojaHandler{}

	// 1. Compra sem autenticação retorna 401
	reqComprar := httptest.NewRequest("POST", "/api/loja/moldura_cyber_holo/comprar", nil)
	wComprar := httptest.NewRecorder()
	h.HandleComprarItem(wComprar, reqComprar)
	if wComprar.Code != http.StatusUnauthorized {
		t.Fatalf("compra sem auth: esperava 401, recebeu %d", wComprar.Code)
	}

	// 2. Equipar sem autenticação retorna 401
	payloadEquipar := EquiparPayload{Slot: "moldura", ItemID: "moldura_cyber_holo"}
	bodyBytes, _ := json.Marshal(payloadEquipar)
	reqEquipar := httptest.NewRequest("PUT", "/api/loja/equipar", bytes.NewReader(bodyBytes))
	wEquipar := httptest.NewRecorder()
	h.HandleEquiparItem(wEquipar, reqEquipar)
	if wEquipar.Code != http.StatusUnauthorized {
		t.Fatalf("equipar sem auth: esperava 401, recebeu %d", wEquipar.Code)
	}

	// 3. Meus itens sem autenticação retorna 401
	reqMeus := httptest.NewRequest("GET", "/api/loja/meus-itens", nil)
	wMeus := httptest.NewRecorder()
	h.HandleMeusItens(wMeus, reqMeus)
	if wMeus.Code != http.StatusUnauthorized {
		t.Fatalf("meus itens sem auth: esperava 401, recebeu %d", wMeus.Code)
	}

	// 4. Admin salvar sem autenticação retorna 401
	item := StoreItem{ID: "teste", Tipo: "moldura", Nome: "Teste", Preco: 100, Estilo: "moldura-teste"}
	itemBytes, _ := json.Marshal(item)
	reqSalvar := httptest.NewRequest("POST", "/api/admin/loja/salvar", bytes.NewReader(itemBytes))
	wSalvar := httptest.NewRecorder()
	h.HandleAdminSalvarItem(wSalvar, reqSalvar)
	if wSalvar.Code != http.StatusUnauthorized {
		t.Fatalf("salvar sem auth: esperava 401, recebeu %d", wSalvar.Code)
	}

	// 5. Devolver sem autenticação retorna 401
	reqDevolver := httptest.NewRequest("POST", "/api/loja/moldura_cyber_holo/devolver", nil)
	wDevolver := httptest.NewRecorder()
	h.HandleDevolverItem(wDevolver, reqDevolver)
	if wDevolver.Code != http.StatusUnauthorized {
		t.Fatalf("devolver sem auth: esperava 401, recebeu %d", wDevolver.Code)
	}
}
