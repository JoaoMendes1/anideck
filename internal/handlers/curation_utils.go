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
	if curado.CustomTitle != "" {
		anime.Title = curado.CustomTitle
	}
	if curado.CustomSynopsis != "" {
		anime.Synopsis = curado.CustomSynopsis
	}
	if curado.CustomStatus != "" {
		anime.Status = curado.CustomStatus
	}
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
	anime.Streaming = ConverterLinks(curado.CustomExternalLinks, anime.Streaming)
	anime.StartDate, anime.FirstAiredAt = ConverterEstreia(curado.CustomFirstAiredAt, anime.StartDate)

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
func CarregarCuradoria(client *supabase.Client) map[int]models.CuratedAnime {
	curadosMap := make(map[int]models.CuratedAnime)

	if client == nil {
		log.Printf("[CURADORIA] Cliente de banco não inicializado")
		return curadosMap
	}

	data, _, err := client.From("curated_animes").Select("*", "exact", false).Execute()
	if err != nil {
		log.Printf("[CURADORIA] Erro ao carregar curadoria: %v", err)
		return curadosMap
	}

	var curados []models.CuratedAnime
	if err := json.Unmarshal(data, &curados); err != nil {
		log.Printf("[CURADORIA] Erro ao decodificar curadoria: %v", err)
		return curadosMap
	}

	for _, c := range curados {
		curadosMap[c.MalID] = c
	}
	return curadosMap
}

// AplicarCuradoriaEmLista percorre uma lista de animes aplicando a curadoria de cada um.
func AplicarCuradoriaEmLista(animes []anilist.Anime, curados map[int]models.CuratedAnime) {
	for i := range animes {
		if curado, ok := curados[animes[i].MalID]; ok {
			AplicarCuradoria(&animes[i], curado)
		}
	}
}

// ApplyCurationToAnimeList mantém a assinatura antiga usada pelos handlers de anime.
func ApplyCurationToAnimeList(animes []anilist.Anime) []anilist.Anime {
	AplicarCuradoriaEmLista(animes, CarregarCuradoria(database.Client))
	return animes
}
