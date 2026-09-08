import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
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

  const agrupadas = ORDEM_GRUPOS
    .map(grupo => ({ grupo, itens: notifications.filter(n => grupoDe(n.created_at) === grupo) }))
    .filter(g => g.itens.length > 0);

  return (
    <>
      <button
        onClick={abrir}
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

        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={28} className="mx-auto text-muted-2 mb-3" />
            <p className="text-sm font-bold text-text">Tudo em dia</p>
            <p className="text-xs text-muted mt-1">
              Avisamos aqui quando sair episódio novo do que você está assistindo.
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
                {itens.map(n => (
                  <div
                    key={n.id}
                    className={`px-6 py-3 flex items-center gap-3 border-b border-line last:border-b-0 transition-colors hover:bg-panel-2 ${
                      n.read_at ? 'opacity-55' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {n.anime_image ? (
                        <img src={n.anime_image} alt="" className="w-12 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-12 h-16 rounded-lg bg-panel-2 border border-line" />
                      )}
                      {!n.read_at && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-holo-3 border-2 border-panel" />
                      )}
                    </div>

                    <Link
                      to={`/anime/${n.mal_id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex-1 min-w-0"
                    >
                      <p className="text-[13px] text-text leading-snug line-clamp-2">
                        <b className="font-bold">{n.anime_title || 'Anime'}</b>
                        {' — '}
                        Episódio {n.episode_number} já está disponível.
                      </p>
                      <p className="text-[11px] text-muted-2 mt-1">{tempoRelativo(n.created_at)}</p>
                    </Link>

                    {/* BUG CORRIGIDO: antes ficava escondido atrás de opacity-0
                        group-hover:opacity-100, que nunca aparece em tela de toque
                        (não existe :hover no celular). Agora fica sempre visível. */}
                    {!n.read_at && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-muted hover:text-green transition-colors p-1.5 cursor-pointer flex-shrink-0"
                        title="Marcar como lido"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </>
  );
}