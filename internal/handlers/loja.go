package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/middleware"
	"github.com/go-chi/chi/v5"
	postgrest "github.com/supabase-community/postgrest-go"
)

type StoreItem struct {
	ID        string    `json:"id"`
	Tipo      string    `json:"tipo"`
	Nome      string    `json:"nome"`
	Descricao string    `json:"descricao"`
	Preco     int       `json:"preco"`
	Raridade  string    `json:"raridade"`
	Estilo    string    `json:"estilo"`
	Icone     string    `json:"icone"`
	Ativo     bool      `json:"ativo"`
	Ordem     int       `json:"ordem"`
	JaPossui  bool      `json:"ja_possui"`
	Equipado  bool      `json:"equipado"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}

type UserEquippedItem struct {
	Slot       string `json:"slot"`
	ItemID     string `json:"item_id"`
	Estilo     string `json:"estilo,omitempty"`
	EquipadoEm string `json:"equipado_em,omitempty"`
}

type LojaHandler struct{}

// HandleListarLoja lista os itens ativos da loja, cruzando com posse e equipados do usuário se logado.
func (h *LojaHandler) HandleListarLoja(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)

	var client = database.Client
	if token != "" {
		if c, err := database.ClientWithToken(token); err == nil {
			client = c
		}
	}
	if client == nil {
		responderErroJSON(w, http.StatusServiceUnavailable, "Banco de dados indisponível")
		return
	}

	data, _, err := client.From("store_items").
		Select("id,tipo,nome,descricao,preco,raridade,estilo,icone,ativo,ordem", "", false).
		Eq("ativo", "true").
		Order("ordem", &postgrest.OrderOpts{Ascending: true}).
		Execute()

	if err != nil {
		log.Printf("[LOJA] Erro ao buscar itens da loja: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao carregar catálogo da loja")
		return
	}

	var itens []StoreItem
	if err := json.Unmarshal(data, &itens); err != nil {
		log.Printf("[LOJA] Erro ao deserializar itens: %v", err)
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de dados")
		return
	}

	// Se o usuário estiver logado, busca seus itens comprados e equipados
	if userID != "" {
		meusMap := make(map[string]bool)
		equipadosMap := make(map[string]bool)

		dadosItens, _, errPosse := client.From("user_items").
			Select("item_id", "", false).
			Eq("user_id", userID).
			Execute()
		if errPosse == nil {
			var linhasPosse []struct {
				ItemID string `json:"item_id"`
			}
			if json.Unmarshal(dadosItens, &linhasPosse) == nil {
				for _, lp := range linhasPosse {
					meusMap[lp.ItemID] = true
				}
			}
		}

		dadosEq, _, errEq := client.From("user_equipped").
			Select("item_id", "", false).
			Eq("user_id", userID).
			Execute()
		if errEq == nil {
			var linhasEq []struct {
				ItemID string `json:"item_id"`
			}
			if json.Unmarshal(dadosEq, &linhasEq) == nil {
				for _, le := range linhasEq {
					equipadosMap[le.ItemID] = true
				}
			}
		}

		for i := range itens {
			itens[i].JaPossui = meusMap[itens[i].ID]
			itens[i].Equipado = equipadosMap[itens[i].ID]
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"itens": itens,
		"total": len(itens),
	})
}

// HandleComprarItem executa a RPC comprar_item com o token autenticado.
func (h *LojaHandler) HandleComprarItem(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	itemID := strings.TrimSpace(chi.URLParam(r, "id"))
	if itemID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do item cosmético não fornecido")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("comprar_item", "", map[string]interface{}{
		"p_item_id": itemID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") || strings.Contains(resRaw, "P000") {
		log.Printf("[LOJA] Erro ao comprar item (%s): %s", itemID, resRaw)
		switch {
		case strings.Contains(resRaw, "P0005") || strings.Contains(resRaw, "Apoiadores"):
			responderErroJSON(w, http.StatusForbidden, "Este item é exclusivo para Apoiadores ativos do AniDeck. Conheça as opções no menu Seja um Apoiador para desbloquear!")
		case strings.Contains(resRaw, "saldo_insuficiente") || strings.Contains(resRaw, "P0004") || strings.Contains(resRaw, "Saldo insuficiente"):
			responderErroJSON(w, http.StatusUnprocessableEntity, "Saldo insuficiente de AniCoins.")
		case strings.Contains(resRaw, "ja_possui") || strings.Contains(resRaw, "P0003") || strings.Contains(resRaw, "já possui"):
			responderErroJSON(w, http.StatusConflict, "Você já possui este item cosmético no seu inventário.")
		case strings.Contains(resRaw, "P0002") || strings.Contains(resRaw, "inexistente"):
			responderErroJSON(w, http.StatusNotFound, "Item não encontrado ou indisponível na loja.")
		default:
			msg := "Falha ao processar a compra do item."
			if idx := strings.Index(resRaw, "message\":\""); idx != -1 {
				fim := strings.Index(resRaw[idx+10:], "\"")
				if fim != -1 {
					msg = resRaw[idx+10 : idx+10+fim]
				}
			}
			responderErroJSON(w, http.StatusBadRequest, msg)
		}
		return
	}

	var resultado map[string]interface{}
	if err := json.Unmarshal([]byte(resRaw), &resultado); err != nil {
		// Se já for string ou objeto plano
		resultado = map[string]interface{}{
			"sucesso":  true,
			"item_id":  itemID,
			"mensagem": "Item adquirido com sucesso!",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleDevolverItem processa a devolução de um cosmético com reembolso parcial.
func (h *LojaHandler) HandleDevolverItem(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	itemID := strings.TrimSpace(chi.URLParam(r, "id"))
	if itemID == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID do item cosmético não fornecido")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("devolver_item", "", map[string]interface{}{
		"p_item_id": itemID,
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") || strings.Contains(resRaw, "P000") {
		log.Printf("[LOJA] Erro ao devolver item (%s): %s", itemID, resRaw)
		switch {
		case strings.Contains(resRaw, "P0006") || strings.Contains(resRaw, "desativada"):
			responderErroJSON(w, http.StatusForbidden, "A devolução de cosméticos está temporariamente desativada pela administração.")
		case strings.Contains(resRaw, "P0007") || strings.Contains(resRaw, "não possui"):
			responderErroJSON(w, http.StatusNotFound, "Você não possui este item cosmético no seu inventário.")
		case strings.Contains(resRaw, "P0008") || strings.Contains(resRaw, "gratuitos"):
			responderErroJSON(w, http.StatusBadRequest, "Itens promocionais ou de apoiador não geram reembolso em AniCoins.")
		case strings.Contains(resRaw, "P0002"):
			responderErroJSON(w, http.StatusNotFound, "Item cosmético não encontrado.")
		default:
			msg := "Não foi possível processar a devolução deste item."
			if idx := strings.Index(resRaw, "message\":\""); idx != -1 {
				fim := strings.Index(resRaw[idx+10:], "\"")
				if fim != -1 {
					msg = resRaw[idx+10 : idx+10+fim]
				}
			}
			responderErroJSON(w, http.StatusBadRequest, msg)
		}
		return
	}

	var resultado map[string]interface{}
	if err := json.Unmarshal([]byte(resRaw), &resultado); err != nil {
		resultado = map[string]interface{}{
			"sucesso":  true,
			"item_id":  itemID,
			"mensagem": "Item devolvido com sucesso!",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

type EquiparPayload struct {
	Slot   string `json:"slot"`
	ItemID string `json:"item_id"`
}

// HandleEquiparItem equipa ou desequipa um item cosmético em um slot específico.
func (h *LojaHandler) HandleEquiparItem(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	var body EquiparPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	slot := strings.TrimSpace(body.Slot)
	if slot != "moldura" && slot != "tema_perfil" && slot != "cor_nome" && slot != "emblema" {
		responderErroJSON(w, http.StatusBadRequest, "Slot inválido. Use moldura, tema_perfil, cor_nome ou emblema.")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	resRaw := strings.TrimSpace(client.Rpc("equipar_item", "", map[string]interface{}{
		"p_slot":    slot,
		"p_item_id": strings.TrimSpace(body.ItemID),
	}))

	if strings.Contains(resRaw, "error") || strings.Contains(resRaw, "code") || strings.Contains(resRaw, "Exception") || strings.Contains(resRaw, "P000") {
		log.Printf("[LOJA] Erro ao equipar item (%s em %s): %s", body.ItemID, slot, resRaw)
		if strings.Contains(resRaw, "P0004") || strings.Contains(resRaw, "não possui") {
			responderErroJSON(w, http.StatusForbidden, "Você não possui este item cosmético.")
			return
		}
		responderErroJSON(w, http.StatusBadRequest, "Falha ao equipar item cosmético.")
		return
	}

	var resultado map[string]interface{}
	if err := json.Unmarshal([]byte(resRaw), &resultado); err != nil {
		resultado = map[string]interface{}{"sucesso": true, "slot": slot, "item_id": body.ItemID}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resultado)
}

// HandleMeusItens retorna todos os itens comprados e atualmente equipados pelo usuário logado.
func (h *LojaHandler) HandleMeusItens(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	token, _ := r.Context().Value(middleware.TokenKey).(string)
	if !ok || userID == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	// 1. Itens comprados
	dataItens, _, errItens := client.From("user_items").
		Select("item_id, adquirido_em, store_items(id, tipo, nome, descricao, raridade, estilo, icone, preco)", "", false).
		Eq("user_id", userID).
		Execute()

	if errItens != nil {
		log.Printf("[LOJA] Erro ao buscar user_items: %v", errItens)
		responderErroJSON(w, http.StatusInternalServerError, "Erro ao buscar itens do usuário")
		return
	}

	var listaPosse []struct {
		ItemID       string    `json:"item_id"`
		AdquiridoEm  string    `json:"adquirido_em"`
		StoreItemRef StoreItem `json:"store_items"`
	}
	_ = json.Unmarshal(dataItens, &listaPosse)

	// 2. Itens equipados
	dataEq, _, _ := client.From("user_equipped").
		Select("slot, item_id, equipado_em, store_items(id, tipo, estilo)", "", false).
		Eq("user_id", userID).
		Execute()

	var listaEq []struct {
		Slot         string `json:"slot"`
		ItemID       string `json:"item_id"`
		EquipadoEm   string `json:"equipado_em"`
		StoreItemRef struct {
			Estilo string `json:"estilo"`
		} `json:"store_items"`
	}
	_ = json.Unmarshal(dataEq, &listaEq)

	equipados := make(map[string]map[string]string)
	for _, eq := range listaEq {
		equipados[eq.Slot] = map[string]string{
			"item_id": eq.ItemID,
			"estilo":  eq.StoreItemRef.Estilo,
		}
	}

	meusItens := make([]StoreItem, 0, len(listaPosse))
	for _, lp := range listaPosse {
		item := lp.StoreItemRef
		if item.ID == "" {
			item.ID = lp.ItemID
		}
		item.JaPossui = true
		if eq, ok := equipados[item.Tipo]; ok && eq["item_id"] == item.ID {
			item.Equipado = true
		}
		meusItens = append(meusItens, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"itens":     meusItens,
		"equipados": equipados,
	})
}

// HandleAdminSalvarItem cria ou edita item cosmético no catálogo da loja (só admin).
func (h *LojaHandler) HandleAdminSalvarItem(w http.ResponseWriter, r *http.Request) {
	token, ok := r.Context().Value(middleware.TokenKey).(string)
	if !ok || token == "" {
		responderErroJSON(w, http.StatusUnauthorized, "Não autorizado")
		return
	}

	var item StoreItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		responderErroJSON(w, http.StatusBadRequest, "Corpo inválido")
		return
	}

	item.ID = strings.TrimSpace(item.ID)
	item.Nome = strings.TrimSpace(item.Nome)
	item.Tipo = strings.TrimSpace(item.Tipo)
	item.Estilo = strings.TrimSpace(item.Estilo)

	if item.ID == "" || item.Nome == "" || item.Preco <= 0 || item.Estilo == "" {
		responderErroJSON(w, http.StatusBadRequest, "ID, Nome, Preço (> 0) e Estilo são obrigatórios.")
		return
	}

	client, err := database.ClientWithToken(token)
	if err != nil {
		responderErroJSON(w, http.StatusInternalServerError, "Erro interno de conexão")
		return
	}

	linha := map[string]interface{}{
		"id":        item.ID,
		"tipo":      item.Tipo,
		"nome":      item.Nome,
		"descricao": item.Descricao,
		"preco":     item.Preco,
		"raridade":  item.Raridade,
		"estilo":    item.Estilo,
		"icone":     item.Icone,
		"ativo":     item.Ativo,
		"ordem":     item.Ordem,
	}

	_, _, errUpsert := client.From("store_items").
		Upsert(linha, "id", "minimal", "").
		Execute()

	if errUpsert != nil {
		log.Printf("[LOJA ADMIN] Erro ao salvar item da loja: %v", errUpsert)
		responderErroJSON(w, http.StatusInternalServerError, "Falha ao gravar item da loja")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sucesso":  true,
		"mensagem": fmt.Sprintf("Item '%s' salvo com sucesso!", item.Nome),
	})
}
