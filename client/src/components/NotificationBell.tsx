import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface AppNotification {
  id: string;
  mal_id: number;
  anime_title: string | null;
  anime_image: string | null; // <-- Adicionado para a imagem do pôster
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

  // Confirma se já existe uma inscrição de push ATIVA neste navegador/dispositivo
  // (diferente de só ter permissão concedida).
  const markAsRead = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Optimistic UI na notificação
      setNotifications(prev => prev.filter(n => n.id !== id));
      
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

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-full border border-line bg-panel text-muted flex items-center justify-center transition-all hover:border-holo-3 hover:text-holo-3 cursor-pointer select-none"
        title="Notificações"
      >
        <Bell size={16} />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-void border border-void">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-panel-2 border border-line rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-line flex justify-between items-center bg-panel">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Avisos</span>
            {!pushEnabled && (
              <button onClick={subscribeToPush} className="text-[10px] bg-holo-3/10 text-holo-3 px-2 py-1 rounded border border-holo-3/30 hover:bg-holo-3/20 transition-colors">
                Ativar Nativo
              </button>
            )}
          </div>
          
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted text-xs">
                Tudo em dia!
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="p-3 border-b border-line hover:bg-panel transition-colors flex items-center gap-3">
                  {/* Pôster do anime adicionado aqui */}
                  {n.anime_image && (
                    <img src={n.anime_image} alt="" className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
                  )}
                  <Link
                    to={`/anime/${n.mal_id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-xs text-text mb-1">
                      <b>{n.anime_title || 'Anime'}</b> — Episódio {n.episode_number} já está disponível.
                    </p>
                  </Link>
                  {/* BUG CORRIGIDO: antes ficava escondido atrás de opacity-0 group-hover:opacity-100,
                      que nunca aparece em tela de toque (não existe :hover no celular). Agora fica
                      sempre visível. */}
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-muted hover:text-green transition-opacity p-1 cursor-pointer flex-shrink-0"
                    title="Marcar como lido"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}