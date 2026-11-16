// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AnimeCard from './AnimeCard'
import DeckCard from './DeckCard'

afterEach(() => {
    cleanup()
})

describe('AnimeCard e DeckCard', () => {
    it('exibe a primeira tag de gênero no celular e oculta a segunda até o breakpoint sm', () => {
        render(
            <MemoryRouter>
                <AnimeCard
                    malId={52991}
                    title="Sousou no Frieren"
                    genres={['Aventura', 'Fantasia', 'Drama']}
                    score={9.5}
                    ranking={1}
                    gradientClass="card-g1"
                    statusBadge={<span>Assistindo</span>}
                />
            </MemoryRouter>,
        )

        const tag1 = screen.getByText('Aventura')
        const tag2 = screen.getByText('Fantasia')
        expect(tag1.className).toContain('inline-block')
        expect(tag1.className).not.toContain('hidden sm:inline-block')
        expect(tag1.className).toContain('text-[8.5px]')

        expect(tag2.className).toContain('hidden sm:inline-block')
        expect(screen.queryByText('Drama')).toBeNull()
        expect(screen.getByText('★ 9.5')).toBeTruthy()
        expect(screen.getByText('#1')).toBeTruthy()
    })

    it('exibe S/N quando o anime não possui nota e aciona onEdit no DeckCard', () => {
        const onEdit = vi.fn()
        const entrada = {
            id: 'ent-1',
            mal_id: 21,
            tipo: 'anime',
            status: 'Quero Assistir',
            nota: null,
            is_favorite: true,
        }

        render(
            <MemoryRouter>
                <DeckCard
                    entrada={entrada}
                    animeLocal={{
                        mal_id: 21,
                        title: 'One Piece',
                        image_url: 'https://example.com/op.jpg',
                        genres: ['Ação'],
                        year: 1999,
                    }}
                    gradientClass="card-g2"
                    onEdit={onEdit}
                />
            </MemoryRouter>,
        )

        expect(screen.getByText('S/N')).toBeTruthy()
        const seloStatus = screen.getByText('Quero Assistir')
        expect(seloStatus.className).toContain('leading-none')

        fireEvent.click(screen.getByRole('button', { name: 'Editar entrada' }))
        expect(onEdit).toHaveBeenCalledWith(entrada)
    })
})
