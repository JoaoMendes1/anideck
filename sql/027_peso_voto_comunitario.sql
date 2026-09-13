-- 027_peso_voto_comunitario.sql
-- Move o pesoVotoComunitario do const no ranking.go para app_settings.
--
-- Aplicar DEPOIS do deploy: sem a linha o Go cai no padrão 350.0, que é o valor
-- atual, então a ordem inversa não quebra nada -- só adianta a linha para um
-- código que ainda não a lê. Aplicar antes também é seguro.
--
-- Escrita já é restrita a is_admin() pelo sql/016; leitura é pública, que é como
-- o motor de ranking (sem JWT) consegue ler.

INSERT INTO app_settings (key, value, updated_at)
VALUES ('ranking_peso_voto_comunitario', '350', now())
ON CONFLICT (key) DO NOTHING;