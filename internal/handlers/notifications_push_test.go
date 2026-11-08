package handlers

import (
	"encoding/json"
	"testing"
)

func TestMontarPayloadPush_TituloComAspasGeraJSONValido(t *testing.T) {
	bruto, err := montarPayloadPush(`"Oshi no Ko" \ Temporada 2`, 52034, 7, "https://img/x.jpg")
	if err != nil {
		t.Fatalf("não esperava erro: %v", err)
	}
	var p map[string]string
	if err := json.Unmarshal(bruto, &p); err != nil {
		t.Fatalf("payload não é JSON válido: %v (%s)", err, bruto)
	}
	if p["title"] != `"Oshi no Ko" \ Temporada 2` {
		t.Errorf("título alterado: %q", p["title"])
	}
	if p["url"] != "/anime/52034" || p["tag"] != "ep-52034-7" || p["image"] != "https://img/x.jpg" {
		t.Errorf("campos inesperados: %+v", p)
	}
}
