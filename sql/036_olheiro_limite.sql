-- 036_olheiro_limite.sql
-- Tira o último número do Olheiro de dentro do código.
--
-- O limiteSugestoesPorScan é `const` no olheiro.go: quantos candidatos o scan
-- grava por execução. Menos que isso deixa a aba vazia; mais vira lista que
-- ninguém revisa — e o ponto de equilíbrio muda conforme o catálogo cresce.
--
-- Mesmo padrão do peso_voto_comunitario e do beta_signup_limit: app_settings
-- guarda valor como TEXT, e o Go converte.

INSERT INTO public.app_settings (key, value)
VALUES ('olheiro_limite_sugestoes', '10')
ON CONFLICT (key) DO NOTHING;