package handlers

import (
	"encoding/json"
	"testing"
)

func TestAvatarEscolhido(t *testing.T) {
	casos := map[string]bool{
		``:                  false,
		`null`:              false,
		`{}`:                false,
		`{"fundo":"cyber"}`: true,
	}
	for bruto, quer := range casos {
		if tem := avatarEscolhido(json.RawMessage(bruto)); tem != quer {
			t.Errorf("avatarEscolhido(%q) = %v, queria %v", bruto, tem, quer)
		}
	}
}
