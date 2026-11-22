package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

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
	maratonaHandler := &handlers.MaratonaHandler{AniListClient: anilistService}

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
	personagemHandler := &handlers.PersonagemHandler{}
	rpgHandler := &handlers.RPGHandler{}
	comunidadeHandler := &handlers.ComunidadeHandler{}
	economiaHandler := &handlers.EconomiaHandler{}
	missoesHandler := &handlers.MissoesHandler{}
	lojaHandler := &handlers.LojaHandler{}
	cartasHandler := &handlers.CartasHandler{}
	rankingsComunidadeHandler := &handlers.RankingsComunidadeHandler{}
	clasHandler := &handlers.ClasHandler{}
	socialHandler := &handlers.SocialHandler{}
	moderacaoHandler := &handlers.ModeracaoHandler{}
	salasEstreiaHandler := &handlers.SalasEstreiaHandler{}
	chefaoHandler := &handlers.ChefaoHandler{}
	previsoesHandler := &handlers.PrevisoesHandler{}
	convitesHandler := &handlers.ConvitesHandler{}
	wrappedHandler := handlers.NewWrappedHandler()
	curadoriaCollabHandler := handlers.NewCuradoriaCollabHandler()

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
	r.Get("/api/anime/{id}/comunidade", rankingsComunidadeHandler.HandleNumerosComunidadeAnime)
	reviewsHandler := &handlers.ReviewsHandler{}
	r.With(middleware.OptionalAuth).Get("/api/anime/{id}/reviews", reviewsHandler.HandleListarReviews)
	r.Get("/api/membros/ranking", comunidadeHandler.HandleRankingMembros)
	r.Get("/api/membros/{handle}", comunidadeHandler.HandlePerfilPublico)
	r.Get("/api/ranking", rankingHandler.HandleGetTopAnime)
	r.Get("/api/curation", curationHandler.HandleList)
	r.Get("/api/loja", lojaHandler.HandleListarLoja)
	r.Get("/api/apoiador", economiaHandler.HandleGetApoiador)
	r.Get("/api/membros/{handle}/cartas", cartasHandler.HandleCartasDoMembro)
	r.Get("/api/membros/{handle}/personagens", cartasHandler.HandlePersonagensDoMembro)
	r.With(middleware.OptionalAuth).Get("/api/membros/{handle}/atividade", socialHandler.HandleAtividadeDoPerfil)
	r.With(middleware.OptionalAuth).Get("/api/membros/{handle}/social", socialHandler.HandleResumoSocial)
	r.Get("/api/membros/{a}/duelo/{b}", cartasHandler.HandleDueloDeGosto)
	r.Get("/api/membros/ranking/genero", rankingsComunidadeHandler.HandleRankingGenero)
	r.With(middleware.OptionalAuth).Get("/api/rankings/clima", rankingsComunidadeHandler.HandleClimaTemporada)
	r.Get("/api/rankings/em-alta", rankingsComunidadeHandler.HandleEmAltaComunidade)
	// Clãs (Fase 17, #180, #181, #182): listagem, ranking de temporada, campeões, detalhes e desafio semanal
	r.Get("/api/clas", clasHandler.HandleListarClas)
	r.Get("/api/clas/fundacao", clasHandler.HandleRegrasFundacao)
	r.Get("/api/clas/ranking/temporada", clasHandler.HandleRankingClasTemporada)
	r.Get("/api/clas/ranking/campeoes", clasHandler.HandleHistoricoCampeoesClas)
	r.Get("/api/clas/{tag}", clasHandler.HandleObterClaPorTag)
	r.Get("/api/clas/{tag}/desafio", clasHandler.HandleObterDesafioCla)
	// Salas de Estreia (Fase 17, #183, #184): chat ao vivo pós-lançamento
	r.Get("/api/salas-estreia/ao-vivo", salasEstreiaHandler.HandleListarSalasAoVivo)
	r.Get("/api/salas-estreia/por-anime/{malId}", salasEstreiaHandler.HandleObterSalaPorAnime)
	r.Get("/api/salas-estreia/{id}", salasEstreiaHandler.HandleObterSala)
	r.With(middleware.OptionalAuth).Get("/api/salas-estreia/{id}/mensagens", salasEstreiaHandler.HandleListarMensagens)
	// Chefão da Temporada (Fase 17, #185): status, HP e ranking de ataque
	r.With(middleware.OptionalAuth).Get("/api/chefao", chefaoHandler.HandleObterChefaoAtual)
	// Previsões da Comunidade (Fase 17, #187): enquetes apostando Mana
	r.With(middleware.OptionalAuth).Get("/api/previsoes", previsoesHandler.HandleListarPrevisoes)
	// AniDeck Wrapped público (Fase 17.5a, #190)
	r.Get("/api/u/{handle}/wrapped/{ano}", wrappedHandler.HandleGetWrappedPublico)
	// Rotas públicas que custam caro por chamada: teto de corpo e limite por IP, para um
	// visitante sozinho não gastar a cota da AniList nem encher o painel de pedidos.
	limiteDoLote := middleware.NovoLimitadorPorIP(60, time.Minute)
	limiteDoConvite := middleware.NovoLimitadorPorIP(5, 10*time.Minute)
	r.With(limiteDoLote.Middleware, middleware.LimitarCorpo(64<<10)).Post("/api/anime/bulk", animeHandler.HandleGetAnimesByIDs)
	r.With(limiteDoConvite.Middleware, middleware.LimitarCorpo(4<<10)).Post("/api/beta/request-invite", notificationsHandler.HandleRequestBetaInvite)
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
		protegido.Get("/api/maratona/{mal_id}", maratonaHandler.HandleObter)
		protegido.Post("/api/maratona/{mal_id}", maratonaHandler.HandleIniciar)
		protegido.Delete("/api/entries/{mal_id}/episodes", entriesHandler.HandleClearEpisodes)
		protegido.Get("/api/entries/{mal_id}/saida-completo", entriesHandler.HandlePreviaSaidaCompleto)
		protegido.Post("/api/entries/{mal_id}/saida-completo", entriesHandler.HandleExecutarSaidaCompleto)

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
		protegido.Get("/api/guilda/extrato", guildaHandler.HandleExtratoGuilda)
		protegido.Get("/api/guilda", guildaHandler.HandleGetGuilda)
		protegido.Get("/api/personagem", personagemHandler.HandleGetPersonagem)
		protegido.Post("/api/personagem", personagemHandler.HandleDespertarPersonagem)
		protegido.Put("/api/personagem/visual", personagemHandler.HandleEquiparVisual)
		protegido.Put("/api/personagem/base", personagemHandler.HandleTrocarPersonagem)
		protegido.Post("/api/personagem/desbloquear", personagemHandler.HandleDesbloquearPersonagem)
		protegido.Put("/api/personagem/esquadrao", rpgHandler.HandleSalvarEsquadrao)
		protegido.Get("/api/personagem/ecos", rpgHandler.HandleGetEcos)
		protegido.Put("/api/personagem/eco", rpgHandler.HandleEquiparEco)
		protegido.Get("/api/personagem/equipamentos", rpgHandler.HandleGetEquipamentos)
		protegido.Put("/api/personagem/equipamentos", rpgHandler.HandleEquiparItemRPG)
		protegido.Post("/api/rpg/aprimorar", rpgHandler.HandleAprimorar)
		protegido.Put("/api/personagem/atributos", rpgHandler.HandleDistribuirPontos)
		protegido.Get("/api/rpg/batalhas", rpgHandler.HandleGetExpedicoes)
		protegido.Post("/api/rpg/batalhas", rpgHandler.HandleBatalhar)
		protegido.Get("/api/rpg/atb", rpgHandler.HandleGetATB)
		protegido.Get("/api/rpg/contratos", rpgHandler.HandleGetContratos)
		protegido.Post("/api/rpg/contratos/resgatar", rpgHandler.HandleResgatarContrato)
		protegido.Get("/api/rpg/masmorras", rpgHandler.HandleGetMasmorras)
		protegido.Post("/api/rpg/masmorras", rpgHandler.HandleEntrarNaMasmorra)
		protegido.Get("/api/rpg/masmorras/roguelite", rpgHandler.HandleGetRoguelite)
		protegido.Post("/api/rpg/masmorras/roguelite/iniciar", rpgHandler.HandleIniciarRoguelite)
		protegido.Post("/api/rpg/masmorras/roguelite/agir", rpgHandler.HandleAgirRoguelite)
		protegido.Post("/api/rpg/combate-interativo/iniciar", rpgHandler.HandleIniciarCombateInterativo)
		protegido.Post("/api/rpg/combate-interativo/agir", rpgHandler.HandleAgirCombateInterativo)
		protegido.Get("/api/rpg/duelos", rpgHandler.HandleGetDuelos)
		protegido.Post("/api/rpg/duelos", rpgHandler.HandleDuelar)
		protegido.Post("/api/rpg/grupos", rpgHandler.HandleCriarGrupo)
		protegido.Post("/api/rpg/grupos/{id}/configurar", rpgHandler.HandleConfigurarGrupo)
		protegido.Post("/api/rpg/grupos/{id}/aceitar", rpgHandler.HandleAceitarConvite)
		protegido.Post("/api/rpg/grupos/{id}/lutar", rpgHandler.HandleLutarEmGrupo)
		protegido.Get("/api/rpg/cla/expedicao", rpgHandler.HandleGetExpedicaoDoCla)
		protegido.Post("/api/rpg/cla/expedicao", rpgHandler.HandleAtacarChefeDoCla)
		protegido.Get("/api/rpg/evento", rpgHandler.HandleGetEvento)
		protegido.Post("/api/rpg/evento", rpgHandler.HandleLutarNoEvento)
		protegido.Get("/api/rpg/invocacao", rpgHandler.HandleGetInvocacao)
		protegido.Post("/api/rpg/invocacao", rpgHandler.HandleInvocar)
		protegido.Post("/api/rpg/recuperar", rpgHandler.HandleRecuperar)
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
		protegido.Put("/api/perfil/nome", comunidadeHandler.HandleAtualizarNomeExibicao)
		protegido.Post("/api/comunidade/descanso", comunidadeHandler.HandleAtivarDescanso)
		protegido.Get("/api/comunidade/bloqueios", comunidadeHandler.HandleListarBloqueios)
		protegido.Post("/api/comunidade/bloqueios/{handle}", comunidadeHandler.HandleBloquear)
		protegido.Delete("/api/comunidade/bloqueios/{handle}", comunidadeHandler.HandleBloquear)
		protegido.Get("/api/anime/{id}/episodios/{n}/conversa", comunidadeHandler.HandleConversaDoEpisodio)
		protegido.Put("/api/anime/{id}/reviews", reviewsHandler.HandleSalvarReview)
		protegido.Delete("/api/anime/{id}/reviews", reviewsHandler.HandleApagarReview)
		protegido.Post("/api/anime/{id}/episodios/{n}/comentarios", comunidadeHandler.HandleComentar)
		protegido.Put("/api/anime/{id}/episodios/{n}/reacoes/{reacao}", comunidadeHandler.HandleReagir)
		protegido.Delete("/api/anime/{id}/episodios/{n}/reacoes/{reacao}", comunidadeHandler.HandleReagir)
		protegido.Delete("/api/comunidade/comentarios/{cid}", comunidadeHandler.HandleApagarComentario)
		protegido.Post("/api/comunidade/comentarios/{cid}/curtida", comunidadeHandler.HandleCurtir)
		protegido.Delete("/api/comunidade/comentarios/{cid}/curtida", comunidadeHandler.HandleCurtir)
		protegido.Post("/api/comunidade/comentarios/{cid}/denuncia", comunidadeHandler.HandleDenunciar)
		protegido.Get("/api/membros/liga", rankingsComunidadeHandler.HandleLigaSemanal)
		protegido.Post("/api/membros/{handle}/seguir", socialHandler.HandleSeguir)
		protegido.Delete("/api/membros/{handle}/seguir", socialHandler.HandleSeguir)
		protegido.Get("/api/feed", socialHandler.HandleFeed)
		protegido.Post("/api/denuncias", moderacaoHandler.HandleDenunciar)

		// Clãs (Fase 17, #180, #181): criação, gestão, membros, convites e desafio
		protegido.Get("/api/me/cla", clasHandler.HandleObterMeuCla)
		protegido.Get("/api/me/cla/desafio", clasHandler.HandleMeuDesafioClaResumo)
		protegido.Post("/api/clas", clasHandler.HandleCriarCla)
		protegido.Post("/api/clas/{id}/entrar", clasHandler.HandleEntrarCla)
		protegido.Post("/api/clas/sair", clasHandler.HandleSairCla)
		protegido.Post("/api/clas/{id}/membros/{userId}/expulsar", clasHandler.HandleExpulsarMembro)
		protegido.Post("/api/clas/{id}/transferir", clasHandler.HandleTransferirLideranca)
		protegido.Post("/api/clas/{id}/membros/{userId}/papel", clasHandler.HandleAlterarPapel)
		protegido.Post("/api/clas/{id}/convites", clasHandler.HandleConvidarMembro)
		protegido.Post("/api/clas/convites/{id}/responder", clasHandler.HandleResponderConvite)
		protegido.Post("/api/clas/{id}/denunciar", clasHandler.HandleDenunciarCla)

		// Salas de Estreia: mensagens, curtidas e denúncias
		protegido.Post("/api/salas-estreia/{id}/mensagens", salasEstreiaHandler.HandleEnviarMensagem)
		protegido.Post("/api/salas-estreia/{id}/mensagens/{msgId}/curtida", salasEstreiaHandler.HandleCurtirMensagem)
		protegido.Post("/api/salas-estreia/{id}/mensagens/{msgId}/denuncia", salasEstreiaHandler.HandleDenunciarMensagem)

		// Previsões, Classes e Títulos (Fase 17.4, #186, #187, #189)
		protegido.Post("/api/previsoes/{id}/apostar", previsoesHandler.HandleApostarPrevisao)
		protegido.Post("/api/perfil/titulo", previsoesHandler.HandleEquiparTitulo)

		// Convites e Recompensas (Fase 17.5b, #191)
		protegido.Get("/api/convites/meu", convitesHandler.HandleObterMeuConvite)
		protegido.Post("/api/convites/resgatar", convitesHandler.HandleResgatarConvite)

		// AniDeck Wrapped pessoal (Fase 17.5a, #190)
		protegido.Get("/api/wrapped/{ano}", wrappedHandler.HandleGetMeuWrapped)

		// Curadoria Colaborativa (Fase 17.7, #188)
		protegido.Post("/api/curation/sugerir", curadoriaCollabHandler.HandleSubmeterSugestao)

		// Início personalizável (#275)
		inicioPrefHandler := &handlers.InicioPreferenciasHandler{}
		protegido.Get("/api/inicio/preferencias", inicioPrefHandler.HandleGetPreferencias)
		protegido.Put("/api/inicio/preferencias", inicioPrefHandler.HandleSalvarPreferencias)

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
		admin.Get("/api/admin/rpg/catalogo", rpgHandler.HandleGetAdminCatalogoRPG)

		// Economia de AniCoins: carteira global, auditoria, ajuste manual e transferência (exclusivo admin)
		admin.Get("/api/admin/economia", economiaHandler.HandleGetAdminEconomia)
		admin.Put("/api/admin/economia", economiaHandler.HandleSaveAdminEconomia)
		admin.Get("/api/admin/missoes/recompensas", missoesHandler.HandleGetAdminMissoesRecompensas)
		admin.Put("/api/admin/missoes/recompensas", missoesHandler.HandleSaveAdminMissoesRecompensas)
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
		admin.Get("/api/admin/denuncias", moderacaoHandler.HandleListarDenuncias)
		admin.Post("/api/admin/denuncias/{id}/decidir", moderacaoHandler.HandleDecidirDenuncia)
		admin.Post("/api/admin/punicoes", moderacaoHandler.HandleAplicarPunicao)
		admin.Post("/api/admin/punicoes/{id}/revogar", moderacaoHandler.HandleRevogarPunicao)
		admin.Get("/api/admin/punicoes/{handle}", moderacaoHandler.HandleHistoricoPunicoes)
		admin.Post("/api/admin/moderacao/{cid}", comunidadeHandler.HandleModerar)
		admin.Get("/api/admin/comunidade/regras", comunidadeHandler.HandleGetRegrasComunidade)
		admin.Put("/api/admin/comunidade/regras", comunidadeHandler.HandleSalvarRegrasComunidade)

		// Moderação de Clãs e Desafios (Fase 17, #180, #181)
		admin.Get("/api/admin/clas/denuncias", clasHandler.HandleAdminListarDenuncias)
		admin.Post("/api/admin/clas/{id}/dissolver", clasHandler.HandleAdminDissolverCla)
		admin.Post("/api/admin/clas/{id}/renomear", clasHandler.HandleAdminRenomearCla)
		admin.Post("/api/admin/clas/desafios/fechar-semana", clasHandler.HandleAdminFecharSemanaDesafios)
		admin.Post("/api/admin/clas/temporada/fechar", clasHandler.HandleAdminFecharTemporadaClas)

		// Salas de Estreia: gestão e fechamento manual
		admin.Post("/api/admin/salas-estreia", salasEstreiaHandler.HandleAdminCriarSalaManual)
		admin.Post("/api/admin/salas-estreia/{id}/fechar", salasEstreiaHandler.HandleAdminFecharSala)

		// Chefão da Temporada (Fase 17, #185): cadastro e pagamento manual
		admin.Post("/api/admin/chefao", chefaoHandler.HandleAdminCriarOuEditarChefao)
		admin.Post("/api/admin/chefao/{id}/pagar", chefaoHandler.HandleAdminPagarRecompensas)

		// Previsões da Comunidade (Fase 17, #187): resolução manual e premiação
		admin.Post("/api/admin/previsoes/{id}/resolver", previsoesHandler.HandleAdminResolverPrevisao)

		// Configuração de Convites (Fase 17.5b, #191)
		admin.Get("/api/admin/convites/config", convitesHandler.HandleAdminGetConfigConvites)
		admin.Put("/api/admin/convites/config", convitesHandler.HandleAdminSaveConfigConvites)

		// Curadoria Colaborativa (Fase 17.7, #188): fila de revisão de sugestões da comunidade
		admin.Get("/api/admin/curation/sugestoes-collab", curadoriaCollabHandler.HandleAdminListarSugestoes)
		admin.Post("/api/admin/curation/sugestoes-collab/{id}/revisar", curadoriaCollabHandler.HandleAdminRevisarSugestao)
	})

	workDir, _ := os.Getwd()
	filesDir := filepath.Join(workDir, "client", "dist")

	// Build do Vite + fallback da SPA, com cabeçalho de cache por tipo de arquivo.
	// Ver estaticos.go para o porquê de cada caso.
	r.Get("/*", servirEstaticos(filesDir))

	port := os.Getenv("PORT")
	log.Printf("Servidor rodando na porta %s...", port)
	// As chamadas ao Supabase passam pelo transporte padrão do Go, que não tem prazo: um
	// banco que aceita a conexão e não responde prenderia a requisição para sempre. O
	// prazo fica acima dos 90 s que as chamadas de IA podem levar até o primeiro byte.
	if transporte, ok := http.DefaultTransport.(*http.Transport); ok {
		transporte.ResponseHeaderTimeout = 100 * time.Second
	}

	// Prazos do servidor: sem eles, uma conexão lenta ou abandonada ocupa uma goroutine
	// indefinidamente. O de escrita cobre a resposta mais demorada (IA).
	servidor := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      180 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Encerramento gracioso: no SIGTERM do deploy, o servidor para de aceitar conexões e
	// deixa as requisições em andamento terminarem. O prazo cabe nos 10 s que o Docker
	// espera antes de matar o processo.
	// Rascunhos de novidades da entrega que acabou de subir (sql/116), sem atrasar o boot.
	go handlers.ImportarRascunhosNovidades()

	ctx, parar := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer parar()
	encerrado := make(chan struct{})
	go func() {
		<-ctx.Done()
		prazo, cancelar := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancelar()
		if err := servidor.Shutdown(prazo); err != nil {
			log.Printf("Encerramento com requisições em andamento: %v", err)
		}
		close(encerrado)
	}()

	if err := servidor.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
	<-encerrado
	log.Println("Servidor encerrado")
}
