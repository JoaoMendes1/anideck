package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/config"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/handlers"
	"github.com/JoaoMendes1/anideck/internal/middleware"
)

func main() {
	if err := config.LoadAndValidateEnv(); err != nil {
		log.Fatalf("Erro crítico no boot: %v", err)
	}
	if err := database.Connect(); err != nil {
		log.Fatalf("Erro crítico ao conectar ao banco de dados: %v", err)
	}
	log.Println("Conexão com o banco de dados estabelecida!")
	// O Kill Switch vive em memória para ser instantâneo, mas é gravado em app_settings
	// para sobreviver a um restart. Sem esta leitura ele voltaria a false toda vez que o
	// serviço subisse — e no free tier do Render isso acontece a cada hibernação, então
	// o painel mostraria "ligado" enquanto o backend já estaria consultando a AniList.
	if data, _, err := database.Client.From("app_settings").
		Select("value", "exact", false).
		Eq("key", "anilist_force_offline").
		Execute(); err == nil {
		var linhas []struct {
			Value string `json:"value"`
		}
		if err := json.Unmarshal(data, &linhas); err == nil && len(linhas) > 0 {
			if linhas[0].Value == "true" {
				anilist.SetForceOffline(true)
				log.Println("[BOOT] Kill Switch estava ativo: AniList em modo offline forçado.")
			}
		}
	} else {
		log.Printf("[BOOT] Não foi possível ler o estado do Kill Switch: %v", err)
	}

	if err := middleware.InitJWKS(os.Getenv("SUPABASE_URL")); err != nil {
		log.Fatalf("Erro crítico ao carregar JWKS: %v", err)
	}

	var anilistService anilist.Service

	if os.Getenv("MOCK_ANILIST") == "true" {
		log.Println("[MOCK] Inicializando Mock Client para a AniList (Sem consumo real de API)")
		anilistService = anilist.NewMockClient()
	} else {
		anilistService = anilist.NewClient()
	}
	go handlers.StartRankingEngine(anilistService)

	searchHandler := &handlers.SearchHandler{AniListClient: anilistService}
	animeHandler := &handlers.AnimeHandler{AniListClient: anilistService}

	// AQUI ESTAVA O ERRO NO MAIN.GO: Voltando ao normal!
	entriesHandler := &handlers.EntriesHandler{}

	statsHandler := &handlers.StatsHandler{}
	rankingHandler := &handlers.RankingHandler{AniListClient: anilistService}
	curationHandler := &handlers.CurationHandler{AniListClient: anilistService}
	systemHandler := &handlers.SystemHandler{}
	accountHandler := &handlers.AccountHandler{}
	notificationsHandler := &handlers.NotificationsHandler{AniListClient: anilistService}
	metadataHandler := &handlers.MetadataHandler{AniListClient: anilistService}
	olheiroHandler := &handlers.OlheiroHandler{AniListClient: anilistService}
	diagnosticoHandler := &handlers.DiagnosticoHandler{}
	taxonomiaHandler := &handlers.TaxonomiaHandler{}
	trilhasHandler := &handlers.TrilhasHandler{}
	filaIAHandler := &handlers.FilaIAHandler{}
	guildaHandler := &handlers.GuildaHandler{}
	comunidadeHandler := &handlers.ComunidadeHandler{}
	economiaHandler := &handlers.EconomiaHandler{}
	missoesHandler := &handlers.MissoesHandler{}
	lojaHandler := &handlers.LojaHandler{}
	cartasHandler := &handlers.CartasHandler{}
	rankingsComunidadeHandler := &handlers.RankingsComunidadeHandler{}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Capas curadas em tamanho de card (ver miniatura.go). Pública como as próprias
	// capas: o bucket curadoria já é público, e a miniatura não revela nada além dele.
	miniaturaHandler := handlers.NovoMiniaturaHandler(os.Getenv("SUPABASE_URL") + "/storage/v1/object/public/curadoria/")
	r.Get("/api/miniatura/*", miniaturaHandler.HandleMiniatura)

	r.Get("/api/search", searchHandler.HandleSearch)
	r.Get("/api/taxonomia", taxonomiaHandler.HandleListarRotulos)
	r.Get("/api/trilhas", trilhasHandler.HandleListarPublicas)
	r.Get("/api/anime/{id}", animeHandler.HandleGetAnime)
	r.Get("/api/anime/{id}/statistics", animeHandler.HandleGetStats)
	// Comunidade (Fase 15): só contagens e perfis públicos, sem conteúdo de comentário
	r.Get("/api/anime/{id}/conversa", comunidadeHandler.HandleContagemConversa)
	r.Get("/api/membros/ranking", comunidadeHandler.HandleRankingMembros)
	r.Get("/api/membros/{handle}", comunidadeHandler.HandlePerfilPublico)
	r.Get("/api/ranking", rankingHandler.HandleGetTopAnime)
	r.Get("/api/curation", curationHandler.HandleList)
	r.Get("/api/loja", lojaHandler.HandleListarLoja)
	r.Get("/api/apoiador", economiaHandler.HandleGetApoiador)
	r.Get("/api/membros/{handle}/cartas", cartasHandler.HandleCartasDoMembro)
	r.Get("/api/membros/{handle}/personagens", cartasHandler.HandlePersonagensDoMembro)
	r.Get("/api/membros/{a}/duelo/{b}", cartasHandler.HandleDueloDeGosto)
	r.Get("/api/membros/ranking/genero", rankingsComunidadeHandler.HandleRankingGenero)
	r.With(middleware.OptionalAuth).Get("/api/rankings/clima", rankingsComunidadeHandler.HandleClimaTemporada)
	r.Post("/api/anime/bulk", animeHandler.HandleGetAnimesByIDs)
	r.Post("/api/beta/request-invite", notificationsHandler.HandleRequestBetaInvite)
	r.Post("/api/internal/check-new-episodes", notificationsHandler.HandleCheckNewEpisodes)

	r.Group(func(protegido chi.Router) {
		protegido.Use(middleware.RequireAuth)

		protegido.Get("/api/entries", entriesHandler.HandleList)
		protegido.Get("/api/entries/progresso", entriesHandler.HandleResumoProgresso)
		protegido.Post("/api/entries", entriesHandler.HandleCreate)
		protegido.Post("/api/entries/import/mal", entriesHandler.HandleImportMAL)
		protegido.Put("/api/entries/{id}", entriesHandler.HandleUpdate)
		protegido.Delete("/api/entries/{id}", entriesHandler.HandleDelete)

		protegido.Get("/api/entries/{mal_id}/episodes", entriesHandler.HandleGetEpisodes)
		protegido.Post("/api/entries/{mal_id}/episodes/{number}", entriesHandler.HandleMarkEpisode)
		protegido.Delete("/api/entries/{mal_id}/episodes/{number}", entriesHandler.HandleUnmarkEpisode)
		protegido.Delete("/api/entries/{mal_id}/episodes", entriesHandler.HandleClearEpisodes)

		protegido.Post("/api/push/subscribe", notificationsHandler.HandleSubscribePush)
		protegido.Get("/api/notifications", notificationsHandler.HandleGetNotifications)
		protegido.Put("/api/notifications/read-all", notificationsHandler.HandleReadAllNotifications)
		protegido.Put("/api/notifications/{id}/read", notificationsHandler.HandleReadNotification)

		protegido.Get("/api/stats/user", statsHandler.HandleGetUserStats)
		// Drill-down: os animes por trás de uma barra do gráfico de afinidade, ano, nota ou status
		protegido.Get("/api/stats/genre", statsHandler.HandleGetGenreAnimes)
		protegido.Get("/api/stats/year", statsHandler.HandleGetYearAnimes)
		protegido.Get("/api/stats/rating", statsHandler.HandleGetRatingAnimes)
		protegido.Get("/api/stats/status", statsHandler.HandleGetStatusAnimes)

		protegido.Get("/api/guilda/resumo", guildaHandler.HandleResumoGuilda)
		protegido.Get("/api/guilda", guildaHandler.HandleGetGuilda)
		protegido.Get("/api/economia/carteira", economiaHandler.HandleGetCarteira)

		// Missões Diárias (Fase 16, #168): sorteio determinístico e resgate de AniCoins
		protegido.Get("/api/missoes/hoje", missoesHandler.HandleGetMissoesHoje)
		protegido.Post("/api/missoes/{id}/resgatar", missoesHandler.HandleResgatarMissao)

		// Loja Cosmética (Fase 16, #170 e #171): compra, devolução, equipar e catálogo do usuário
		protegido.Post("/api/loja/{id}/comprar", lojaHandler.HandleComprarItem)
		protegido.Post("/api/loja/{id}/devolver", lojaHandler.HandleDevolverItem)
		protegido.Put("/api/loja/equipar", lojaHandler.HandleEquiparItem)
		protegido.Get("/api/loja/meus-itens", lojaHandler.HandleMeusItens)

		// Cartas Colecionáveis e Personagens Favoritos (Fase 16, #172, #173, #174)
		protegido.Get("/api/cartas", cartasHandler.HandleMinhasCartas)
		protegido.Get("/api/personagens-favoritos", cartasHandler.HandleGetPersonagensFavoritos)
		protegido.Post("/api/personagens-favoritos", cartasHandler.HandleFavoritarPersonagem)
		protegido.Delete("/api/personagens-favoritos/{id}", cartasHandler.HandleDesfavoritarPersonagem)

		// Comunidade: perfil público, Mana e Vitalidade, conversa por episódio.
		// O escudo de spoiler é a RLS do sql/041; aqui tudo usa o token de quem pede.
		protegido.Get("/api/comunidade/eu", comunidadeHandler.HandleGetEu)
		protegido.Put("/api/comunidade/eu", comunidadeHandler.HandleSalvarEu)
		protegido.Post("/api/comunidade/descanso", comunidadeHandler.HandleAtivarDescanso)
		protegido.Get("/api/comunidade/bloqueios", comunidadeHandler.HandleListarBloqueios)
		protegido.Post("/api/comunidade/bloqueios/{handle}", comunidadeHandler.HandleBloquear)
		protegido.Delete("/api/comunidade/bloqueios/{handle}", comunidadeHandler.HandleBloquear)
		protegido.Get("/api/anime/{id}/episodios/{n}/conversa", comunidadeHandler.HandleConversaDoEpisodio)
		protegido.Post("/api/anime/{id}/episodios/{n}/comentarios", comunidadeHandler.HandleComentar)
		protegido.Put("/api/anime/{id}/episodios/{n}/reacoes/{reacao}", comunidadeHandler.HandleReagir)
		protegido.Delete("/api/anime/{id}/episodios/{n}/reacoes/{reacao}", comunidadeHandler.HandleReagir)
		protegido.Delete("/api/comunidade/comentarios/{cid}", comunidadeHandler.HandleApagarComentario)
		protegido.Post("/api/comunidade/comentarios/{cid}/curtida", comunidadeHandler.HandleCurtir)
		protegido.Delete("/api/comunidade/comentarios/{cid}/curtida", comunidadeHandler.HandleCurtir)
		protegido.Post("/api/comunidade/comentarios/{cid}/denuncia", comunidadeHandler.HandleDenunciar)
		protegido.Get("/api/membros/liga", rankingsComunidadeHandler.HandleLigaSemanal)

		protegido.Delete("/api/account", accountHandler.HandleDeleteAccount)
	})

	r.Group(func(admin chi.Router) {
		admin.Use(middleware.RequireAuth)
		admin.Use(middleware.RequireAdmin)
		// Toda escrita do admin descarta a curadoria em cache (ver curation_utils.go).
		admin.Use(handlers.InvalidaCuradoriaDepois)

		admin.Get("/api/admin/verify", func(w http.ResponseWriter, req *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"admin": true}`))
		})

		// Rotas de CRUD da curadoria
		admin.Post("/api/curation", curationHandler.HandleCreate)
		admin.Put("/api/curation/{id}", curationHandler.HandleUpdate)
		admin.Delete("/api/curation/{id}", curationHandler.HandleDelete)
		admin.Post("/api/admin/curation/auto-import-episodes", curationHandler.HandleAutoImportEpisodes)

		// Reprocessa o cache de metadados do deck inteiro (tags, ano de estreia, etc)
		admin.Post("/api/admin/metadata/resync", metadataHandler.HandleResyncMetadata)

		admin.Post("/api/admin/curation/ai/rewrite", curationHandler.HandleAIRewrite)
		admin.Get("/api/admin/settings/ai-prompt", curationHandler.HandleGetAIPrompt)
		admin.Put("/api/admin/settings/ai-prompt", curationHandler.HandleUpdateAIPrompt)
		// Status do Sistema (Infra/AniList)
		admin.Get("/api/admin/system/status", systemHandler.HandleGetSystemStatus)
		admin.Post("/api/admin/system/kill-switch", systemHandler.HandleToggleKillSwitch)

		admin.Post("/api/admin/system/testar-anilist", systemHandler.HandleTestarAniList)

		// Painel de Controle: peso do voto local e recálculo sob demanda
		admin.Get("/api/admin/ranking/settings", systemHandler.HandleGetRankingSettings)
		admin.Put("/api/admin/ranking/settings", systemHandler.HandleUpdateRankingSettings)
		admin.Post("/api/admin/ranking/recalcular", systemHandler.HandleRecalcularRanking)

		// Diagnóstico: coisas que hoje só aparecem no SQL Editor
		admin.Get("/api/admin/diagnostico/rotulos-orfaos", diagnosticoHandler.HandleListarRotulosOrfaos)
		admin.Get("/api/admin/diagnostico/bucket", diagnosticoHandler.HandleUsoDoBucket)
		admin.Get("/api/admin/sistema/tarefas", diagnosticoHandler.HandleListarTarefasPeriodicas)
		admin.Post("/api/admin/sistema/tarefas/{nome}/executar", diagnosticoHandler.HandleExecutarTarefaPeriodica)

		// Correção de rótulos: listar os animes de uma tag órfã, renomear e remover
		// em lote, e cadastrar a entrada na taxonomia
		admin.Get("/api/admin/diagnostico/rotulos-orfaos/animes", diagnosticoHandler.HandleListarAnimesDoRotulo)
		admin.Post("/api/admin/diagnostico/tags/renomear", diagnosticoHandler.HandleRenomearTag)
		admin.Post("/api/admin/diagnostico/tags/remover", diagnosticoHandler.HandleRemoverTag)
		admin.Post("/api/admin/diagnostico/taxonomia", diagnosticoHandler.HandleCadastrarNaTaxonomia)

		admin.Get("/api/admin/diagnostico/taxonomia", diagnosticoHandler.HandleListarTaxonomia)
		admin.Post("/api/admin/diagnostico/taxonomia/remover", diagnosticoHandler.HandleRemoverDaTaxonomia)

		// Fila de curadoria assistida por IA (o worker processa; aqui se revisa)
		admin.Get("/api/admin/ia/fila", filaIAHandler.HandleListar)
		admin.Post("/api/admin/ia/fila", filaIAHandler.HandleEnfileirar)
		admin.Post("/api/admin/ia/fila/{id}/aplicar", filaIAHandler.HandleAplicar)
		admin.Post("/api/admin/ia/fila/{id}/descartar", filaIAHandler.HandleDescartar)
		admin.Get("/api/admin/ia/config", filaIAHandler.HandleGetConfig)
		admin.Put("/api/admin/ia/config", filaIAHandler.HandleUpdateConfig)

		// Trilhas curadas da home
		admin.Get("/api/admin/trilhas", trilhasHandler.HandleListarAdmin)
		admin.Put("/api/admin/trilhas", trilhasHandler.HandleSalvar)

		// Guilda & Gamificação: economia de XP, faixas F→SS, insígnias e auditoria
		admin.Get("/api/admin/guilda", guildaHandler.HandleGetAdminGuilda)
		admin.Put("/api/admin/guilda", guildaHandler.HandleSaveAdminGuilda)

		// Economia de AniCoins: carteira global, auditoria, ajuste manual e transferência (exclusivo admin)
		admin.Get("/api/admin/economia", economiaHandler.HandleGetAdminEconomia)
		admin.Put("/api/admin/economia", economiaHandler.HandleSaveAdminEconomia)
		admin.Post("/api/admin/economia/ajuste", economiaHandler.HandleAjusteManual)
		admin.Post("/api/admin/economia/caixa/sacar", economiaHandler.HandleSacarCaixaLoja)
		admin.Post("/api/admin/economia/transferir", economiaHandler.HandleTransferirAniCoins)
		admin.Get("/api/admin/economia/buscar-destinatario", economiaHandler.HandleBuscarDestinatario)
		admin.Put("/api/admin/apoiador", economiaHandler.HandleSalvarApoiador)
		admin.Post("/api/admin/membros/{id}/apoiador", economiaHandler.HandleSetApoiador)
		admin.Post("/api/admin/loja/salvar", lojaHandler.HandleAdminSalvarItem)

		// Agente Olheiro: scan sob demanda e revisão da fila de sugestões
		admin.Get("/api/admin/olheiro/tags", olheiroHandler.HandleListarTagsDesejadas)
		admin.Put("/api/admin/olheiro/tags", olheiroHandler.HandleSalvarTagDesejada)
		admin.Delete("/api/admin/olheiro/tags/{rawName}", olheiroHandler.HandleRemoverTagDesejada)
		admin.Get("/api/admin/olheiro/settings", olheiroHandler.HandleGetOlheiroSettings)
		admin.Put("/api/admin/olheiro/settings", olheiroHandler.HandleUpdateOlheiroSettings)
		admin.Get("/api/admin/olheiro/disponiveis", olheiroHandler.HandleListarRotulosDisponiveis)
		admin.Post("/api/admin/olheiro/scan", olheiroHandler.HandleScan)
		admin.Get("/api/admin/olheiro/sugestoes", olheiroHandler.HandleListarSugestoes)
		admin.Get("/api/admin/olheiro/demanda", olheiroHandler.HandleListarDemanda)
		admin.Patch("/api/admin/olheiro/sugestoes/{id}", olheiroHandler.HandleRevisarSugestao)

		// Comunidade: fila de denúncias e regras da Mana e da Vitalidade
		admin.Get("/api/admin/moderacao", comunidadeHandler.HandleListarModeracao)
		admin.Post("/api/admin/moderacao/{cid}", comunidadeHandler.HandleModerar)
		admin.Get("/api/admin/comunidade/regras", comunidadeHandler.HandleGetRegrasComunidade)
		admin.Put("/api/admin/comunidade/regras", comunidadeHandler.HandleSalvarRegrasComunidade)
	})

	workDir, _ := os.Getwd()
	filesDir := filepath.Join(workDir, "client", "dist")

	// Build do Vite + fallback da SPA, com cabeçalho de cache por tipo de arquivo.
	// Ver estaticos.go para o porquê de cada caso.
	r.Get("/*", servirEstaticos(filesDir))

	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}
