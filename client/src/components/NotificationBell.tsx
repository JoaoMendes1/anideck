import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, BellOff, Plus, UserPlus, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { invalidarCachesDoDeck } from '../lib/cacheDeTela';
import { useToast } from '../contexts/ToastContext';
import Sheet from './Sheet';

interface AppNotification {
  id: string;
  mal_id: number;
  anime_title: string | null;
  anime_image: string | null;
  episode_number: number;
  read_at: string | null;
  created_at: string;
  episode_watched?: boolean;
}

function extrairDadosConviteBeta(texto: string | null): { nome: string; email: string } {
  const bruto = (texto || '').trim();
  const match = /^(.+?)\s*<([^>]+)>$/.exec(bruto);
  if (match) {
    return { nome: match[1].trim(), email: match[2].trim() };
  }
  return { nome: bruto || 'Visitante', email: '' };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Tempo relativo curto, no estilo de rede social. Feito à mão em vez de
// Intl.RelativeTimeFormat porque ali a saída seria "há 3 horas" — comprida
// demais para caber na linha da notificação sem quebrar.
function tempoRelativo(iso: string): string {
  const segundos = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return 'agora';
  if (segundos < 3600) return `${Math.floor(segundos / 60)}m`;
  if (segundos < 86400) return `${Math.floor(segundos / 3600)}h`;
  if (segundos < 604800) return `${Math.floor(segundos / 86400)}d`;
  return `${Math.floor(segundos / 604800)}sem`;
}

// A comparação é por dia do calendário local, não por diferença de horas:
// 23h de ontem e 1h de hoje distam duas horas e mesmo assim são dias
// diferentes para quem lê. Converter no navegador também respeita o fuso do
// usuário, que o servidor não conhece.
function grupoDe(iso: string): string {
  const agora = new Date();
  const data = new Date(iso);

  const diaAtual = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const diaData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const diasAtras = Math.round((diaAtual.getTime() - diaData.getTime()) / 86400000);

  if (diasAtras <= 0) return 'Hoje';
  if (diasAtras === 1) return 'Ontem';
  if (diasAtras <= 7) return 'Últimos 7 dias';
  return 'Anteriores';
}

const ORDEM_GRUPOS = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Anteriores'];

export default function NotificationBell() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // BUG CORRIGIDO: antes checava só Notification.permission === 'granted' — isso
  // reflete se o navegador TEM PERMISSÃO de notificar, não se existe uma inscrição
  // de push de verdade salva no servidor. Num Android/Xiaomi com a notificação já
  // liberada nas configurações do sistema, isso fazia pushEnabled começar "true"
  // sem nenhuma inscrição real ter sido criada, escondendo o botão "Ativar Nativo"
  // pra sempre. Agora começamos assumindo false e confirmamos de verdade no mount.
  const [pushEnabled, setPushEnabled] = useState(false);
  const [filtroAba, setFiltroAba] = useState<'todas' | 'nao_lidas'>('todas');
  const [marcandoEp, setMarcandoEp] = useState<Record<string, boolean>>({});
  const [episodiosMarcados, setEpisodiosMarcados] = useState<Record<string, boolean>>({});

  const naoLidas = notifications.filter(n => !n.read_at).length;

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(subscription !== null);
    } catch (e) {
      console.error('Erro ao checar inscrição de push existente:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data ?? []);
      }
    } catch (e) {
      console.error('Erro ao buscar notificações', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => checkExistingSubscription())
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
    // Marcado ou desmarcado em outra tela: o "visto" muda na hora, pelo próprio evento, e a
    // busca em seguida confirma com o servidor.
    const aoAtualizarEpisodio = (ev: Event) => {
      const d = (ev as CustomEvent<{ malId?: number; episodeNumber?: number; watched?: boolean }>).detail;
      if (d && typeof d.malId === 'number' && typeof d.episodeNumber === 'number' && typeof d.watched === 'boolean') {
        setNotifications(lista =>
          lista.map(n =>
            n.mal_id === d.malId && n.episode_number === d.episodeNumber ? { ...n, episode_watched: d.watched } : n
          )
        );
        // Desmarcado: as marcações locais saem e vale o estado do servidor.
        if (!d.watched) setEpisodiosMarcados({});
      }
      fetchNotifications();
    };
    window.addEventListener('anideck:episodio-atualizado', aoAtualizarEpisodio);
    return () => {
      window.removeEventListener('anideck:episodio-atualizado', aoAtualizarEpisodio);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Optimistic UI: a notificação não some mais da lista, só perde o
      // destaque. O endpoint passou a devolver as lidas junto.
      const agora = new Date().toISOString();
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: agora } : n)));

      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
    } catch (e) {
      console.error('Erro ao ler notificação', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const agora = new Date().toISOString();
      setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: agora })));

      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        showToast('Todas as notificações foram marcadas como lidas.', 'success');
      }
    } catch (e) {
      console.error('Erro ao marcar todas como lidas', e);
    }
  };

  const marcarEpisodioVistoRapido = async (n: AppNotification) => {
    if (marcandoEp[n.id] || episodiosMarcados[n.id] || n.episode_watched) return;
    setMarcandoEp(prev => ({ ...prev, [n.id]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/entries/${n.mal_id}/episodes/${n.episode_number}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const agora = new Date().toISOString();
        setEpisodiosMarcados(prev => ({ ...prev, [n.id]: true }));
        setNotifications(prev =>
          prev.map(item =>
            item.mal_id === n.mal_id && item.episode_number === n.episode_number
              ? { ...item, episode_watched: true, read_at: item.read_at || agora }
              : item
          )
        );
        invalidarCachesDoDeck(session.user.id);
        if (!n.read_at) {
          await markAsRead(n.id);
        }
        window.dispatchEvent(
          new CustomEvent('anideck:episodio-atualizado', {
            detail: { malId: n.mal_id, episodeNumber: n.episode_number, watched: true },
          })
        );
        showToast(`Ep. ${n.episode_number} de ${n.anime_title || 'Anime'} marcado como visto!`, 'success');
      } else {
        showToast('Não foi possível marcar o episódio.', 'error');
      }
    } catch (e) {
      console.error('Erro ao marcar episódio rapidamente:', e);
      showToast('Erro de conexão ao marcar episódio.', 'error');
    } finally {
      setMarcandoEp(prev => ({ ...prev, [n.id]: false }));
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!('Notification' in window)) {
        showToast('Seu navegador/dispositivo não suporta notificações nativas.', 'error');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Permissão de notificação negada.', 'error');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        showToast('Chave VAPID não detectada no ambiente (Render).', 'error');
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        setPushEnabled(true);
        showToast('Notificações ativas neste dispositivo!', 'success');
      }
    } catch (error) {
      console.error('Erro ao assinar push:', error);
      showToast('Erro ao ativar notificações nativas.', 'error');
    }
  };

  const abrir = () => {
    setIsOpen(true);
    // Rebusca ao abrir: o sino fica montado a viagem inteira do usuário, e sem
    // isso a lista congelaria no que foi carregado no boot da página.
    fetchNotifications();
  };

  const visiveis = filtroAba === 'nao_lidas'
    ? notifications.filter(n => !n.read_at)
    : notifications;

  const agrupadas = ORDEM_GRUPOS
    .map(grupo => ({ grupo, itens: visiveis.filter(n => grupoDe(n.created_at) === grupo) }))
    .filter(g => g.itens.length > 0);

  return (
    <>
      <button
        onClick={abrir}
        aria-label={naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'}
        className="relative w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3 cursor-pointer select-none"
        title="Notificações"
      >
        <Bell size={16} />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-void border border-void">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Notificações" maxWidthClass="md:max-w-md">
        {!pushEnabled && (
          <button
            onClick={subscribeToPush}
            className="w-full mb-4 flex items-center justify-center gap-2 text-xs font-bold bg-holo-3/10 text-holo-3 px-3 py-2.5 rounded-xl border border-holo-3/30 hover:bg-holo-3/20 transition-colors cursor-pointer"
          >
            <BellOff size={14} /> Ativar notificações neste aparelho
          </button>
        )}

        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-line">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFiltroAba('todas')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  filtroAba === 'todas'
                    ? 'bg-holo-3/20 text-holo-3 border border-holo-3/40'
                    : 'bg-panel-2 text-muted border border-line hover:text-text'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroAba('nao_lidas')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  filtroAba === 'nao_lidas'
                    ? 'bg-holo-3/20 text-holo-3 border border-holo-3/40'
                    : 'bg-panel-2 text-muted border border-line hover:text-text'
                }`}
              >
                Não lidas ({naoLidas})
              </button>
            </div>

            {naoLidas > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-holo-1 bg-holo-1/10 border border-holo-1/30 hover:bg-holo-1/20 transition-colors cursor-pointer"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={13} /> Ler todas
              </button>
            )}
          </div>
        )}

        {visiveis.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="mx-auto text-muted-2 mb-3" />
            <p className="text-sm font-bold text-text">
              {filtroAba === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Tudo em dia'}
            </p>
            <p className="text-xs text-muted mt-1">
              {filtroAba === 'nao_lidas'
                ? 'Você já conferiu todos os avisos recentes.'
                : 'Avisamos aqui quando sair episódio novo do que você está assistindo.'}
            </p>
          </div>
        ) : (
          // -mx-6 vaza o padding do Sheet para as linhas irem de ponta a ponta,
          // como numa lista de app nativo.
          <div className="-mx-6">
            {agrupadas.map(({ grupo, itens }) => (
              <div key={grupo}>
                <p className="px-6 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-2">
                  {grupo}
                </p>
                {itens.map(n => {
                  const ehConviteBeta = n.mal_id === 0 || n.anime_image === 'beta_invite';
                  const epJaVisto = Boolean(n.episode_watched || episodiosMarcados[n.id]);

                  if (ehConviteBeta) {
                    const { nome, email } = extrairDadosConviteBeta(n.anime_title);
                    return (
                      <div
                        key={n.id}
                        className={`px-6 py-3.5 flex items-start gap-3.5 border-b border-line last:border-b-0 transition-colors hover:bg-panel-2 ${
                          n.read_at ? 'opacity-65' : 'bg-gold/[0.04]'
                        }`}
                      >
                        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center">
                          <UserPlus size={20} />
                          {!n.read_at && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gold border-2 border-panel" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] font-bold tracking-wider uppercase">
                              Convite Beta
                            </span>
                            <span className="text-[11px] text-muted-2 font-mono">
                              • {tempoRelativo(n.created_at)}
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-text leading-snug">
                            {nome} solicitou acesso ao AniDeck
                          </p>
                          {email && (
                            <p className="text-[11.5px] text-holo-3 font-mono truncate mt-0.5">
                              {email}
                            </p>
                          )}

                          {email && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(email);
                                    showToast(`E-mail ${email} copiado!`, 'success');
                                    if (!n.read_at) markAsRead(n.id);
                                  } catch {
                                    showToast('Não foi possível copiar o e-mail.', 'error');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-panel-2 hover:bg-gold/15 border border-line hover:border-gold/40 text-text hover:text-gold text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <Copy size={11} /> Copiar e-mail
                              </button>
                            </div>
                          )}
                        </div>

                        {!n.read_at && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-muted hover:text-green transition-colors p-1.5 cursor-pointer flex-shrink-0"
                            title="Marcar como lida" aria-label="Marcar notificação como lida"
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={n.id}
                      className={`px-6 py-3.5 flex items-start gap-3.5 border-b border-line last:border-b-0 transition-colors hover:bg-panel-2 ${
                        n.read_at ? 'opacity-65' : 'bg-holo-3/[0.03]'
                      }`}
                    >
                      <Link
                        to={`/anime/${n.mal_id}`}
                        onClick={() => {
                          if (!n.read_at) markAsRead(n.id);
                          setIsOpen(false);
                        }}
                        className="relative flex-shrink-0"
                      >
                        {n.anime_image ? (
                          <img src={n.anime_image} alt="" className="w-14 h-20 object-cover rounded-lg border border-line shadow-sm" />
                        ) : (
                          <div className="w-14 h-20 rounded-lg bg-panel-2 border border-line" />
                        )}
                        {!n.read_at && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-holo-3 border-2 border-panel" />
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/anime/${n.mal_id}`}
                          onClick={() => {
                            if (!n.read_at) markAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="block group"
                        >
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full bg-holo-3/15 border border-holo-3/30 text-holo-3 text-[10px] font-bold tracking-wider uppercase">
                              EP. {n.episode_number}
                            </span>
                            <span className="text-[11px] text-muted-2 font-mono">
                              • {tempoRelativo(n.created_at)}
                            </span>
                          </div>
                          <p className="text-[13px] font-bold text-text leading-snug line-clamp-2 group-hover:text-holo-3 transition-colors">
                            {n.anime_title || 'Anime'}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {epJaVisto
                              ? `Você já assistiu ao episódio ${n.episode_number}.`
                              : `Episódio ${n.episode_number} já está disponível.`}
                          </p>
                        </Link>

                        <div className="mt-2 flex items-center gap-2">
                          {epJaVisto ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green/15 border border-green/30 text-green text-[11px] font-bold">
                              <Check size={12} /> Ep. {n.episode_number} visto
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={marcandoEp[n.id]}
                              onClick={() => marcarEpisodioVistoRapido(n)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-panel-2 hover:bg-holo-1/15 border border-line hover:border-holo-1/40 text-text hover:text-holo-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Plus size={12} />
                              {marcandoEp[n.id] ? 'Marcando...' : `Marcar Ep. ${n.episode_number} visto`}
                            </button>
                          )}
                        </div>
                      </div>

                      {!n.read_at && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="text-muted hover:text-green transition-colors p-1.5 cursor-pointer flex-shrink-0"
                          title="Marcar como lida" aria-label="Marcar notificação como lida"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}