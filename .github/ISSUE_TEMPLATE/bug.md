---
name: Bug
about: Algo que deveria funcionar e não funciona
title: "fix: "
labels: bug
---

<!-- Antes de salvar, no painel ao lado: as labels de área. Se o bug for uma falha de
segurança, adicione security. -->

### 🐞 Sintoma

<!-- O que aparece para quem usa, exatamente como aparece: mensagem, tela, código HTTP. -->

### 🔁 Como reproduzir

1. Passo 1
2. Passo 2

### 🔍 Causa

<!-- Preencha quando descobrir. É a parte que mais ensina, e a que some se não for escrita. -->

### ⚠️ Armadilhas em jogo

<!-- Itens do docs/PITFALLS.md que este bug toca, com a resposta à pergunta de cada um. -->

### 📋 Tarefas

- [ ] Corrigir a causa, não só o sintoma
- [ ] Avaliar se vira item do `docs/PITFALLS.md` (falhou em silêncio? pode voltar?)

### ✅ Critérios de aceite

- [ ] O passo a passo acima não reproduz mais o problema
- [ ] Teste unitário que falharia antes da correção, se a causa estiver em handler, validação
      ou cálculo
- [ ] Conferido no site publicado depois do deploy
