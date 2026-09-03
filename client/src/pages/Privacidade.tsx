import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Página pública: fica FORA do RotaProtegida de propósito. Quem precisa ler
// isto é justamente quem ainda não tem conta — e a URL também é campo
// obrigatório da tela de consentimento do Google Cloud.

const EMAIL_CONTATO = 'anidecksuporte@gmail.com'
const CONTROLADOR = 'João Victor Mendes'
const ATUALIZADA_EM = '3 de setembro de 2026'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section className="border-b border-line py-8 last:border-b-0">
            <h2 className="font-anton text-[15px] uppercase tracking-wide text-muted mb-4 select-none">
                {titulo}
            </h2>
            <div className="space-y-3 text-[13.5px] leading-relaxed text-muted">{children}</div>
        </section>
    )
}

function Card({ children }: { children: ReactNode }) {
    return <div className="bg-panel border border-line rounded-2xl p-5">{children}</div>
}

// Cada linha corresponde a uma tabela real do banco. Se uma tabela nova passar
// a guardar dado de usuário, ela precisa aparecer aqui.
const DADOS_COLETADOS = [
    {
        titulo: 'Cadastro',
        itens: 'E-mail, senha (guardada apenas como hash, nunca em texto legível) e o nome de exibição que você escolhe. Se entrar com o Google, recebemos seu e-mail e nome da conta Google — nunca sua senha do Google.',
    },
    {
        titulo: 'Sua lista de animes',
        itens: 'Quais obras você adicionou, o status de cada uma, sua nota, sua anotação pessoal e quais você marcou como favoritas.',
    },
    {
        titulo: 'Progresso por episódio',
        itens: 'Quais episódios você marcou como assistidos e o momento em que marcou cada um. É esse registro que alimenta a página de Estatísticas.',
    },
    {
        titulo: 'Notificações push',
        itens: 'Se você autorizar notificações, guardamos as credenciais que o seu navegador gera para receber avisos, além do histórico de avisos enviados.',
    },
]

const TERCEIROS = [
    {
        nome: 'Supabase',
        papel: 'Banco de dados e autenticação. É onde seus dados ficam guardados. Os servidores ficam fora do Brasil.',
    },
    {
        nome: 'Render',
        papel: 'Hospedagem da aplicação. Os servidores ficam fora do Brasil.',
    },
    {
        nome: 'Google',
        papel: 'Login com Google, se você escolher esse caminho. Opcional.',
    },
    {
        nome: 'Serviço de push do seu navegador',
        papel: 'Entrega das notificações de episódio novo. Só é acionado se você autorizar notificações.',
    },
]

const DIREITOS = [
    'Saber quais dados seus existem aqui e pedir uma cópia deles.',
    'Corrigir dado incompleto ou desatualizado.',
    'Pedir a exclusão da sua conta e de tudo que está ligado a ela.',
    'Saber com quem os dados são compartilhados.',
    'Revogar consentimentos que você tenha dado.',
]

export default function Privacidade() {
    return (
        <div className="max-w-[760px] w-full mx-auto px-5 pb-20">
            <h1 className="font-anton text-[clamp(1.6rem,3.6vw,2.2rem)] uppercase mb-2 select-none">
                Política de <span className="text-holo">Privacidade</span>
            </h1>
            <p className="text-[12px] text-muted-2 mb-2">Última atualização: {ATUALIZADA_EM}</p>

            <p className="text-[13.5px] leading-relaxed text-muted">
                O AniDeck é um catálogo pessoal de anime, mantido por uma pessoa só. Esta página
                explica, sem rodeio, o que é coletado, por quê, com quem é compartilhado e o que
                você pode pedir a qualquer momento.
            </p>

            <Secao titulo="Quem é responsável">
                <Card>
                    <p className="text-[13.5px] text-muted">
                        O responsável pelo tratamento dos seus dados (o controlador, na linguagem da
                        LGPD) é <span className="font-bold text-text">{CONTROLADOR}</span>.
                    </p>
                    <p className="text-[13.5px] text-muted mt-2">
                        Contato para qualquer assunto desta página:{' '}
                        <a href={`mailto:${EMAIL_CONTATO}`} className="text-holo-3 hover:underline">
                            {EMAIL_CONTATO}
                        </a>
                    </p>
                </Card>
            </Secao>

            <Secao titulo="O que é coletado">
                <p>
                    Só o que o próprio produto precisa para funcionar. Nada é importado de outros
                    serviços e nada é inferido por trás dos panos — cada dado abaixo nasce de uma
                    ação sua.
                </p>
                <div className="space-y-2.5 pt-1">
                    {DADOS_COLETADOS.map((grupo) => (
                        <Card key={grupo.titulo}>
                            <div className="text-[13.5px] font-bold text-text mb-1">{grupo.titulo}</div>
                            <p className="text-[12.5px] text-muted leading-relaxed">{grupo.itens}</p>
                        </Card>
                    ))}
                </div>
                <p className="pt-1">
                    <span className="font-bold text-text">O que não é coletado:</span> não pedimos
                    CPF, telefone, endereço, data de nascimento, gênero ou nacionalidade. Não há
                    ferramenta de analytics, não há rastreamento de navegação e não há publicidade.
                </p>
            </Secao>

            <Secao titulo="Por que é coletado">
                <p>
                    Os dados de cadastro, da sua lista e do seu progresso existem porque sem eles o
                    produto não funciona: são o que permite entregar o seu deck, as suas notas e as
                    suas estatísticas. Essa é a base legal de execução do serviço que você pediu.
                </p>
                <p>
                    As notificações de episódio novo dependem do seu consentimento: elas só existem
                    depois que você autoriza no navegador, e você pode revogar essa autorização a
                    qualquer momento nas configurações do próprio navegador.
                </p>
            </Secao>

            <Secao titulo="Com quem é compartilhado">
                <p>
                    Seus dados não são vendidos e não são cedidos a ninguém para marketing. Existem
                    apenas os serviços necessários para o AniDeck ficar de pé:
                </p>
                <div className="space-y-2.5 pt-1">
                    {TERCEIROS.map((t) => (
                        <Card key={t.nome}>
                            <div className="text-[13.5px] font-bold text-text mb-1">{t.nome}</div>
                            <p className="text-[12.5px] text-muted leading-relaxed">{t.papel}</p>
                        </Card>
                    ))}
                </div>
                <p className="pt-1">
                    As informações de catálogo — capas, títulos, sinopses, episódios — vêm da
                    AniList. Ao carregar uma página, consultamos a obra, nunca você: a AniList não
                    recebe sua identificação, sua lista nem suas notas.
                </p>
                <p>
                    O AniDeck usa um modelo de linguagem para reescrever sinopses do catálogo no
                    painel de curadoria. Esse modelo recebe apenas texto público sobre as obras.
                    Nenhum dado de usuário passa por ele.
                </p>
            </Secao>

            <Secao titulo="Armazenamento no seu navegador">
                <p>
                    O AniDeck guarda no seu navegador a sua sessão de login e a paleta de cores que
                    você escolheu. É só isso. Não usamos cookies de rastreamento nem cookies de
                    terceiros para publicidade.
                </p>
            </Secao>

            <Secao titulo="Por quanto tempo os dados ficam">
                <p>
                    Enquanto sua conta existir. Quando você exclui a conta, tudo que está ligado a
                    ela é apagado junto, na mesma operação: lista, notas, anotações, progresso,
                    notificações e credenciais de push. Não guardamos uma versão anonimizada e não
                    há como desfazer.
                </p>
                <p>
                    <span className="font-bold text-text">Uma ressalva honesta sobre backups:</span>{' '}
                    o banco tem cópias de segurança periódicas, feitas para o caso de uma falha
                    grave. Seus dados saem do sistema em uso imediatamente, mas podem permanecer
                    numa cópia de segurança até que ela seja substituída pela seguinte. Essas cópias
                    não são consultadas no dia a dia e servem apenas para recuperação de desastre.
                </p>
            </Secao>

            <Secao titulo="Seus direitos">
                <ul className="space-y-2 pl-1">
                    {DIREITOS.map((direito) => (
                        <li key={direito} className="flex gap-2.5">
                            <span className="text-holo-3 shrink-0">•</span>
                            <span>{direito}</span>
                        </li>
                    ))}
                </ul>
                <p className="pt-1">
                    Dois deles já são autoatendimento: você troca o nome de exibição e exclui a
                    conta na tela de Configurações, sem precisar pedir a ninguém.
                </p>
                <p>
                    Para os demais — inclusive receber uma cópia dos seus dados — ainda não existe
                    botão. Escreva para{' '}
                    <a href={`mailto:${EMAIL_CONTATO}`} className="text-holo-3 hover:underline">
                        {EMAIL_CONTATO}
                    </a>{' '}
                    e o pedido é atendido manualmente, dentro do prazo previsto na LGPD.
                </p>
            </Secao>

            <Secao titulo="Segurança">
                <p>
                    Cada conta enxerga apenas os próprios dados, e essa separação é aplicada pelo
                    próprio banco de dados, não só pelo código da aplicação. Senhas são guardadas
                    como hash. Todo texto que você escreve é limpo antes de ser salvo.
                </p>
                <p>
                    Nenhum sistema é imune. Se acontecer um incidente que possa afetar você, o aviso
                    vai para o e-mail da sua conta.
                </p>
            </Secao>

            <Secao titulo="Idade mínima">
                <p>
                    O AniDeck está em fase de testes fechada, por convite. Se você tem menos de 18
                    anos, use apenas com a ciência e o consentimento de um responsável.
                </p>
            </Secao>

            <Secao titulo="Mudanças nesta política">
                <p>
                    Se algo mudar no que é coletado ou em com quem é compartilhado, esta página é
                    atualizada e a data no topo muda junto. Mudança relevante é avisada por e-mail
                    para quem tem conta.
                </p>
            </Secao>

            <div className="pt-8 text-center">
                <Link to="/" className="text-[13px] font-bold text-holo-3 hover:underline">
                    Voltar para o início
                </Link>
            </div>
        </div>
    )
}
