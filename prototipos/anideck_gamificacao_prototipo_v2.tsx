// Esses protótipo são rascunhos para inspiração, não é regra. Ainda em fase de planejamento
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  TrendingUp,
  User,
  Layers,
  Settings,
  MessageSquare,
  HelpCircle,
  Info,
  Lock,
  Unlock,
  ChevronRight,
  RotateCcw,
  Plus,
  Eye,
  Star,
  Sliders,
  Calendar,
  Zap,
  ArrowUpRight,
  AlertTriangle,
  Send,
  Trash2,
  BookOpen,
  Film
} from 'lucide-react';

const DESIGN_SYSTEM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root {
    --void: #0A0714;
    --panel: #130F22;
    --panel-2: #181330;
    --line: #2B2247;
    --text: #F1EEFA;
    --muted: #A79BC9;
    --muted-2: #6B5F94;
    --holo-1: #FF4FD8;
    --holo-2: #7B5CFF;
    --holo-3: #3FE0F0;
    --gold: #FFC542;
    --green: #a0ff78;
    --coral: #FF5C6C;
  }

  .font-title {
    font-family: 'Anton', sans-serif;
    letter-spacing: 0.05em;
  }

  .font-body {
    font-family: 'Manrope', sans-serif;
  }

  .font-mono-code {
    font-family: 'JetBrains Mono', monospace;
  }

  .holo-gradient-bg {
    background: linear-gradient(90deg, #FF4FD8 0%, #7B5CFF 45%, #3FE0F0 100%);
  }

  .holo-border {
    position: relative;
    border: 1px solid transparent;
    background-clip: padding-box;
  }
  .holo-border::after {
    content: '';
    position: absolute;
    top: -1px; bottom: -1px; left: -1px; right: -1px;
    background: linear-gradient(135deg, #FF4FD8, #7B5CFF 40%, #3FE0F0);
    z-index: -1;
    border-radius: inherit;
  }

  .foil-shine {
    position: relative;
    overflow: hidden;
  }
  .foil-shine::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 35%,
      rgba(255, 79, 216, 0.15) 45%,
      rgba(63, 224, 240, 0.25) 50%,
      rgba(123, 92, 255, 0.15) 55%,
      transparent 65%
    );
    transform: rotate(25deg);
    pointer-events: none;
    transition: transform 0.6s ease;
  }
  .foil-shine:hover::before {
    transform: rotate(25deg) translate(20%, 20%);
  }

  /* Custom scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #0A0714;
  }
  ::-webkit-scrollbar-thumb {
    background: #2B2247;
    border-radius: 99px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #7B5CFF;
  }
`;

const INITIAL_RANKS = [
  { rank: 'F', minLvl: 1, maxLvl: 5, title: 'Calouro da Guilda', color: '#6B5F94' },
  { rank: 'E', minLvl: 6, maxLvl: 12, title: 'Explorador Novato', color: '#3FE0F0' },
  { rank: 'D', minLvl: 13, maxLvl: 20, title: 'Aventureiro de Bronze', color: '#a0ff78' },
  { rank: 'C', minLvl: 21, maxLvl: 35, title: 'Rastreador de Prata', color: '#7B5CFF' },
  { rank: 'B', minLvl: 36, maxLvl: 50, title: 'Veterano de Ouro', color: '#FFC542' },
  { rank: 'A', minLvl: 51, maxLvl: 70, title: 'Cavaleiro de Platina', color: '#FF4FD8' },
  { rank: 'S', minLvl: 71, maxLvl: 90, title: 'Lenda Esmeralda', color: '#3FE0F0' },
  { rank: 'SS', minLvl: 91, maxLvl: 100, title: 'Soberano Mítico', color: '#FF4FD8' }
];

const INITIAL_GENRES = {
  Shounen: { points: 620, tier: 4, label: 'Especialista Consagrado', historyCount: 42, decayRate: '0.98x/mês' },
  Cyberpunk: { points: 410, tier: 3, label: 'Conhecedor de Vanguarda', historyCount: 19, decayRate: '0.98x/mês' },
  Romance: { points: 140, tier: 2, label: 'Apreciador', historyCount: 11, decayRate: '0.95x/mês' },
  Isekai: { points: 90, tier: 1, label: 'Iniciante', historyCount: 6, decayRate: '0.99x/mês' },
  Psicológico: { points: 280, tier: 3, label: 'Analista Frequente', historyCount: 16, decayRate: '0.96x/mês' }
};

const INITIAL_BADGES = [
  { id: 'foil-1', title: 'Pioneiro da Temporada', desc: 'Assistiu 5 estreias nas primeiras 24h', rarity: 'Mítica Holográfica', icon: '⚡', unlocked: true, gradient: 'from-[#FF4FD8] via-[#7B5CFF] to-[#3FE0F0]' },
  { id: 'foil-2', title: 'Mestre dos Shounens', desc: 'Atingiu afinidade Tier 4 em Shounen', rarity: 'Ouro Lendário', icon: '⚔️', unlocked: true, gradient: 'from-[#FFC542] via-[#FF5C6C] to-[#7B5CFF]' },
  { id: 'foil-3', title: 'Sintonia Cyberpunk', desc: 'Acervo superior a 15 clássicos sci-fi', rarity: 'Ciano Neon', icon: '🦾', unlocked: true, gradient: 'from-[#3FE0F0] via-[#7B5CFF] to-[#130F22]' },
  { id: 'foil-4', title: 'Voz da Guilda (SS)', desc: 'Alcançou o cobiçado Rank S ou SS', rarity: 'Ancestral Foil', icon: '👑', unlocked: false, gradient: 'from-[#6B5F94] to-[#2B2247]' }
];

const INITIAL_SS_WATCHING = [
  { title: 'Frieren: Beyond Journey\'s End T2', genre: 'Fantasia / Shounen', ssRatio: 9, totalSS: 10, trend: '+3 esta semana', status: 'Em Alta Geral', cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80' },
  { title: 'Chainsaw Man — Reze Arc', genre: 'Ação / Sobrenatural', ssRatio: 8, totalSS: 10, trend: 'Estreia Recente', status: 'Favorito Consensual', cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80' },
  { title: 'Solo Leveling: Arise', genre: 'Ação / Fantasia', ssRatio: 7, totalSS: 10, trend: 'Maratona Comum', status: 'Em Dia', cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80' },
  { title: 'Isekai Genérico da Espada Santa #9', genre: 'Isekai', ssRatio: 1, totalSS: 10, droppedBySS: 6, trend: 'Drop Massivo', status: 'Alerta de Baixa Adesão', cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80' }
];

const ANIME_EPISODES_MOCK = [
  { epNum: 1, title: 'O Fim da Jornada dos Heróis', watched: true, airedAt: 'Hoje às 02:00', isNew: false, earlyBonusEligible: false },
  { epNum: 2, title: 'A Magia Que Não Serve Para Nada', watched: true, airedAt: 'Hoje às 02:00', isNew: false, earlyBonusEligible: false },
  { epNum: 3, title: 'Feitiço de Flores', watched: true, airedAt: 'Hoje às 02:00', isNew: false, earlyBonusEligible: false },
  { epNum: 4, title: 'A Terra Onde as Almas Descansam', watched: false, airedAt: 'Lançado hoje (Temporada)', isNew: true, earlyBonusEligible: true },
  { epNum: 5, title: 'O Fantasma de Eisen', watched: false, airedAt: 'Próxima sexta-feira', isNew: false, earlyBonusEligible: false },
  { epNum: 6, title: 'A Dança de Graf Granat', watched: false, airedAt: 'Em 12 dias', isNew: false, earlyBonusEligible: false }
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('guild_card'); // 'guild_card' | 'tracker' | 'ss_showcase' | 'comments' | 'admin_economy'
  
  // User Core State
  const [userLevel, setUserLevel] = useState(24);
  const [userXP, setUserXP] = useState(480);
  const [xpToNextLevel, setXpToNextLevel] = useState(600);
  const [dailyEpisodesCount, setDailyEpisodesCount] = useState(3);
  const [streakDays, setStreakDays] = useState(14);
  const [isEventActive, setIsEventActive] = useState(false);

  // Dual Currency: Genre Affinity State
  const [genreAffinities, setGenreAffinities] = useState(INITIAL_GENRES);

  // XP Gain Ledger (Historical records with immutable gained amounts)
  const [xpLedger, setXpLedger] = useState([
    { id: 'log-1', anime: 'Frieren', ep: 1, gainedXP: 25, reason: 'Episódio Base (100%)', timestamp: '10:14:20' },
    { id: 'log-2', anime: 'Frieren', ep: 2, gainedXP: 25, reason: 'Episódio Base (100%)', timestamp: '10:38:05' },
    { id: 'log-3', anime: 'Frieren', ep: 3, gainedXP: 18, reason: 'Episódio Base (Retorno Decrescente 75%)', timestamp: '11:02:11' }
  ]);

  // Anime Episode List interactive
  const [episodes, setEpisodes] = useState(ANIME_EPISODES_MOCK);

  // Economy Configuration State (Live Admin editable)
  const [economyConfig, setEconomyConfig] = useState({
    baseEpXP: 25,
    earlyBonusXP: 10,
    dailyCapSoftLimit: 3, // after this, diminishing returns apply
    diminishingRates: [1.0, 1.0, 0.75, 0.5, 0.2],
    multiplierActive: 2.0,
    eventWindowStart: '2026-09-07T00:00:00Z',
    eventWindowEnd: '2026-09-14T23:59:59Z'
  });

  // Curation Suggestions queue (for Olheiro)
  const [curationQueue, setCurationQueue] = useState([
    { id: 'c-1', animeTitle: 'Vagabond (Adaptação Teórica)', proposedBy: 'Você (Rank C)', reason: 'Falta grade de episódios cadastrada', status: 'Em Análise pelo Admin' },
    { id: 'c-2', animeTitle: 'Grand Blue Dreaming S2', proposedBy: 'Akira_99 (Rank A)', reason: 'Ajuste de horário de estreia no Japão', status: 'Aprovado' }
  ]);
  const [newSuggestion, setNewSuggestion] = useState('');

  // Comment section in detail view
  const [comments, setComments] = useState([
    { id: 'cmt-1', author: 'Renato_SS', rank: 'SS', genreTier: 4, genre: 'Shounen', text: 'A animação do episódio 4 manteve o padrão de cinema da Madhouse. Direção de storyboard impecável.', date: 'Há 2 horas', verifiedSpecialist: true },
    { id: 'cmt-2', author: 'Kurogane', rank: 'B', genreTier: 3, genre: 'Shounen', text: 'O ritmo desacelera comparado ao mangá, mas aprofunda muito a melancolia dos elfos.', date: 'Há 4 horas', verifiedSpecialist: true }
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);

  // V2: objetivos curtos e acionáveis, sem transformar lazer em obrigação
  const [missions, setMissions] = useState([
    { id: 'm1', icon: '⚡', title: 'Acompanhe uma estreia', desc: 'Assista um episódio de uma obra em lançamento.', reward: 40, progress: 0, total: 1, done: false },
    { id: 'm2', icon: '⚔️', title: 'Especialista em Shounen', desc: 'Continue explorando seu gênero de maior afinidade.', reward: 25, progress: 2, total: 3, done: false },
    { id: 'm3', icon: '🌟', title: 'Descoberta da semana', desc: 'Inicie um anime que ainda não estava no seu histórico.', reward: 30, progress: 1, total: 1, done: true }
  ]);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentRankInfo = useMemo(() => {
    const found = INITIAL_RANKS.find(r => userLevel >= r.minLvl && userLevel <= r.maxLvl);
    return found || INITIAL_RANKS[INITIAL_RANKS.length - 1];
  }, [userLevel]);

  // Diminishing returns calculation
  const getExpectedXPForNextEpisode = (isEarly = false) => {
    const index = Math.min(dailyEpisodesCount, economyConfig.diminishingRates.length - 1);
    const rate = economyConfig.diminishingRates[index];
    let xp = Math.round(economyConfig.baseEpXP * rate);
    if (isEarly) xp += economyConfig.earlyBonusXP;
    if (isEventActive) xp *= economyConfig.multiplierActive;
    return { xp, rate };
  };

  const handleToggleEpisode = (epNum) => {
    const target = episodes.find(e => e.epNum === epNum);
    if (!target) return;

    if (!target.watched) {
      // Mark as watched: Calculate current exact XP based on immutable rules
      const { xp, rate } = getExpectedXPForNextEpisode(target.earlyBonusEligible);
      
      const newLog = {
        id: `log-${Date.now()}`,
        anime: 'Frieren',
        ep: epNum,
        gainedXP: xp,
        reason: target.earlyBonusEligible
          ? `Episódio no Lançamento (+${economyConfig.earlyBonusXP} bônus precoce) [taxa: ${rate * 100}%]`
          : `Episódio assistido [taxa diária: ${rate * 100}%]`,
        timestamp: new Date().toLocaleTimeString('pt-BR')
      };

      // Update episodes
      setEpisodes(prev => prev.map(e => e.epNum === epNum ? { ...e, watched: true } : e));
      
      // Update ledger
      setXpLedger(prev => [newLog, ...prev]);

      // Update XP and check level up
      const updatedXP = userXP + xp;
      setDailyEpisodesCount(prev => prev + 1);

      if (updatedXP >= xpToNextLevel) {
        setUserLevel(prev => prev + 1);
        setUserXP(updatedXP - xpToNextLevel);
        setXpToNextLevel(prev => Math.round(prev * 1.18));
        showToast(`🎉 SUBIU DE NÍVEL! Agora você é Nível ${userLevel + 1} (${currentRankInfo.rank})!`, 'success');
      } else {
        setUserXP(updatedXP);
        showToast(`+${xp} XP registrado no histórico! (${newLog.reason})`, 'success');
      }

      // Also gently increment active genre affinity for this recent watch
      setGenreAffinities(prev => ({
        ...prev,
        Shounen: {
          ...prev.Shounen,
          points: prev.Shounen.points + 8
        }
      }));

    } else {
      // UNMARK EPISODE: Rule from VISION: desmarcar devolve EXATAMENTE o que foi gravado no momento do ganho
      const recordedLog = xpLedger.find(l => l.anime === 'Frieren' && l.ep === epNum);
      const refundXP = recordedLog ? recordedLog.gainedXP : economyConfig.baseEpXP;

      setEpisodes(prev => prev.map(e => e.epNum === epNum ? { ...e, watched: false } : e));
      setXpLedger(prev => prev.filter(l => !(l.anime === 'Frieren' && l.ep === epNum)));
      
      setUserXP(prev => Math.max(0, prev - refundXP));
      setDailyEpisodesCount(prev => Math.max(0, prev - 1));

      showToast(`↩️ Episódio desmarcado: ${refundXP} XP devolvido exatamente como gravado.`, 'warning');
    }
  };

  const handleImportBacklog = () => {
    // Demonstration of Dual Currency:
    // Adding 50 backlog completed animes increases Genre Affinity significantly, but does NOT inflate user Rank XP.
    setGenreAffinities(prev => ({
      ...prev,
      Shounen: { ...prev.Shounen, points: prev.Shounen.points + 350, historyCount: prev.Shounen.historyCount + 30, tier: 5, label: 'Lenda do Shounen' },
      Psicológico: { ...prev.Psicológico, points: prev.Psicológico.points + 210, historyCount: prev.Psicológico.historyCount + 20, tier: 4, label: 'Especialista Supremo' }
    }));

    showToast('📚 50 animes passados importados para o acervo! Afinidade de gênero disparou. Seu Rank/Nível permaneceu intacto (Anti-Farm protegido).', 'info');
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    
    // Check if user has required affinity or rank
    const shounenAffinity = genreAffinities.Shounen?.tier || 1;
    if (shounenAffinity < 3 && userLevel < 20) {
      showToast('🔒 Privilégio bloqueado: Você precisa de Tier 3 de Afinidade em Shounen ou Rank D para comentar.', 'error');
      return;
    }

    const newCmt = {
      id: `cmt-${Date.now()}`,
      author: 'Você (Aventureiro)',
      rank: currentRankInfo.rank,
      genreTier: shounenAffinity,
      genre: 'Shounen',
      text: newCommentText.trim(),
      date: 'Agora mesmo',
      verifiedSpecialist: shounenAffinity >= 3
    };

    setComments(prev => [newCmt, ...prev]);
    setNewCommentText('');
    showToast('💬 Comentário de especialista publicado com sucesso (Sanitizado bluemonday).', 'success');
  };

  const handleSuggestCuration = () => {
    if (!newSuggestion.trim()) return;

    if (userLevel < 15) {
      showToast('🔒 Requer Rank D (Nível 15+) para sugerir obras à fila de curadoria.', 'error');
      return;
    }

    const item = {
      id: `c-${Date.now()}`,
      animeTitle: newSuggestion.trim(),
      proposedBy: `Você (${currentRankInfo.rank} - Lv.${userLevel})`,
      reason: 'Sugerido para revisão na Fila do Olheiro',
      status: 'Pendente no Painel Admin'
    };

    setCurationQueue(prev => [item, ...prev]);
    setNewSuggestion('');
    showToast('📋 Sugestão enviada para a fila do Olheiro no Admin!', 'success');
  };

  return (
    <div className="min-h-screen bg-[#0A0714] text-[#F1EEFA] font-body flex flex-col selection:bg-[#7B5CFF] selection:text-white">
      <style>{DESIGN_SYSTEM_STYLES}</style>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#181330] border border-[#2B2247] shadow-2xl animate-fade-in">
          {toastMessage.type === 'success' && <Sparkles className="w-5 h-5 text-[#a0ff78]" />}
          {toastMessage.type === 'warning' && <RotateCcw className="w-5 h-5 text-[#FFC542]" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-[#FF5C6C]" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-[#3FE0F0]" />}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0A0714]/90 backdrop-blur-md border-b border-[#2B2247] px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl holo-gradient-bg flex items-center justify-center font-title text-black text-xl shadow-lg shadow-[#7B5CFF]/30">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-title text-xl tracking-wider text-white">ANIDECK</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code bg-[#FF4FD8]/20 text-[#FF4FD8] border border-[#FF4FD8]/40">
                GUILD EXPANSION v2.0
              </span>
            </div>
            <p className="text-xs text-[#A79BC9] hidden sm:block">Protótipo V2 — Jornada de Aventureiro</p>
          </div>
        </div>

        {/* User Mini Status Banner */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 bg-[#130F22] border border-[#2B2247] px-3.5 py-1.5 rounded-full">
            <div className="flex items-center gap-1.5 text-xs text-[#FFC542]">
              <Flame className="w-4 h-4 fill-current text-[#FFC542]" />
              <span className="font-bold font-mono-code">{streakDays} dias</span>
            </div>
            <div className="w-px h-3.5 bg-[#2B2247]" />
            <div className="text-xs flex items-center gap-1.5 font-mono-code">
              <span className="text-[#A79BC9]">Rank:</span>
              <span className="font-bold text-white px-1.5 py-0.2 rounded" style={{ backgroundColor: `${currentRankInfo.color}30`, color: currentRankInfo.color }}>
                {currentRankInfo.rank}
              </span>
            </div>
            <div className="w-px h-3.5 bg-[#2B2247]" />
            <div className="text-xs font-mono-code text-[#3FE0F0]">
              Lv. {userLevel}
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('admin_economy')}
            className={`p-2 rounded-full border transition-all ${
              activeTab === 'admin_economy' 
                ? 'bg-[#FF4FD8]/20 border-[#FF4FD8] text-[#FF4FD8]' 
                : 'bg-[#181330] border-[#2B2247] text-[#A79BC9] hover:text-white'
            }`}
            title="Painel de Configuração da Economia de XP"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <nav className="bg-[#130F22] border-b border-[#2B2247] px-4 lg:px-8 overflow-x-auto flex items-center gap-2 py-2">
        {[
          { id: 'guild_card', label: 'Minha Guilda', icon: Shield },
          { id: 'tracker', label: 'Atividade & XP', icon: Zap },
          { id: 'ss_showcase', label: 'Radar dos Mestres', icon: Eye },
          { id: 'comments', label: 'Especialistas', icon: MessageSquare },
          { id: 'admin_economy', label: 'Admin', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'holo-gradient-bg text-black font-semibold shadow-md shadow-[#7B5CFF]/20'
                  : 'text-[#A79BC9] hover:text-white hover:bg-[#181330]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Interactive Body */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">

        {/* TAB 1: GUILD CARD & DUAL CURRENCIES */}
        {activeTab === 'guild_card' && (
          <div className="space-y-8 animate-fade-in">
            {/* V2 — experiência principal: mostrar jornada, objetivos e recompensas antes da mecânica */}
            <section className="space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-mono-code uppercase tracking-[0.2em] text-[#FF4FD8]">Sua jornada na Guilda</div>
                  <h1 className="text-3xl md:text-4xl font-title text-white mt-1">VOCÊ ESTÁ NO RANK {currentRankInfo.rank}</h1>
                  <p className="text-sm text-[#A79BC9] mt-1">{currentRankInfo.title}. Continue acompanhando seus animes normalmente e deixe a progressão acontecer.</p>
                </div>
                <button onClick={handleImportBacklog} className="self-start lg:self-auto px-4 py-2 text-xs font-mono-code font-semibold rounded-full bg-[#181330] hover:bg-[#2B2247] text-[#3FE0F0] border border-[#3FE0F0]/40 transition flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Simular importação
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 bg-[#130F22] border border-[#7B5CFF]/40 rounded-2xl p-5 md:p-6 foil-shine">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-xl holo-gradient-bg p-0.5">
                          <div className="w-full h-full rounded-[10px] bg-[#0A0714] flex items-center justify-center font-title text-white text-lg">AK</div>
                        </div>
                        <div>
                          <div className="font-bold text-white">Akira Kurusu</div>
                          <div className="text-xs text-[#A79BC9]">Licença de Aventureiro • ativa</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono-code text-[#A79BC9] uppercase">Nível</div>
                      <div className="text-2xl font-title text-[#3FE0F0]">{userLevel}</div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between text-xs font-mono-code mb-2">
                      <span className="text-white">Progresso para o próximo nível</span>
                      <span className="text-[#3FE0F0]">{userXP} / {xpToNextLevel} XP</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#0A0714] border border-[#2B2247] p-0.5">
                      <div className="h-full rounded-full holo-gradient-bg transition-all duration-500" style={{ width: `${Math.min(100, (userXP / xpToNextLevel) * 100)}%` }} />
                    </div>
                    <div className="mt-2 text-[11px] text-[#6B5F94] font-mono-code">Faltam {Math.max(0, xpToNextLevel - userXP)} XP para o nível {userLevel + 1}</div>
                  </div>

                  <div className="mt-6 flex items-center gap-1 overflow-hidden">
                    {INITIAL_RANKS.map((r, i) => (
                      <React.Fragment key={r.rank}>
                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-title border ${r.rank === currentRankInfo.rank ? 'text-black border-transparent shadow-lg' : 'text-[#6B5F94] border-[#2B2247] bg-[#0A0714]'}`} style={r.rank === currentRankInfo.rank ? { backgroundColor: r.color } : undefined}>{r.rank}</div>
                        {i < INITIAL_RANKS.length - 1 && <div className="h-px flex-1 bg-[#2B2247]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-4 grid grid-cols-3 lg:grid-cols-1 gap-3">
                  <div className="bg-[#130F22] border border-[#2B2247] rounded-2xl p-4"><div className="text-[10px] text-[#A79BC9] font-mono-code uppercase">Sequência</div><div className="text-xl font-title text-[#FFC542] mt-1">🔥 {streakDays} dias</div><div className="text-[10px] text-[#6B5F94] mt-1">elogio, não obrigação</div></div>
                  <div className="bg-[#130F22] border border-[#2B2247] rounded-2xl p-4"><div className="text-[10px] text-[#A79BC9] font-mono-code uppercase">Afinidade principal</div><div className="text-xl font-title text-[#a0ff78] mt-1">T{genreAffinities.Shounen.tier} Shounen</div><div className="text-[10px] text-[#6B5F94] mt-1">{genreAffinities.Shounen.points} pontos</div></div>
                  <div className="bg-[#130F22] border border-[#2B2247] rounded-2xl p-4"><div className="text-[10px] text-[#A79BC9] font-mono-code uppercase">Coleção</div><div className="text-xl font-title text-[#FF4FD8] mt-1">3 / 4</div><div className="text-[10px] text-[#6B5F94] mt-1">insígnias desbloqueadas</div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-[#130F22] border border-[#2B2247] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4"><div><div className="text-[10px] font-mono-code text-[#FF4FD8] uppercase">Próximos objetivos</div><h2 className="font-title text-lg text-white">O QUE ESTÁ AO SEU ALCANCE</h2></div><Sparkles className="w-5 h-5 text-[#FFC542]" /></div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-[#181330] border border-[#2B2247]"><div className="flex justify-between gap-3"><span className="text-sm font-bold text-white">⚡ Chegar ao Rank {INITIAL_RANKS.find(r => r.minLvl > userLevel)?.rank || 'SS'}</span><span className="text-[10px] font-mono-code text-[#3FE0F0]">nível {INITIAL_RANKS.find(r => r.minLvl > userLevel)?.minLvl || 100}</span></div><div className="h-1.5 bg-[#0A0714] rounded-full mt-2 overflow-hidden"><div className="h-full holo-gradient-bg rounded-full" style={{ width: `${Math.min(100, ((userLevel - currentRankInfo.minLvl + 1) / (currentRankInfo.maxLvl - currentRankInfo.minLvl + 1)) * 100)}%` }} /></div></div>
                    <div className="p-3 rounded-xl bg-[#181330] border border-[#2B2247]"><div className="flex justify-between gap-3"><span className="text-sm font-bold text-white">⚔️ Mestre dos Shounens</span><span className="text-[10px] font-mono-code text-[#a0ff78]">Tier {genreAffinities.Shounen.tier}</span></div><p className="text-[11px] text-[#A79BC9] mt-1">Sua afinidade já está no nível de especialista.</p></div>
                  </div>
                </div>

                <div className="bg-[#130F22] border border-[#2B2247] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4"><div><div className="text-[10px] font-mono-code text-[#3FE0F0] uppercase">Missões naturais</div><h2 className="font-title text-lg text-white">JOGUE DO SEU JEITO</h2></div><Award className="w-5 h-5 text-[#FFC542]" /></div>
                  <div className="space-y-2">
                    {missions.map(m => <div key={m.id} className={`p-3 rounded-xl border ${m.done ? 'bg-[#a0ff78]/5 border-[#a0ff78]/30' : 'bg-[#181330] border-[#2B2247]'}`}><div className="flex items-center gap-3"><div className="text-lg">{m.done ? '✓' : m.icon}</div><div className="flex-1 min-w-0"><div className="text-xs font-bold text-white">{m.title}</div><div className="text-[10px] text-[#A79BC9]">{m.desc}</div></div><div className="text-[10px] font-mono-code text-[#FFC542]">+{m.reward} XP</div></div>{!m.done && <div className="flex items-center gap-2 mt-2"><div className="flex-1 h-1.5 bg-[#0A0714] rounded-full overflow-hidden"><div className="h-full bg-[#3FE0F0] rounded-full" style={{ width: `${(m.progress / m.total) * 100}%` }} /></div><span className="text-[9px] font-mono-code text-[#6B5F94]">{m.progress}/{m.total}</span></div>}</div>)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#181330] border border-[#2B2247] rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-[#A79BC9]"><Info className="w-4 h-4 text-[#3FE0F0]" /> O Rank mede sua atividade atual. Seu acervo antigo alimenta Afinidade, não Rank.</div>
                <button onClick={() => showToast('A mecânica detalhada fica disponível no Tracker e no painel de economia.', 'info')} className="text-xs font-mono-code text-[#3FE0F0] hover:underline flex items-center gap-1">Como funciona <ChevronRight className="w-3 h-3" /></button>
              </div>
            </section>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-4"><div className="h-px flex-1 bg-[#2B2247]" /><span className="text-[10px] font-mono-code text-[#6B5F94] uppercase tracking-widest">Detalhes da progressão</span><div className="h-px flex-1 bg-[#2B2247]" /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Holographic Guild License Card */}
              <div className="lg:col-span-5 space-y-6">
                <div className="relative group">
                  <div className="w-full bg-[#130F22] border border-[#7B5CFF]/40 rounded-2xl p-6 shadow-2xl foil-shine relative overflow-hidden">
                    {/* Decorative Watermark Guild Emblem */}
                    <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                      <Shield className="w-64 h-64 text-[#FF4FD8]" />
                    </div>

                    {/* Top Row: Guild License Header */}
                    <div className="flex items-center justify-between border-b border-[#2B2247] pb-4 mb-4">
                      <div>
                        <span className="text-[10px] font-mono-code uppercase tracking-widest text-[#FF4FD8]">
                          Guilda dos Rastreadores
                        </span>
                        <h2 className="text-lg font-title text-white">LICENÇA DE AVENTUREIRO</h2>
                      </div>
                      <div className="px-3 py-1 rounded-md text-xs font-mono-code font-bold bg-[#181330] border border-[#2B2247] text-[#3FE0F0]">
                        ID #784-BETA
                      </div>
                    </div>

                    {/* Avatar & Rank Big Badge */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl p-0.5 holo-gradient-bg">
                          <div className="w-full h-full bg-[#0A0714] rounded-2xl flex items-center justify-center overflow-hidden">
                            <span className="font-title text-3xl text-white">AK</span>
                          </div>
                        </div>
                        <div 
                          className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-xs font-title font-bold text-black shadow-lg"
                          style={{ backgroundColor: currentRankInfo.color }}
                        >
                          {currentRankInfo.rank}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base truncate">Akira Kurusu</h3>
                          <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#a0ff78]/10 text-[#a0ff78] border border-[#a0ff78]/30 font-mono-code">
                            ATIVO
                          </span>
                        </div>
                        <p className="text-xs text-[#A79BC9]">{currentRankInfo.title}</p>
                        <p className="text-[11px] font-mono-code text-[#FFC542] mt-1">
                          🔥 Streak Atual: {streakDays} dias consecutivos
                        </p>
                      </div>
                    </div>

                    {/* XP & Level Progress Bar */}
                    <div className="bg-[#181330] p-3.5 rounded-xl border border-[#2B2247] mb-6">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-mono-code text-[#A79BC9]">Progresso do Nível {userLevel}</span>
                        <span className="font-mono-code font-bold text-[#3FE0F0]">
                          {userXP} / {xpToNextLevel} XP
                        </span>
                      </div>
                      <div className="w-full bg-[#0A0714] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#2B2247]">
                        <div 
                          className="h-full rounded-full holo-gradient-bg transition-all duration-500"
                          style={{ width: `${Math.min(100, (userXP / xpToNextLevel) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#6B5F94] font-mono-code mt-1.5">
                        <span>Rank Atual: {currentRankInfo.rank}</span>
                        <span>Próximo Rank: {INITIAL_RANKS.find(r => r.minLvl > userLevel)?.rank || 'MAX'}</span>
                      </div>
                    </div>

                    {/* Dual Currency Snapshot Indicators */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2B2247]">
                      <div className="p-2.5 rounded-lg bg-[#0A0714] border border-[#2B2247]">
                        <div className="text-[10px] font-mono-code text-[#A79BC9] uppercase">Ritmo / Rank XP</div>
                        <div className="text-base font-title text-[#FF4FD8]">{userXP + (userLevel * 300)} XP Total</div>
                        <div className="text-[10px] text-[#6B5F94]">Episódios assistidos no tempo</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#0A0714] border border-[#2B2247]">
                        <div className="text-[10px] font-mono-code text-[#A79BC9] uppercase">Afinidade Top Gênero</div>
                        <div className="text-base font-title text-[#a0ff78]">Tier 4 (Shounen)</div>
                        <div className="text-[10px] text-[#6B5F94]">{genreAffinities.Shounen?.points} pts no acervo</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges Collection (Cartas Holográficas Raras) */}
                <div className="bg-[#130F22] border border-[#2B2247] p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#FFC542]" />
                      <h3 className="font-title text-base text-white">INSÍGNIAS HOLOGRÁFICAS</h3>
                    </div>
                    <span className="text-xs font-mono-code text-[#A79BC9]">Coleção Estilo Card Foil</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {INITIAL_BADGES.map(b => (
                      <div 
                        key={b.id}
                        className={`p-3 rounded-xl border relative transition-all duration-300 ${
                          b.unlocked 
                            ? 'bg-[#181330] border-[#7B5CFF]/50 hover:border-[#FF4FD8] shadow-md' 
                            : 'bg-[#0A0714]/60 border-[#2B2247] opacity-50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{b.icon}</div>
                        <div className="text-xs font-bold text-white truncate">{b.title}</div>
                        <div className="text-[10px] text-[#A79BC9] line-clamp-2 mt-0.5">{b.desc}</div>
                        <div className="mt-2 text-[9px] font-mono-code uppercase px-1.5 py-0.5 rounded bg-[#0A0714] border border-[#2B2247] inline-block text-[#3FE0F0]">
                          {b.rarity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Deep Dive into The Dual Currencies */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Currency 1: Genre Affinity Section */}
                <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-code uppercase text-[#a0ff78]">
                        <BookOpen className="w-4 h-4" />
                        Moeda 1: Afinidade de Gênero ("Quem Você É")
                      </div>
                      <h3 className="text-lg font-title text-white mt-1">PESO DE VOTO E RECONHECIMENTO ESPECIALIZADO</h3>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono-code rounded-full bg-[#a0ff78]/10 text-[#a0ff78] border border-[#a0ff78]/30">
                      Importável do Backlog
                    </span>
                  </div>

                  <p className="text-xs text-[#A79BC9]">
                    Alimentado pelo seu acervo total cadastrado (incluindo o que você assistiu anos atrás). Não infla seu Rank, mas destrava poder deliberativo no gênero e comentários de especialista.
                  </p>

                  <div className="space-y-3 pt-2">
                    {Object.entries(genreAffinities).map(([genre, data]) => (
                      <div key={genre} className="bg-[#181330] p-3 rounded-xl border border-[#2B2247] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0A0714] border border-[#2B2247] flex items-center justify-center font-title text-sm text-[#FF4FD8]">
                            T{data.tier}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              {genre}
                              <span className="text-[11px] font-mono-code font-normal text-[#3FE0F0]">
                                • {data.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#A79BC9]">
                              {data.historyCount} animes no histórico • {data.points} pts de afinidade
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right">
                            <div className="text-xs font-mono-code font-bold text-[#a0ff78]">
                              Voto {(1 + (data.tier * 0.35)).toFixed(2)}x
                            </div>
                            <div className="text-[9px] text-[#6B5F94]">Decaimento: {data.decayRate}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-[#0A0714] text-[#A79BC9] border border-[#2B2247]">
                            {data.tier >= 3 ? 'Comentários Livres' : 'Leitura'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Currency 2: Rank F -> SS Breakdown */}
                <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono-code uppercase text-[#FF4FD8]">
                        <Zap className="w-4 h-4" />
                        Moeda 2: Rank e Nível F → SS ("O Que Você Fez")
                      </div>
                      <h3 className="text-lg font-title text-white mt-1">PROGRESSÃO POR RITMO & CONSTÂNCIA NO TEMPO</h3>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono-code rounded-full bg-[#FF4FD8]/10 text-[#FF4FD8] border border-[#FF4FD8]/30">
                      Não Importável
                    </span>
                  </div>

                  <p className="text-xs text-[#A79BC9]">
                    Só conta a atividade viva registrada no <code>episode_progress</code> (com timestamp de quando assistiu). Protegido pelo teto diário com retorno decrescente.
                  </p>

                  {/* Rank Scale Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {INITIAL_RANKS.map(r => {
                      const isCurrent = currentRankInfo.rank === r.rank;
                      return (
                        <div 
                          key={r.rank}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isCurrent 
                              ? 'bg-[#181330] border-[#FF4FD8] shadow-lg shadow-[#FF4FD8]/10 ring-1 ring-[#FF4FD8]' 
                              : 'bg-[#0A0714] border-[#2B2247]'
                          }`}
                        >
                          <div className="text-xs font-mono-code font-bold" style={{ color: r.color }}>
                            RANK {r.rank}
                          </div>
                          <div className="text-sm font-title text-white mt-0.5">Lv. {r.minLvl}–{r.maxLvl}</div>
                          <div className="text-[10px] text-[#A79BC9] truncate">{r.title}</div>
                          {isCurrent && (
                            <span className="mt-1.5 block text-[9px] font-mono-code font-bold uppercase text-[#a0ff78]">
                              Seu Rank
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Privileges by Milestone */}
                <div className="bg-[#130F22] border border-[#2B2247] p-5 rounded-2xl">
                  <h3 className="text-sm font-title text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-[#3FE0F0]" />
                    Privilégios Desbloqueados por Marca
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#181330] border border-[#2B2247]">
                      <div className="flex items-center gap-1.5 text-[#a0ff78] font-bold font-mono-code">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Voto Ponderado
                      </div>
                      <p className="text-[11px] text-[#A79BC9] mt-1">
                        Sua nota tem peso de até <strong>2.4x</strong> em animes de Shounen e Sci-Fi.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181330] border border-[#2B2247]">
                      <div className="flex items-center gap-1.5 text-[#a0ff78] font-bold font-mono-code">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sugestão no Olheiro
                      </div>
                      <p className="text-[11px] text-[#A79BC9] mt-1">
                        Desbloqueado no Rank D (Lv.15+). Você pode submeter animes com metadados faltantes.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181330] border border-[#2B2247]">
                      <div className="flex items-center gap-1.5 text-[#FFC542] font-bold font-mono-code">
                        <Lock className="w-3.5 h-3.5" />
                        Acesso ao Radar SS
                      </div>
                      <p className="text-[11px] text-[#A79BC9] mt-1">
                        Requer <strong>Rank S (Lv.71+)</strong> para ter suas estatísticas incluídas no agregado dos mestres.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 2: TRACKER & XP LEDGER WITH EXACT VALUES */}
        {activeTab === 'tracker' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Rules Explanation */}
            <div className="bg-[#130F22] border border-[#2B2247] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#FF4FD8]">
                  <Zap className="w-4 h-4" />
                  GRAVAÇÃO IMUTÁVEL DE GANHO NO MOMENTO DA AÇÃO
                </div>
                <h1 className="text-xl font-title text-white mt-1">
                  ATIVIDADE, XP & HISTÓRICO
                </h1>
                <p className="text-xs text-[#A79BC9] mt-1 max-w-2xl">
                  Cada episódio marcado registra o XP ganho naquele momento. Se você desmarcar, o mesmo valor é devolvido — sem XP fantasma.
                </p>
              </div>

              {/* Event toggle simulator */}
              <div className="flex items-center gap-3 bg-[#181330] p-2.5 rounded-xl border border-[#2B2247]">
                <div className="text-left">
                  <div className="text-xs font-bold text-white">Evento de temporada</div>
                  <div className="text-[10px] text-[#A79BC9]">Janela configurada por data</div>
                </div>
                <button
                  onClick={() => {
                    setIsEventActive(!isEventActive);
                    showToast(isEventActive ? 'Evento encerrado.' : '⚡ Evento de XP Dobrado ativado para obras da temporada!', 'info');
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono-code font-bold transition ${
                    isEventActive 
                      ? 'bg-[#FF4FD8] text-black shadow-lg shadow-[#FF4FD8]/30' 
                      : 'bg-[#0A0714] text-[#A79BC9] border border-[#2B2247]'
                  }`}
                >
                  {isEventActive ? 'ATIVO (2x)' : 'DESLIGADO'}
                </button>
              </div>
            </div>

            {/* Daily Diminishing Returns Meter */}
            <div className="bg-[#130F22] border border-[#2B2247] p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#3FE0F0]" />
                  <span className="text-sm font-bold text-white">Teto Diário & Retorno Decrescente (Anti-Maratona Abusiva)</span>
                </div>
                <span className="text-xs font-mono-code text-[#A79BC9]">
                  Episódios hoje: <strong className="text-white">{dailyEpisodesCount} marcados</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono-code">
                {economyConfig.diminishingRates.map((rate, idx) => {
                  const isCurrent = idx === Math.min(dailyEpisodesCount, economyConfig.diminishingRates.length - 1);
                  const isPassed = idx < dailyEpisodesCount;
                  return (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-xl border ${
                        isCurrent 
                          ? 'bg-[#181330] border-[#3FE0F0] text-[#3FE0F0] font-bold' 
                          : isPassed 
                            ? 'bg-[#0A0714] border-[#2B2247] text-[#6B5F94]' 
                            : 'bg-[#0A0714] border-[#2B2247] text-[#A79BC9]'
                      }`}
                    >
                      <div className="text-[10px] text-[#A79BC9]">Episódio #{idx + 1} do dia</div>
                      <div className="text-sm mt-0.5">{(rate * 100).toFixed(0)}% do XP</div>
                      <div className="text-[10px] mt-1 text-[#6B5F94]">
                        {Math.round(economyConfig.baseEpXP * rate * (isEventActive ? 2 : 1))} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Anime Tracker Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-28 rounded-xl bg-[#0A0714] border border-[#2B2247] overflow-hidden shrink-0">
                    <img 
                      src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80" 
                      alt="Frieren" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-[#FF4FD8]/10 text-[#FF4FD8] border border-[#FF4FD8]/30">
                        EM LANÇAMENTO
                      </span>
                      <span className="text-xs text-[#A79BC9]">Sextas-feiras</span>
                    </div>
                    <h2 className="text-xl font-title text-white mt-1">Frieren: Beyond Journey's End</h2>
                    <p className="text-xs text-[#A79BC9] mt-0.5">Madhouse • Shounen, Fantasia • Grade Curada Oficial</p>
                    
                    <div className="mt-3 flex items-center gap-2 text-xs font-mono-code text-[#a0ff78]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Próximo EP rende: +{getExpectedXPForNextEpisode(true).xp} XP (com bônus cedo)
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#2B2247] pt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#A79BC9] mb-2 font-mono-code">
                    <span>Grade de Episódios da Temporada</span>
                    <span>Clique para marcar / desmarcar</span>
                  </div>

                  {episodes.map(ep => (
                    <div 
                      key={ep.epNum}
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        ep.watched 
                          ? 'bg-[#181330] border-[#a0ff78]/40 text-white' 
                          : 'bg-[#0A0714] border-[#2B2247] hover:border-[#7B5CFF]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleEpisode(ep.epNum)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                            ep.watched 
                              ? 'bg-[#a0ff78] text-black' 
                              : 'border border-[#2B2247] hover:border-[#3FE0F0] text-transparent'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <div>
                          <div className="text-xs font-bold flex items-center gap-2">
                            <span>Episódio {ep.epNum}: {ep.title}</span>
                            {ep.earlyBonusEligible && (
                              <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-[#3FE0F0]/10 text-[#3FE0F0] border border-[#3FE0F0]/30">
                                BÔNUS DIA (+{economyConfig.earlyBonusXP} XP)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#A79BC9] font-mono-code">{ep.airedAt}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        {ep.watched ? (
                          <button 
                            onClick={() => handleToggleEpisode(ep.epNum)}
                            className="text-[11px] font-mono-code text-[#FF5C6C] hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Devolver XP
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleEpisode(ep.epNum)}
                            className="px-2.5 py-1 text-xs font-mono-code rounded-lg holo-gradient-bg text-black font-semibold hover:opacity-90"
                          >
                            Assistir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immutable XP Gain Ledger Table */}
              <div className="lg:col-span-5 bg-[#130F22] border border-[#2B2247] p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#FF4FD8]" />
                    <h3 className="font-title text-base text-white">HISTÓRICO DE XP</h3>
                  </div>
                  <span className="text-[11px] font-mono-code text-[#A79BC9]">Registro da atividade</span>
                </div>

                <p className="text-xs text-[#A79BC9]">
                  O valor do ganho é selado na hora. Mudar os pesos do sistema no futuro não retroage sobre estas linhas.
                </p>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {xpLedger.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#6B5F94]">
                      Nenhuma atividade registrada na sessão.
                    </div>
                  ) : (
                    xpLedger.map(log => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-[#181330] border border-[#2B2247] flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{log.anime} — Ep. {log.ep}</span>
                            <span className="text-[10px] font-mono-code text-[#A79BC9]">({log.timestamp})</span>
                          </div>
                          <div className="text-[10px] text-[#A79BC9] mt-0.5">{log.reason}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono-code font-bold text-[#a0ff78]">
                            +{log.gainedXP} XP
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: "O QUE OS SS ESTÃO ASSISTINDO" (PRIVACY-PRESERVING SHOWCASE) */}
        {activeTab === 'ss_showcase' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono-code text-[#FF4FD8] uppercase">
                    <Eye className="w-4 h-4" />
                    Prova Social Genuína — Sem Exposição Individual
                  </div>
                  <h1 className="text-2xl font-title text-white mt-1">O QUE OS SS ESTÃO ASSISTINDO</h1>
                  <p className="text-xs text-[#A79BC9] mt-1 max-w-2xl">
                    Vitrine agregada com os animes da temporada que os usuários de maior credibilidade (Rank SS) estão consumindo ou abandonando. Dado totalmente anônimo e protegido por regras de privacidade.
                  </p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-mono-code text-[#3FE0F0]">Amostra Ativa</span>
                  <span className="text-lg font-title text-white">10 Mestres Rank SS</span>
                </div>
              </div>

              {/* Mandatory privacy rules tags */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-[#2B2247]">
                <span className="text-[11px] font-mono-code px-2.5 py-1 rounded-full bg-[#181330] text-[#a0ff78] border border-[#a0ff78]/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Agregado Estatístico (Zero Risco de RLS/Vazamento)
                </span>
                <span className="text-[11px] font-mono-code px-2.5 py-1 rounded-full bg-[#181330] text-[#FFC542] border border-[#FFC542]/30 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Trava de Quórum Ativa (Mínimo 5 membros SS para exibir)
                </span>
              </div>
            </div>

            {/* SS Showcase Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {INITIAL_SS_WATCHING.map((anime, idx) => (
                <div 
                  key={idx}
                  className="bg-[#130F22] border border-[#2B2247] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#7B5CFF] transition-all duration-300"
                >
                  <div className="relative h-44 w-full bg-[#0A0714]">
                    <img 
                      src={anime.cover} 
                      alt={anime.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#130F22] via-transparent to-transparent" />
                    
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono-code font-bold ${
                        anime.droppedBySS 
                          ? 'bg-[#FF5C6C] text-black' 
                          : 'bg-[#181330]/90 text-[#a0ff78] border border-[#a0ff78]/40'
                      }`}>
                        {anime.status}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs">
                      <span className="font-mono-code font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                        {anime.ssRatio} de {anime.totalSS} SS assistindo
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono-code text-[#FF4FD8]">{anime.genre}</span>
                      <h3 className="font-title text-base text-white mt-0.5 line-clamp-1">{anime.title}</h3>
                      <p className="text-[11px] text-[#A79BC9] mt-1">
                        {anime.droppedBySS 
                          ? `${anime.droppedBySS} usuários SS abandonaram após o ep. 3.` 
                          : `Adesão recorde na guilda nesta temporada.`}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#2B2247] flex items-center justify-between text-xs font-mono-code">
                      <span className="text-[#A79BC9]">{anime.trend}</span>
                      <button 
                        onClick={() => setActiveTab('tracker')}
                        className="text-[#3FE0F0] hover:underline flex items-center gap-1"
                      >
                        Ver no Tracker <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bayesian Ranking Explanation Box */}
            <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-[#FFC542]">
                <Star className="w-5 h-5 fill-current" />
                <h3 className="text-lg font-title text-white">COMO A AFINIDADE ALIMENTA O RANKING PONDERADO</h3>
              </div>
              <p className="text-xs text-[#A79BC9] leading-relaxed">
                Ao contrário de agregadores com média cega (onde votos de contas recém-criadas valem o mesmo que o de críticos veteranos), o AniDeck cruza a <strong>média bayesiana</strong> com o <strong>Tier de Afinidade comprovado</strong> no gênero. Uma nota 9 dada em um Shounen por quem possui mais de 40 shounens no acervo pesa <strong>2.4x mais</strong> que uma nota casual.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: COMMENTS & CURATION SUGGESTION (COMMUNITY PRIVILEGES) */}
        {activeTab === 'comments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            {/* Left: Community Comments (Restricted to Genre Affinity) */}
            <div className="lg:col-span-7 bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#a0ff78] uppercase">
                  <MessageSquare className="w-4 h-4" />
                  Privilégio de Comunidade — Espaço Restrito
                </div>
                <h2 className="text-xl font-title text-white mt-1">
                  COMENTÁRIOS DE QUEM TEM AFINIDADE COMPROVADA
                </h2>
                <p className="text-xs text-[#A79BC9] mt-1">
                  Comentários abertos a todos geram toxicidade e exigem moderação pesada. Aqui, apenas quem possui <strong>Tier 3+ no gênero</strong> ou <strong>Rank D+</strong> pode comentar na obra.
                </p>
              </div>

              {/* Post Comment Input */}
              <div className="bg-[#181330] p-4 rounded-xl border border-[#2B2247] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-code text-[#A79BC9]">
                    Seu Status: <strong className="text-[#a0ff78]">Tier 4 em Shounen</strong> (Permissão Concedida)
                  </span>
                  <span className="text-[10px] font-mono-code text-[#6B5F94]">Sanitizado via bluemonday</span>
                </div>

                <textarea
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  placeholder="Deixe sua análise sobre a obra como especialista de gênero..."
                  className="w-full bg-[#0A0714] border border-[#2B2247] rounded-xl p-3 text-xs text-white placeholder-[#6B5F94] focus:outline-none focus:border-[#7B5CFF] resize-none h-20"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#A79BC9]">
                    Comentários são públicos e vinculados à sua reputação.
                  </span>
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-1.5 rounded-full holo-gradient-bg text-black text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
                  >
                    <Send className="w-3 h-3" /> Publicar Análise
                  </button>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-3 pt-2">
                {comments.map(cmt => (
                  <div key={cmt.id} className="bg-[#181330] p-4 rounded-xl border border-[#2B2247] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{cmt.author}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono-code font-bold bg-[#7B5CFF]/20 text-[#7B5CFF] border border-[#7B5CFF]/30">
                          Rank {cmt.rank}
                        </span>
                        {cmt.verifiedSpecialist && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono-code bg-[#a0ff78]/10 text-[#a0ff78] border border-[#a0ff78]/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Tier {cmt.genreTier} {cmt.genre}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#6B5F94] font-mono-code">{cmt.date}</span>
                    </div>

                    <p className="text-xs text-[#F1EEFA] leading-relaxed">{cmt.text}</p>

                    <div className="pt-2 flex items-center justify-end text-[10px] text-[#6B5F94]">
                      <button 
                        onClick={() => {
                          setComments(prev => prev.filter(c => c.id !== cmt.id));
                          showToast('Comentário removido pelo autor.', 'info');
                        }}
                        className="hover:text-[#FF5C6C] flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Apagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Olheiro Curation Suggestions Queue */}
            <div className="lg:col-span-5 bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#3FE0F0] uppercase">
                  <Shield className="w-4 h-4" />
                  Privilégio de Alto Escalão (Rank D+)
                </div>
                <h2 className="text-xl font-title text-white mt-1">
                  FILA DO OLHEIRO — CURADORIA
                </h2>
                <p className="text-xs text-[#A79BC9] mt-1">
                  Usuários de topo não acessam o banco direto: colocam sugestões na fila do Olheiro para revisão do Admin com botões Curar / Dispensar.
                </p>
              </div>

              {/* Suggestion Form */}
              <div className="bg-[#181330] p-4 rounded-xl border border-[#2B2247] space-y-3">
                <input
                  type="text"
                  value={newSuggestion}
                  onChange={e => setNewSuggestion(e.target.value)}
                  placeholder="Nome do anime ou ID MAL para curadoria..."
                  className="w-full bg-[#0A0714] border border-[#2B2247] rounded-xl px-3 py-2 text-xs text-white placeholder-[#6B5F94] focus:outline-none focus:border-[#3FE0F0]"
                />
                <button
                  onClick={handleSuggestCuration}
                  className="w-full py-2 rounded-xl bg-[#0A0714] border border-[#3FE0F0]/50 hover:bg-[#3FE0F0]/10 text-[#3FE0F0] text-xs font-mono-code font-bold transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Enviar para Fila de Avaliação
                </button>
              </div>

              {/* Current Curation Queue */}
              <div className="space-y-2.5">
                <div className="text-xs font-mono-code text-[#A79BC9] mb-2">
                  Itens em análise na fila:
                </div>
                {curationQueue.map(item => (
                  <div key={item.id} className="p-3 rounded-xl bg-[#181330] border border-[#2B2247] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{item.animeTitle}</span>
                      <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#0A0714] text-[#FFC542] border border-[#FFC542]/30">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A79BC9]">{item.reason}</p>
                    <div className="text-[10px] text-[#6B5F94] font-mono-code">Autor: {item.proposedBy}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN ECONOMY CONFIGURATION PANEL */}
        {activeTab === 'admin_economy' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-code text-[#FF4FD8] uppercase">
                  <Sliders className="w-4 h-4" />
                  Painel de Configuração da Economia (Admin)
                </div>
                <h1 className="text-2xl font-title text-white mt-1">CALIBRAÇÃO DINÂMICA DE PESOS E EVENTOS</h1>
                <p className="text-xs text-[#A79BC9] mt-1 max-w-2xl">
                  Seguindo o padrão do <code>app_settings</code> e <code>sync.RWMutex</code>, os pesos vivem no banco e não no código. Alterar um peso aqui <strong>não é retroativo</strong>: o que já foi ganho mantém seu valor original gravado no momento da marcação.
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-[#a0ff78]/10 border border-[#a0ff78]/30 text-[#a0ff78] text-xs font-mono-code">
                ● Tabela <code>economy_settings</code> Conectada
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sliders: Base XP and Multipliers */}
              <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-6">
                <h2 className="text-base font-title text-white">PESOS GERAIS DE ATIVIDADE</h2>

                {/* Base XP Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono-code">
                    <span className="text-[#A79BC9]">XP Base por Episódio (1º do dia)</span>
                    <strong className="text-[#3FE0F0]">{economyConfig.baseEpXP} XP</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={economyConfig.baseEpXP}
                    onChange={e => setEconomyConfig({ ...economyConfig, baseEpXP: Number(e.target.value) })}
                    className="w-full accent-[#3FE0F0]"
                  />
                  <div className="text-[10px] text-[#6B5F94]">
                    Recomendação: Começar apertado (20–25 XP). Economia inflacionada quebra a confiança do Rank SS.
                  </div>
                </div>

                {/* Early Watch Bonus */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono-code">
                    <span className="text-[#A79BC9]">Bônus por Assistir no Dia do Lançamento</span>
                    <strong className="text-[#FFC542]">+{economyConfig.earlyBonusXP} XP</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="5"
                    value={economyConfig.earlyBonusXP}
                    onChange={e => setEconomyConfig({ ...economyConfig, earlyBonusXP: Number(e.target.value) })}
                    className="w-full accent-[#FFC542]"
                  />
                  <div className="text-[10px] text-[#6B5F94]">
                    Janela ampla (antes do próximo episódio sair) para não premiar insônia no fuso horário do Brasil.
                  </div>
                </div>

                {/* Event Multiplier */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono-code">
                    <span className="text-[#A79BC9]">Multiplicador de Evento de Estreia</span>
                    <strong className="text-[#FF4FD8]">{economyConfig.multiplierActive.toFixed(1)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.5"
                    value={economyConfig.multiplierActive}
                    onChange={e => setEconomyConfig({ ...economyConfig, multiplierActive: Number(e.target.value) })}
                    className="w-full accent-[#FF4FD8]"
                  />
                </div>
              </div>

              {/* Event Window and Diminishing Return settings */}
              <div className="bg-[#130F22] border border-[#2B2247] p-6 rounded-2xl space-y-6">
                <h2 className="text-base font-title text-white">JANELAS DE TEMPO & RETORNO DECRESCENTE</h2>

                <div className="space-y-3">
                  <label className="text-xs font-mono-code text-[#A79BC9] block">
                    Curva de Desgaste Diário (1º ao 5º ep)
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 text-center font-mono-code text-xs">
                    {economyConfig.diminishingRates.map((r, i) => (
                      <div key={i} className="p-2 rounded-lg bg-[#181330] border border-[#2B2247]">
                        <span className="text-[10px] text-[#6B5F94]">#{i+1}</span>
                        <div className="text-[#3FE0F0] font-bold">{(r * 100)}%</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#A79BC9]">
                    Substitui com eficácia a trava de 30 minutos: permite maratona sem estourar o limite diário em direção ao Rank SS.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#181330] border border-[#2B2247] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono-code text-[#FFC542]">
                    <Calendar className="w-4 h-4" />
                    Janela com Encerramento Automático
                  </div>
                  <p className="text-[11px] text-[#A79BC9]">
                    Sem botão manual de ligar/desligar esquecido aberto. Segue o padrão de <code>beta_signup_limit</code>.
                  </p>
                  <div className="text-[10px] font-mono-code text-[#6B5F94]">
                    Início: {economyConfig.eventWindowStart} <br />
                    Término: {economyConfig.eventWindowEnd}
                  </div>
                </div>

                <button
                  onClick={() => showToast('Configurações salvas em app_settings (sem deploy necessário)!', 'success')}
                  className="w-full py-2.5 rounded-full holo-gradient-bg text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition"
                >
                  Salvar Parâmetros da Economia
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer System Status */}
      <footer className="mt-auto border-t border-[#2B2247] bg-[#0A0714] py-4 px-6 text-center text-xs font-mono-code text-[#6B5F94]">
        AniDeck Guild System Prototype • Alinhado aos princípios do VISAO_GAMIFICACAO.md & DESIGN_TOKENS.md
      </footer>
    </div>
  );
}