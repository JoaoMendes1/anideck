package ia

import "testing"

func TestLerRespostaGroq(t *testing.T) {
	texto, err := lerRespostaGroq([]byte(`{"choices":[{"message":{"role":"assistant","content":" {\"sinopse\":\"Texto\",\"tags\":[]} "}}]}`))
	if err != nil {
		t.Fatalf("não esperava erro: %v", err)
	}
	if texto != `{"sinopse":"Texto","tags":[]}` {
		t.Errorf("texto inesperado: %q", texto)
	}
}

func TestLerRespostaGroq_Recusas(t *testing.T) {
	for _, bruto := range []string{`lixo`, `{"choices":[]}`, `{"choices":[{"message":{"content":"  "}}]}`} {
		if _, err := lerRespostaGroq([]byte(bruto)); err == nil {
			t.Errorf("%s deveria ser recusado", bruto)
		}
	}
}