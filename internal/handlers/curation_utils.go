// Aplicação da curadoria manual (Data Enrichment) sobre os dados vindos da AniList.
//
// Tudo que sobrepõe dado do catálogo com o que foi editado no Painel Admin passa por aqui.
// Antes existiam cinco implementações espalhadas (ranking, busca em dois pontos, detalhe e
// deck), cada uma aplicando um subconjunto diferente dos campos — o resultado é que o mesmo
// anime aparecia com a capa curada numa tela e a capa da AniList em outra, e correções de bug
// feitas numa cópia não chegavam às demais.
package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/JoaoMendes1/anideck/internal/anilist"
	"github.com/JoaoMendes1/anideck/internal/database"
	"github.com/JoaoMendes1/anideck/internal/models"
	"github.com/supabase-community/supabase-go"
)

// AplicarCuradoria sobrepõe a um anime da AniList os campos editados no Painel Admin.
//
// Todo campo só é sobrescrito quando tem conteúdo, e essa guarda é o ponto central da função:
// atribuir um `custom_title` vazio apaga o título real da obra. Esse bug já tinha sido
// corrigido uma vez, mas só na cópia do ranking — seguia vivo na busca e no detalhe.
func AplicarCuradoria(anime *anilist.Anime, curado models.CuratedAnime) {
	anime.IsCurated = true
	anime.CurationStatus = curado.CurationStatus

	if curado.CustomTitle != "" {
		anime.Title = curado.CustomTitle
	}
	if curado.CustomSynopsis != "" {
		anime.Synopsis = curado.CustomSynopsis
	}
	// O status gravado na curadoria é uma cópia do dia em que o anime foi curado. Ele só
	// vence o da AniList quando é mais avançado: status de exibição só anda para a frente
	// (não lançado → em lançamento → finalizado), então o mais avançado é o atual.
	anime.Status = StatusMaisAvancado(anime.Status, curado.CustomStatus)
	if curado.CustomCoverImage != "" {
		anime.Images.JPG.ImageURL = curado.CustomCoverImage
	}
	if curado.CustomBannerImage != "" {
		anime.BannerImage = curado.CustomBannerImage
	}

	// As categorias editadas à mão substituem os genres da AniList.
	//
	// A guarda é `len(...) > 0` e não `!= nil` de propósito: um array vazio vindo do banco
	// não é nulo, passaria num teste de nulidade e zeraria os gêneros do anime.
	if len(curado.CustomTags) > 0 {
		generos := make([]anilist.Genre, 0, len(curado.CustomTags))
		for _, tag := range curado.CustomTags {
			generos = append(generos, anilist.Genre{Name: tag})
		}
		anime.Genres = generos
	}

	// Campos do Bloco 2. A regra de cada um mora em curation_conversao.go, que trata o JSON
	// cru e decide o que fazer quando ele está ausente ou malformado.
	anime.StreamingEpisodes = ConverterEpisodios(curado.CustomEpisodes, anime.StreamingEpisodes)
	if !jsonAusente(curado.CustomEpisodes) && len(anime.StreamingEpisodes) > anime.Episodes {
		anime.Episodes = len(anime.StreamingEpisodes)
	}
	anime.Streaming = ConverterLinks(curado.CustomExternalLinks, anime.Streaming)
	anime.StartDate, anime.FirstAiredAt = ConverterEstreia(curado.CustomFirstAiredAt, anime.StartDate)
	// Se a curadoria possui cronograma futuro de episódios, ela tem precedência sobre a AniList
	if proximoCurado := CalcularProximoEpisodioCurado(curado.CustomEpisodes, curado.CustomFirstAiredAt); proximoCurado != nil {
		anime.NextAiringEpisode = proximoCurado
	}
	anime.Status = StatusPelosEpisodios(anime.Status, anime.NextAiringEpisode, len(anime.StreamingEpisodes), anime.Episodes)

	// Duração só é sobrescrita quando é um número que faz sentido: zero ou negativo viraria
	// tempo assistido zerado nas Estatísticas, pior do que a estimativa de 24 min do cache.
	if curado.CustomDurationMinutes != nil && *curado.CustomDurationMinutes > 0 {
		anime.Duration = *curado.CustomDurationMinutes
	}
}

// CarregarCuradoria lê a tabela de curadoria e devolve indexada por mal_id.
//
// O client vem por parâmetro porque as rotas não usam o mesmo: o detalhe do anime consulta
// com o token do usuário e as demais com o client global. Manter essa escolha em quem chama
// evita alterar, de lado, o comportamento de RLS de alguma rota.
//
// Falha de leitura devolve mapa vazio em vez de erro: curadoria é enriquecimento opcional, e
// perder o acesso a ela deve degradar para os dados da AniList, não derrubar a requisição.
// curadoriaEmCache guarda a curadoria inteira por um minuto.
//
// Deck, Calendário, Ranking e Busca aplicam a curadoria em toda resposta, e cada uma
// baixava a tabela INTEIRA do banco (sinopses, episódios, personagens: ~490 KB) a cada
// requisição — cerca de meio segundo por tela, no log do servidor. A curadoria muda só
// quando o admin edita, então um minuto de validade não esconde nada de ninguém.
//
// Escrever pelo Painel invalida na hora (ver InvalidaCuradoriaDepois). O minuto é a rede
// de segurança para escritas que não passam pelas rotas do admin.
//
// O mapa devolvido é compartilhado entre as requisições e só pode ser LIDO. Hoje é o
// que acontece: AplicarCuradoria copia cada campo para o anime, sem alterar o original.
var curadoriaEmCache = novoCacheComValidade[map[int]models.CuratedAnime](time.Minute)

// InvalidaCuradoriaDepois é um middleware para as rotas do admin: depois de qualquer
// requisição que não seja leitura, descarta a curadoria em cache. Assim, quem edita
// uma capa no Painel vê a mudança no Deck na próxima abertura, sem esperar o minuto.
//
// Invalida até quando a escrita falha. Custa uma releitura do banco, e evita ter que
// descobrir se a falha aconteceu antes ou depois de gravar. A taxonomia vai junto: os
// rótulos também são editados pelo Painel e aparecem nos chips da Busca.
func InvalidaCuradoriaDepois(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		if r.Method != http.MethodGet {
			curadoriaEmCache.invalidar()
			taxonomiaEmCache.invalidar()
		}
	})
}

func CarregarCuradoria(client *supabase.Client) map[int]models.CuratedAnime {
	return curadoriaEmCache.obter(func() (map[int]models.CuratedAnime, bool) {
		return carregarCuradoriaDoBanco(client)
	})
}

// carregarCuradoriaDoBanco é a leitura de verdade. O bool diz se deu certo: falha não
// entra no cache, para a próxima requisição tentar de novo em vez de ficar um minuto
// sem curadoria.
func carregarCuradoriaDoBanco(client *supabase.Client) (map[int]models.CuratedAnime, bool) {
	curadosMap := make(map[int]models.CuratedAnime)

	if client == nil {
		log.Printf("[CURADORIA] Cliente de banco não inicializado")
		return curadosMap, false
	}

	data, _, err := client.From("curated_animes").Select("*", "", false).Execute()
	if err != nil {
		log.Printf("[CURADORIA] Erro ao carregar curadoria: %v", err)
		return curadosMap, false
	}

	var curados []models.CuratedAnime
	if err := json.Unmarshal(data, &curados); err != nil {
		log.Printf("[CURADORIA] Erro ao decodificar curadoria: %v", err)
		return curadosMap, false
	}

	for _, c := range curados {
		curadosMap[c.MalID] = c
	}
	return curadosMap, true
}

// AplicarCuradoriaEmLista percorre uma lista de animes aplicando a curadoria de cada um
// e traduzindo para português os gêneros de animes que ainda não foram curados.
func AplicarCuradoriaEmLista(animes []anilist.Anime, curados map[int]models.CuratedAnime) {
	tax := taxonomiaAtual()
	for i := range animes {
		if curado, ok := curados[animes[i].MalID]; ok {
			AplicarCuradoria(&animes[i], curado)
		}
		if !animes[i].IsCurated && len(animes[i].Genres) > 0 {
			animes[i].Genres = TraduzirGenerosComIndice(animes[i].Genres, tax.indice)
		}
	}
}

// ApplyCurationToAnimeList mantém a assinatura antiga usada pelos handlers de anime.
func ApplyCurationToAnimeList(animes []anilist.Anime) []anilist.Anime {
	AplicarCuradoriaEmLista(animes, CarregarCuradoria(database.Client))
	return animes
}

const statusFinalizado = "Finished Airing"

func ordemDoStatus(s string) int {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "finished airing", "finished", "finalizado":
		return 3
	case "currently airing", "releasing", "em lançamento":
		return 2
	case "not yet aired", "not_yet_released", "em breve":
		return 1
	}
	return 0
}

// StatusMaisAvancado escolhe entre o status da AniList e o da curadoria o que está mais
// adiante na vida do anime. Vazio ou desconhecido perde para qualquer status conhecido.
func StatusMaisAvancado(daAniList, curado string) string {
	// No empate fica o texto da curadoria: é o mesmo status, escrito como o admin quis.
	if curado != "" && ordemDoStatus(curado) >= ordemDoStatus(daAniList) {
		return curado
	}
	if daAniList == "" {
		return curado
	}
	return daAniList
}

// StatusPelosEpisodios fecha o anime que a curadoria acompanha episódio a episódio: ainda
// "em lançamento", sem próximo episódio marcado e com todos os episódios já listados, ele
// terminou. Sem o total de episódios conhecido, não dá para afirmar e o status fica.
func StatusPelosEpisodios(status string, proximo *anilist.NextAiringEpisode, listados, total int) string {
	if ordemDoStatus(status) == 2 && proximo == nil && total > 0 && listados >= total {
		return statusFinalizado
	}
	return status
}
