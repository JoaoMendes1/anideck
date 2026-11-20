-- 132_rpg_yoru_arqueiro_das_sombras.sql
-- Fase 18: Yoru, o Arqueiro das Sombras (Trevas), entra no elenco.
--
-- 1. rpg_personagem_existe(): a lista do elenco num lugar só. O CHECK de rpg_personagens e as
--    três funções do sql/123 (despertar, desbloquear e trocar) passam a usá-la; personagem
--    novo daqui em diante muda só ela e o CHECK.
-- 2. Classe arqueiro em rpg_classe_do_personagem() (antes no sql/121).
-- 3. Armas da classe: Arco Curto (Comum) e Arco Longo de Freixo (Raro) no Mercado; o Arco
--    Silvestre (Épico, sql/121), reservado para o arqueiro, é ativado.
-- 4. Conjunto Caçador Violeta, exclusivo do Yoru: 8 peças Lendárias de nível 40 (duas joias
--    à escolha), com receita na Forja. Os bônus de 2/4/6 peças moram no Go.
--
-- Depende do 121, 122, 123 e 130. Idempotente.

-- =============================================================================
-- 1. O elenco num lugar só
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_personagem_existe(p_base TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT p_base IN ('espadachim_eter', 'lanceiro_fogo', 'assassina_raio', 'maga_agua',
                    'guerreiro_terra', 'paladina_luz', 'arqueiro_trevas');
$$;

ALTER TABLE public.rpg_personagens
  DROP CONSTRAINT IF EXISTS rpg_personagens_base_valida;

ALTER TABLE public.rpg_personagens
  ADD CONSTRAINT rpg_personagens_base_valida CHECK (personagem_base IN (
    'espadachim_eter',  -- Espadachim de Éter (o primeiro)
    'lanceiro_fogo',    -- Haruto, Lanceiro de Fogo
    'assassina_raio',   -- Rin, Assassina do Raio
    'maga_agua',        -- Mizuki, Maga da Água
    'guerreiro_terra',  -- Brokk, Guerreiro da Terra
    'paladina_luz',     -- Celestia, Paladina da Luz
    'arqueiro_trevas'   -- Yoru, Arqueiro das Sombras
  ));

-- Definições vivas (antes no sql/123), iguais exceto pela validação do personagem.

CREATE OR REPLACE FUNCTION public.despertar_personagem(
  p_nome TEXT,
  p_base TEXT DEFAULT 'espadachim_eter'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_nome    TEXT := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_base    TEXT := coalesce(nullif(btrim(p_base), ''), 'espadachim_eter');
  v_linhas  INTEGER;
  v_atual   public.rpg_personagens%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF char_length(v_nome) < 2 OR char_length(v_nome) > 24 THEN
    RETURN jsonb_build_object('erro', 'O nome precisa ter de 2 a 24 caracteres.');
  END IF;

  IF v_nome ~ '[[:cntrl:]]' THEN
    RETURN jsonb_build_object('erro', 'O nome tem caracteres inválidos.');
  END IF;

  IF NOT public.rpg_personagem_existe(v_base) THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  INSERT INTO public.rpg_personagens (user_id, nome, personagem_base, desbloqueados)
  VALUES (v_user_id, v_nome, v_base, ARRAY[v_base])
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_linhas = ROW_COUNT;

  SELECT * INTO v_atual FROM public.rpg_personagens WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'criado', v_linhas > 0,
    'nome', v_atual.nome,
    'personagem_base', v_atual.personagem_base,
    'desbloqueados', to_jsonb(v_atual.desbloqueados)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.despertar_personagem(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.despertar_personagem(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 3. Desbloquear personagem adicional (400 Ouro)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_desbloquear_personagem(p_base TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_base          TEXT := btrim(coalesce(p_base, ''));
  v_preco         CONSTANT INTEGER := 400;
  v_personagem    public.rpg_personagens%ROWTYPE;
  v_desbloqueados TEXT[];
  v_ouro          INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT public.rpg_personagem_existe(v_base) THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  SELECT * INTO v_personagem
    FROM public.rpg_personagens
   WHERE user_id = v_user_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  v_desbloqueados := COALESCE(v_personagem.desbloqueados, ARRAY[v_personagem.personagem_base]);
  IF NOT (v_personagem.personagem_base = ANY(v_desbloqueados)) THEN
    v_desbloqueados := array_append(v_desbloqueados, v_personagem.personagem_base);
  END IF;

  IF v_base = ANY(v_desbloqueados) THEN
    RETURN jsonb_build_object('erro', 'Você já desbloqueou este personagem.');
  END IF;

  INSERT INTO public.rpg_recursos (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  SELECT COALESCE(ouro, 0) INTO v_ouro
    FROM public.rpg_recursos
   WHERE user_id = v_user_id
     FOR UPDATE;

  IF v_ouro < v_preco THEN
    RETURN jsonb_build_object('erro', format('Faltam %s de Ouro para desbloquear este personagem.', v_preco - v_ouro));
  END IF;

  UPDATE public.rpg_recursos
     SET ouro = ouro - v_preco,
         atualizado_em = now()
   WHERE user_id = v_user_id;

  v_desbloqueados := array_append(v_desbloqueados, v_base);

  UPDATE public.rpg_personagens
     SET desbloqueados = v_desbloqueados
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'desbloqueado', v_base,
    'desbloqueados', to_jsonb(v_desbloqueados),
    'ouro', v_ouro - v_preco
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_desbloquear_personagem(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_desbloquear_personagem(TEXT) TO authenticated;

-- =============================================================================
-- 4. Trocar personagem desbloqueado (grátis a cada 24h, ou 150 Ouro antecipado)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_trocar_personagem(
  p_base       TEXT,
  p_antecipado BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_base            TEXT := btrim(coalesce(p_base, ''));
  v_cooldown_horas  CONSTANT INTEGER := 24;
  v_preco_antecip   CONSTANT INTEGER := 150;
  v_personagem      public.rpg_personagens%ROWTYPE;
  v_desbloqueados   TEXT[];
  v_em_espera       BOOLEAN;
  v_restante_min    INTEGER;
  v_horas           INTEGER;
  v_minutos         INTEGER;
  v_texto_espera    TEXT;
  v_ouro            INTEGER;
  v_ouro_gasto      INTEGER := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'Não autenticado');
  END IF;

  IF NOT public.rpg_personagem_existe(v_base) THEN
    RETURN jsonb_build_object('erro', 'Personagem desconhecido.');
  END IF;

  SELECT * INTO v_personagem
    FROM public.rpg_personagens
   WHERE user_id = v_user_id
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro', 'Desperte o seu personagem primeiro.');
  END IF;

  IF v_personagem.personagem_base = v_base THEN
    RETURN jsonb_build_object('ok', true, 'trocado', false, 'personagem_base', v_base);
  END IF;

  v_desbloqueados := COALESCE(v_personagem.desbloqueados, ARRAY[v_personagem.personagem_base]);
  IF NOT (v_personagem.personagem_base = ANY(v_desbloqueados)) THEN
    v_desbloqueados := array_append(v_desbloqueados, v_personagem.personagem_base);
  END IF;

  IF NOT (v_base = ANY(v_desbloqueados)) THEN
    RETURN jsonb_build_object('erro', 'Desbloqueie este personagem com Ouro antes de jogar com ele.');
  END IF;

  v_em_espera := v_personagem.ultima_troca_em IS NOT NULL
    AND (v_personagem.ultima_troca_em + make_interval(hours => v_cooldown_horas)) > now();

  IF v_em_espera THEN
    IF NOT COALESCE(p_antecipado, false) THEN
      v_restante_min := GREATEST(
        1,
        ceil(extract(epoch FROM ((v_personagem.ultima_troca_em + make_interval(hours => v_cooldown_horas)) - now())) / 60.0)::integer
      );
      v_horas := v_restante_min / 60;
      v_minutos := v_restante_min % 60;
      IF v_horas > 0 AND v_minutos > 0 THEN
        v_texto_espera := format('%sh %smin', v_horas, v_minutos);
      ELSIF v_horas > 0 THEN
        v_texto_espera := format('%sh', v_horas);
      ELSE
        v_texto_espera := format('%smin', v_minutos);
      END IF;
      RETURN jsonb_build_object(
        'erro',
        format('Troca gratuita disponível em %s, ou troque agora por %s Ouro.', v_texto_espera, v_preco_antecip)
      );
    END IF;

    INSERT INTO public.rpg_recursos (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

    SELECT COALESCE(ouro, 0) INTO v_ouro
      FROM public.rpg_recursos
     WHERE user_id = v_user_id
       FOR UPDATE;

    IF v_ouro < v_preco_antecip THEN
      RETURN jsonb_build_object('erro', format('Faltam %s de Ouro para trocar antes do tempo.', v_preco_antecip - v_ouro));
    END IF;

    UPDATE public.rpg_recursos
       SET ouro = ouro - v_preco_antecip,
           atualizado_em = now()
     WHERE user_id = v_user_id;

    v_ouro_gasto := v_preco_antecip;
  END IF;

  UPDATE public.rpg_personagens
     SET personagem_base = v_base,
         visual_equipado = NULL,
         ultima_troca_em = now()
   WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'trocado', true,
    'personagem_base', v_base,
    'ouro_gasto', v_ouro_gasto,
    'ultima_troca_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpg_trocar_personagem(TEXT, BOOLEAN) TO authenticated;

-- =============================================================================
-- 2. Classe do personagem (antes no sql/121)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpg_classe_do_personagem(p_base TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_base
    WHEN 'lanceiro_fogo'   THEN 'lanceiro'
    WHEN 'assassina_raio'  THEN 'assassina'
    WHEN 'maga_agua'       THEN 'maga'
    WHEN 'guerreiro_terra' THEN 'guerreiro'
    WHEN 'paladina_luz'    THEN 'paladina'
    WHEN 'arqueiro_trevas' THEN 'arqueiro'
    ELSE 'espadachim'
  END;
$$;

-- Material que as peças do Caçador Violeta devolvem ao serem desmontadas (antes no sql/130)
CREATE OR REPLACE FUNCTION public.rpg_material_do_conjunto(p_conjunto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE p_conjunto
    WHEN 'glacial'         THEN 'cristal_de_gelo'
    WHEN 'carmesim'        THEN 'cristal_de_fogo'
    WHEN 'aurora'          THEN 'cristal_de_luz'
    WHEN 'sombrio'         THEN 'cristal_do_vazio'
    WHEN 'arcano'          THEN 'nucleo_da_tempestade'
    WHEN 'silvestre'       THEN 'gema_silvestre'
    WHEN 'terra'           THEN 'chifre_de_fera'
    WHEN 'primordial'      THEN 'nucleo_da_tempestade'
    WHEN 'cacador_violeta' THEN 'cristal_do_vazio'
    ELSE 'pena_celeste'
  END;
$$;

-- =============================================================================
-- 3 e 4. Arcos e o conjunto Caçador Violeta
-- =============================================================================

UPDATE public.rpg_itens
   SET classes = ARRAY['arqueiro']::TEXT[], ativo = true,
       descricao = 'Vivo: ainda brota folhas na primavera.'
 WHERE id = 'arco_silvestre' AND NOT ativo;

INSERT INTO public.rpg_itens (id, slot, nome, descricao, raridade, vida, ataque, defesa, magia, velocidade,
                              critico_por_mil, dano_critico, esquiva_por_mil, nivel_minimo, classes,
                              personagem_exclusivo, conjunto, elemento, preco_ouro, inicial, ativo, ordem)
VALUES
  ('arco_curto', 'arma', 'Arco Curto', 'Madeira flexível e corda de linho; o primeiro arco de quem aprende a mirar.', 'comum', 0, 3, 0, 0, 1, 25, 0, 0, 1, ARRAY['arqueiro']::TEXT[], NULL, NULL, NULL, 35, false, true, 500),
  ('arco_longo_de_freixo', 'arma', 'Arco Longo de Freixo', 'Alcança o inimigo antes que ele veja de onde veio a flecha.', 'raro', 0, 15, 0, 0, 1, 40, 0, 0, 12, ARRAY['arqueiro']::TEXT[], NULL, NULL, 'trevas', 240, false, true, 501),
  ('arco_do_eter_sombrio', 'arma', 'Arco do Éter Sombrio', 'Lâminas nas pontas e um cristal violeta no punho; a corda vibra com o Éter Sombrio.', 'lendario', 0, 44, 0, 0, 2, 50, 14, 0, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 502),
  ('capuz_do_cacador_violeta', 'elmo', 'Capuz do Caçador Violeta', 'Esconde o rosto e deixa só o brilho dos olhos à vista.', 'lendario', 160, 0, 0, 0, 0, 30, 0, 30, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 503),
  ('couraca_das_sombras', 'armadura', 'Couraça das Sombras', 'Placas escuras com cristais violeta; leve o bastante para correr entre as árvores.', 'lendario', 200, 0, 20, 0, 0, 0, 0, 30, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 504),
  ('manoplas_do_cacador', 'luvas', 'Manoplas do Caçador', 'Protegem os dedos da corda e firmam a mira no último instante.', 'lendario', 0, 9, 0, 0, 0, 50, 0, 0, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 505),
  ('manto_violeta', 'capa', 'Manto Violeta', 'Rasgado nas pontas de tanto atravessar a mata; some na sombra junto com quem o veste.', 'lendario', 80, 0, 8, 0, 0, 0, 0, 60, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 506),
  ('botas_das_sombras', 'botas', 'Botas das Sombras', 'Não fazem barulho nem em chão de pedra.', 'lendario', 0, 0, 0, 0, 8, 0, 0, 40, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 507),
  ('colar_da_flecha_sombria', 'joia', 'Colar da Flecha Sombria', 'Uma ponta de flecha de cristal que nunca errou o alvo.', 'lendario', 0, 16, 0, 0, 0, 0, 18, 0, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 508),
  ('anel_do_eter_sombrio', 'joia', 'Anel do Éter Sombrio', 'Uma estrela violeta presa em prata escura; guia a flecha para a fresta da armadura.', 'lendario', 0, 10, 0, 0, 0, 40, 0, 0, 40, NULL, 'arqueiro_trevas', 'cacador_violeta', 'trevas', NULL, false, true, 509)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rpg_receitas (item_id, ouro, materiais)
SELECT i.id, 1500, jsonb_build_object('cristal_do_vazio', 8, 'cranio_de_fera', 3, 'escama_de_dragao', 2)
  FROM public.rpg_itens i
 WHERE i.conjunto = 'cacador_violeta' AND i.ativo
ON CONFLICT (item_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Como conferir
-- =============================================================================
--
-- SELECT public.rpg_personagem_existe('arqueiro_trevas'), public.rpg_classe_do_personagem('arqueiro_trevas');
--   true, arqueiro
-- SELECT id, slot, raridade, personagem_exclusivo FROM public.rpg_itens
--  WHERE conjunto = 'cacador_violeta' OR 'arqueiro' = ANY (classes) ORDER BY ordem;
--   11 linhas (8 do conjunto e 3 arcos)
