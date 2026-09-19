-- 035_olheiro_tags.sql
-- Tira os pesos do Olheiro de dentro do código Go e leva para o banco.
--
-- Hoje o `tagsDesejadas` é um map literal no olheiro.go: mudar um peso, ou parar
-- de procurar "Cultivation", exige editar Go e fazer deploy. O próprio comentário
-- da variável já antecipava esta mudança.
--
-- O QUE ESTA TABELA **NÃO** GUARDA: o nome de exibição. Ele já vive na
-- genre_taxonomy.display_name_pt, e repetir aqui criaria duas fontes para o mesmo
-- fato — a Armadilha 19 reaparecendo na camada de dados. O motivo da sugestão
-- ("Tem isekai, magia") passa a sair de um JOIN.
--
-- REMOÇÃO DE RÓTULO: ON DELETE RESTRICT. Se o Olheiro tem peso num rótulo, a
-- taxonomia não deixa removê-lo — o admin desativa o peso primeiro. A alternativa
-- (cascata) faria o scan encolher em silêncio, e ninguém perceberia até vir vazio.

-- =============================================================================
-- 1. As quatro tags que o Olheiro usa e nunca foram cadastradas
--
-- Descoberto ao conferir o map contra a tabela: Isekai, Magic, Female Harem e
-- Martial Arts existem; estas quatro não. São `tag_tematica`, que a view de
-- afinidade exclui de propósito — foi justamente por isso que nasceram no código.
-- =============================================================================
INSERT INTO public.genre_taxonomy (raw_name, display_name_pt, tier) VALUES
  ('Level Up',    'Progressão', 'tag_tematica'),
  ('Dungeon',     'Dungeon',    'tag_tematica'),
  ('Guilds',      'Guildas',    'tag_tematica'),
  ('Cultivation', 'Cultivo',    'tag_tematica')
ON CONFLICT (raw_name) DO UPDATE
  SET display_name_pt = EXCLUDED.display_name_pt,
      tier            = EXCLUDED.tier;

-- =============================================================================
-- 2. A tabela
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.olheiro_tags (
  raw_name TEXT PRIMARY KEY
    REFERENCES public.genre_taxonomy(raw_name)
    ON UPDATE CASCADE      -- rótulo renomeado leva o peso junto
    ON DELETE RESTRICT,    -- rótulo em uso não pode ser removido
  peso     NUMERIC(3,1) NOT NULL CHECK (peso > 0),
  ativo    BOOLEAN      NOT NULL DEFAULT true
);

COMMENT ON TABLE public.olheiro_tags IS
  'Pesos do Agente Olheiro. O nome de exibição vem de genre_taxonomy.display_name_pt.';

-- =============================================================================
-- 3. RLS
--
-- O scan roda com o JWT do admin (ver comentário do HandleScan), então is_admin()
-- cobre leitura e escrita. Não existe caminho de cron nem chave secreta aqui.
-- =============================================================================
ALTER TABLE public.olheiro_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "olheiro_tags_admin" ON public.olheiro_tags;
CREATE POLICY "olheiro_tags_admin"
  ON public.olheiro_tags
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 4. Seed — os oito pesos que hoje estão no olheiro.go, sem alterar nenhum
--
-- DO NOTHING de propósito: se este arquivo rodar de novo depois de você ajustar
-- um peso pela tela, o ajuste sobrevive.
-- =============================================================================
INSERT INTO public.olheiro_tags (raw_name, peso) VALUES
  ('Isekai',       3.0),
  ('Level Up',     3.0),
  ('Magic',        2.0),
  ('Dungeon',      2.0),
  ('Guilds',       2.0),
  ('Female Harem', 1.5),
  ('Cultivation',  1.5),
  ('Martial Arts', 1.0)
ON CONFLICT (raw_name) DO NOTHING;

-- =============================================================================
-- CONFERÊNCIA
-- =============================================================================
-- Esperado: 8 linhas, todas com display_name_pt preenchido.
-- SELECT o.raw_name, o.peso, o.ativo, t.display_name_pt
-- FROM public.olheiro_tags o
-- JOIN public.genre_taxonomy t ON t.raw_name = o.raw_name
-- ORDER BY o.peso DESC, o.raw_name;
--
-- A trava funcionando. Esperado: erro de violação de chave estrangeira.
-- DELETE FROM public.genre_taxonomy WHERE raw_name = 'Isekai';