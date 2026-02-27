import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Radio, Clock, Activity, ChevronUp, Printer, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

// --- Types ---
type Screen = 'boot' | 'title' | 'brief' | 'elevator' | 'persona' | 'evaluation' | 'boardroom' | 'verdict' | 'summary';

interface Persona {
  id: string;
  floor: number;
  nom: string;
  titre: string;
  chapeau: string;
  cam: string;
  protocol: string;
  video: string;
  photo: string;
  accentColor: string;
  dialogue: (title: string) => ChatMessage[];
  buildSystemPrompt: (title: string, brief: string) => string;
}

interface ChatMessage {
  from: 'persona' | 'player';
  text: string;
  isQuestion?: boolean;
}

interface Result {
  persona: Persona;
  response: string;
  evaluation: string;
  decision: 'MONTEZ' | 'RETENTEZ' | 'DÉMO';
}

// --- Constants ---
const PERSONAS: Persona[] = [
  {
    id: 'noir',
    floor: 17,
    nom: 'CLAUDE',
    titre: 'ANALYSTE CRITIQUE',
    chapeau: 'CHAPEAU NOIR',
    cam: 'CAM-02',
    protocol: 'RISQUE & FAISABILITÉ',
    video: '/video/scene01.mp4',
    photo: '/images/photo-claude-noir.png',
    accentColor: '#2a2a2a',
    dialogue: (title) => [
      { from: 'persona', text: `... Intéressant ce qu'il y a sur ta tablette. C'est quoi comme projet?` },
      { from: 'player', text: `"${title}" — un concept pour le pitch au 100e.` },
      { from: 'persona', text: `Bien.\n\nAlors parlons-en franchement. Où sont les failles de ce concept? Nommez-moi les risques techniques, les contraintes de prépresse ou les enjeux éthiques que vous avez anticipés. Je ne veux pas d'optimisme. Je veux de la lucidité.`, isQuestion: true },
    ],
    buildSystemPrompt: (title, brief) => `Chapeau Noir (Claude) — analyse critique. Projet: "${title}" / "${brief}". Cherche : risques techniques, contraintes prépresse, faisabilité, enjeux éthiques. 3-4 phrases en français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si conscience critique réelle, sinon [DÉCISION: RETENTEZ].`,
  },
  {
    id: 'rouge',
    floor: 33,
    nom: 'BÉATRICE',
    titre: 'EXPERTE EN IMPACT ÉMOTIF',
    chapeau: 'CHAPEAU ROUGE',
    cam: 'CAM-03',
    protocol: 'ÉMOTION & SÉMIOLOGIE',
    video: '/video/scene02.mp4',
    photo: '/images/photo-beatrice-rouge.png',
    accentColor: '#2a0a0a',
    dialogue: (title) => [
      { from: 'persona', text: `... Oh. Beau projet sur cette tablette. C'est quoi?` },
      { from: 'player', text: `"${title}" — pour le pitch au 100e étage.` },
      { from: 'persona', text: `Ah...\n\nMes tripes me disent quelque chose — mais j'ai besoin d'entendre la vôtre. Quelle émotion précise ce projet doit-il déclencher? Et comment vos choix visuels — couleurs, typographie, images — le communiquent-ils de façon viscérale?`, isQuestion: true },
    ],
    buildSystemPrompt: (title, brief) => `Chapeau Rouge (Béatrice) — impact émotionnel et sémiologie. Projet: "${title}" / "${brief}". Cherche : émotion précise, cohérence couleurs/typo/images, résonance viscérale. 3-4 phrases en français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si intention émotionnelle claire, sinon [DÉCISION: RETENTEZ].`,
  },
  {
    id: 'jaune',
    floor: 50,
    nom: 'FLORENCE',
    titre: 'STRATÈGE OPTIMISTE',
    chapeau: 'CHAPEAU JAUNE',
    cam: 'CAM-04',
    protocol: 'VALEUR & BÉNÉFICES',
    video: '/video/scene03.mp4',
    photo: '/images/photo-florence-jaune.png',
    accentColor: '#1a1600',
    dialogue: (t) => [
      { from: 'persona', text: `Votre projet m'intrigue. De quoi s'agit-il?` },
      { from: 'player', text: `"${t}" — pour le pitch au 100e.` },
      { from: 'persona', text: `Bien. Quelles sont les opportunités concrètes et les bénéfices mesurables de ce concept pour le client?`, isQuestion: true }
    ],
    buildSystemPrompt: (t, b) => `Chapeau Jaune (Florence) — valeur et bénéfices. Projet: "${t}" / "${b}". Cherche : bénéfices concrets client, valeur ajoutée, opportunités identifiées. 3-4 phrases français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si valeur claire, sinon [DÉCISION: RETENTEZ].`,
  },
  {
    id: 'blanc',
    floor: 67,
    nom: 'ANTOINE',
    titre: 'EXPERT EN DONNÉES',
    chapeau: 'CHAPEAU BLANC',
    cam: 'CAM-05',
    protocol: 'DONNÉES & FAITS',
    video: '/video/scene04.mp4',
    photo: '/images/photo-antoine-blanc.png',
    accentColor: '#141414',
    dialogue: (t) => [
      { from: 'persona', text: `Curieux projet. Qu'est-ce que c'est?` },
      { from: 'player', text: `"${t}" — pour le pitch au 100e.` },
      { from: 'persona', text: `Quelles données factuelles, statistiques ou recherches justifient vos choix visuels et créatifs?`, isQuestion: true }
    ],
    buildSystemPrompt: (t, b) => `Chapeau Blanc (Antoine) — faits et données. Projet: "${t}" / "${b}". Cherche : faits vérifiables, données concrètes, distinction fait/opinion, références objectives. 3-4 phrases français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si faits solides, sinon [DÉCISION: RETENTEZ].`,
  },
  {
    id: 'vert',
    floor: 83,
    nom: 'GABRIEL',
    titre: 'CATALYSEUR CRÉATIF',
    chapeau: 'CHAPEAU VERT',
    cam: 'CAM-06',
    protocol: 'CRÉATIVITÉ & ALTERNATIVES',
    video: '/video/scene05.mp4',
    photo: '/images/photo-gabriel-vert.png',
    accentColor: '#0a1200',
    dialogue: (t) => [
      { from: 'persona', text: `Hé, beau projet là. C'est quoi?` },
      { from: 'player', text: `"${t}" — pour le pitch au 100e.` },
      { from: 'persona', text: `Cool. Mais quelles alternatives avez-vous explorées? Qu'est-ce qui aurait pu être complètement différent?`, isQuestion: true }
    ],
    buildSystemPrompt: (t, b) => `Chapeau Vert (Gabriel) — créativité et alternatives. Projet: "${t}" / "${b}". Cherche : alternatives explorées, idéation visible, choix créatif délibéré, remise en question. 3-4 phrases français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si exploration réelle, sinon [DÉCISION: RETENTEZ].`,
  },
  {
    id: 'bleu',
    floor: 97,
    nom: 'MARTINE',
    titre: 'DIRECTRICE DE PROCESSUS',
    chapeau: 'CHAPEAU BLEU',
    cam: 'CAM-07',
    protocol: 'SYNTHÈSE & PROCESSUS',
    video: '/video/Scene06.mp4',
    photo: '/images/photo-martine-bleu.png',
    accentColor: '#00080f',
    dialogue: (t) => [
      { from: 'persona', text: `Voilà un projet intéressant. Résumez-le moi.` },
      { from: 'player', text: `"${t}" — pour le pitch au 100e.` },
      { from: 'persona', text: `Bien. Faites-moi une synthèse structurée de votre démarche créative, de votre processus de décision, et de votre prochaine étape concrète.`, isQuestion: true }
    ],
    buildSystemPrompt: (t, b) => `Chapeau Bleu (Martine) — processus et méta-cognition. Projet: "${t}" / "${b}". Cherche : synthèse structurée, réflexion sur la démarche, prochaines étapes concrètes, cohérence processus/résultat. 3-4 phrases français canadien, EN PERSONNAGE. Fin : [DÉCISION: MONTEZ] si démarche claire, sinon [DÉCISION: RETENTEZ].`,
  },
];

const PAUSE_TIMES: Record<string, number> = {
  noir: 6.0,
  rouge: 10.0,
  jaune: 10.0,
  blanc: 9.9,
  vert: 9.9,
  bleu: 9.9,
};

// --- Main Component ---
export default function App() {
  const [screen, setScreen] = useState<Screen>('boot');
  const [bootLines, setBootLines] = useState<{ text: string; color?: string }[]>([]);
  const [clock, setClock] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [floor, setFloor] = useState(1);
  const [targetFloor, setTargetFloor] = useState(1);
  const [personaIndex, setPersonaIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [response, setResponse] = useState('');
  const [evaluation, setEvaluation] = useState<{ text: string; decision: string; isPass: boolean } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [pitch, setPitch] = useState('');
  const [verdictScores, setVerdictScores] = useState<Record<string, number> | null>(null);
  const [verdictAvg, setVerdictAvg] = useState<number | null>(null);
  const [verdictWon, setVerdictWon] = useState<boolean | null>(null);

  const [boardroomPhase, setBoardroomPhase] = useState<'video' | 'form'>('video');
  const boardroomVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screen === 'boardroom') {
      setBoardroomPhase('video');
      if (boardroomVideoRef.current) {
        boardroomVideoRef.current.src = '/video/scene7x.mp4';
        boardroomVideoRef.current.currentTime = 0;
        boardroomVideoRef.current.play().catch(console.error);
      }
    }
  }, [screen]);

  const handleBoardroomTimeUpdate = () => {
    if (boardroomPhase === 'video' && boardroomVideoRef.current && boardroomVideoRef.current.currentTime >= 9.5) {
      boardroomVideoRef.current.pause();
      setBoardroomPhase('form');
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      const fmt = (n: number) => String(n).padStart(2, '0');
      setClock(`${fmt(d.getDate())}/${fmt(d.getMonth() + 1)}/${d.getFullYear()} ${fmt(d.getHours())}:${fmt(d.getMinutes())}:${fmt(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (screen === 'boot') {
      const lines = [
        { text: 'AGENCE STUDIO X — SYSTÈME DE FORMATION v2.6', ms: 0, color: '#a8a8a8' },
        { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', ms: 180 },
        { text: '', ms: 350 },
        { text: 'Initialisation du système...', ms: 500 },
        { text: '  [OK] Caméras de sécurité ............. EN LIGNE', ms: 720, color: '#a8a8a8' },
        { text: '  [OK] Système ascenseur (100 étages) .. OPÉRATIONNEL', ms: 920, color: '#a8a8a8' },
        { text: '  [OK] Module vidéo CCTV ............... ACTIF', ms: 1120, color: '#a8a8a8' },
        { text: '  [OK] Interface IA ..................... CONNECTÉE', ms: 1320, color: '#a8a8a8' },
        { text: '  [OK] Protocole 6-CHAPEAUX ............ CHARGÉ', ms: 1520, color: '#a8a8a8' },
        { text: '', ms: 1700 },
        { text: 'Experts — édifice 100 étages:', ms: 1850 },
        { text: '  ◈ CLAUDE     CHAPEAU NOIR   (ÉT.017)  PRÊT  ▶', ms: 2050, color: '#a8a8a8' },
        { text: '  ◈ BÉATRICE   CHAPEAU ROUGE  (ÉT.033)  PRÊT  ▶', ms: 2200, color: '#a8a8a8' },
        { text: '  ◈ FLORENCE   CHAPEAU JAUNE  (ÉT.050)  PRÊT  ▶', ms: 2350, color: '#a8a8a8' },
        { text: '  ◈ ANTOINE    CHAPEAU BLANC  (ÉT.067)  PRÊT  ▶', ms: 2480, color: '#a8a8a8' },
        { text: '  ◈ GABRIEL    CHAPEAU VERT   (ÉT.083)  PRÊT  ▶', ms: 2610, color: '#a8a8a8' },
        { text: '  ◈ MARTINE    CHAPEAU BLEU   (ÉT.097)  PRÊT  ▶', ms: 2740, color: '#a8a8a8' },
        { text: '  ◈ SALLE BOARD              (ÉT.100)   PRÊT  ▶', ms: 2870, color: '#a8a8a8' },
        { text: '', ms: 3000 },
        { text: 'PROTOTYPE MVP — TOUS LES ÉTAGES ACTIFS', ms: 3100, color: '#a8a8a8' },
        { text: '► ACCÈS AUTORISÉ', ms: 3280, color: '#a8a8a8' },
      ];
      lines.forEach(({ text, ms, color }) => {
        setTimeout(() => {
          setBootLines(prev => [...prev, { text, color }]);
        }, ms);
      });
      setTimeout(() => setScreen('title'), 4000);
    }
  }, [screen]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isTyping]);

  // --- Handlers ---
  const startSession = () => {
    const id = 'SES-' + Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + new Date().getFullYear();
    setSessionId(id);
    setScreen('brief');
  };

  const submitBrief = () => {
    if (!title || brief.length < 30) return;
    setFloor(1);
    setTargetFloor(PERSONAS[0].floor);
    setScreen('elevator');
  };

  useEffect(() => {
    if (screen === 'elevator') {
      const steps = targetFloor - floor;
      const duration = 2200;
      const interval = Math.max(35, duration / steps);
      let current = floor;
      const timer = setInterval(() => {
        current++;
        setFloor(current);
        if (current >= targetFloor) {
          clearInterval(timer);
          setTimeout(() => setScreen('persona'), 1000);
        }
      }, interval);
      return () => clearInterval(timer);
    }
  }, [screen, targetFloor]);

  useEffect(() => {
    if (screen === 'persona') {
      const p = PERSONAS[personaIndex];
      setChatLog([]);
      setIsFrozen(false);
      setIsTyping(false);
      setResponse('');
      
      if (videoRef.current) {
        videoRef.current.src = p.video;
        videoRef.current.muted = false;
        videoRef.current.loop = false;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(console.error);
      }
    }
  }, [screen, personaIndex]);

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || isFrozen) return;
    const p = PERSONAS[personaIndex];
    const pauseAt = PAUSE_TIMES[p.id] || 5.0;
    if (videoRef.current.currentTime >= pauseAt) {
      videoRef.current.pause();
      setIsFrozen(true);
      startDialogue(p);
    }
  };

  const startDialogue = async (p: Persona) => {
    const messages = p.dialogue(title);
    for (const msg of messages) {
      if (msg.from === 'persona') {
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 1000));
        setChatLog(prev => [...prev, msg]);
        setIsTyping(false);
      } else {
        setChatLog(prev => [...prev, msg]);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  };

  const submitResponse = async () => {
    if (response.length < 20) return;
    setIsEvaluating(true);
    setScreen('evaluation');
    
    const p = PERSONAS[personaIndex];
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: p.buildSystemPrompt(title, brief) + `\n\nRéponse de l'étudiant·e :\n"${response}"` }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 180 }
        })
      });
      
      const data = await res.json();
      const raw = data.candidates[0].content.parts[0].text;
      const isPass = raw.includes('[DÉCISION: MONTEZ]');
      const cleanText = raw.replace(/\[DÉCISION:.*?\]/g, '').trim();
      
      setEvaluation({ text: cleanText, decision: isPass ? 'MONTEZ' : 'RETENTEZ', isPass });
      if (isPass) {
        setResults(prev => [...prev, { persona: p, response, evaluation: cleanText, decision: 'MONTEZ' }]);
      }
    } catch (error) {
      console.error(error);
      setEvaluation({ text: "Erreur de connexion au serveur d'IA.", decision: 'RETENTEZ', isPass: false });
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextStep = () => {
    if (personaIndex + 1 < PERSONAS.length) {
      const nextP = PERSONAS[personaIndex + 1];
      setPersonaIndex(prev => prev + 1);
      setTargetFloor(nextP.floor);
      setScreen('elevator');
    } else {
      setTargetFloor(100);
      setScreen('elevator');
      setTimeout(() => setScreen('boardroom'), 3000);
    }
  };

  const [verdictVideo, setVerdictVideo] = useState('/video/Scene8x.mp4');

  const submitPitch = async () => {
    if (pitch.length < 80) return;
    setScreen('verdict');
    setVerdictVideo('/video/Scene8x.mp4');
    
    try {
      const feedbackCtx = results.map(r => `${r.persona.chapeau} (${r.persona.nom}): ${r.evaluation}`).join('\n');
      const prompt = `Tu es un panel d'investisseurs Dragon's Den spécialisés en design graphique. Un étudiant présente son concept révisé après les rétroactions des 6 chapeaux de De Bono.\n\nTitre: "${title}"\nConcept original: "${brief}"\nRétroactions reçues:\n${feedbackCtx}\nPitch final: "${pitch}"\n\nÉvalue si l'étudiant a intégré les rétroactions. Retourne UNIQUEMENT un JSON valide (sans markdown):\n{"noir":<0-100>,"rouge":<0-100>,"jaune":<0-100>,"blanc":<0-100>,"vert":<0-100>,"bleu":<0-100>}`;
      
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      const data = await res.json();
      const scores = JSON.parse(data.candidates[0].content.parts[0].text);
      setVerdictScores(scores);
      
      const vals: number[] = Object.values(scores);
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      setVerdictAvg(avg);
      const won = avg >= 65;
      setVerdictWon(won);
      
      // Wait for scores animation
      await new Promise(r => setTimeout(r, 8000));
      
      // Switch to win/loss video
      setVerdictVideo(won ? '/video/scene9x.mp4' : '/video/scene10x.mp4');
      
      // Wait for final video
      await new Promise(r => setTimeout(r, won ? 4000 : 10000));
      
      setScreen('summary');
    } catch (error) {
      console.error(error);
      setScreen('summary');
    }
  };

  // --- Render Helpers ---
  const renderHUD = () => (
    <div id="cctv-hud" className="z-[9996]">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Camera size={14} className="opacity-50" />
            <span>{screen === 'persona' ? PERSONAS[personaIndex].cam : 'CAM-01'} | ASCENSEUR-STUDIO-A</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Radio size={14} className="opacity-50" />
            <span>PROTO: {screen === 'persona' ? PERSONAS[personaIndex].protocol : 'ACTIF'}</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Clock size={14} className="opacity-50" />
            <span>{clock}</span>
          </div>
          <div className="flex items-center">
            <span className="rec-dot"></span>
            <span>REC</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-oswald font-bold text-5xl leading-none text-white/75 tracking-wider">
              {floor === 1 ? 'L' : String(floor).padStart(3, '0')}
            </span>
            {floor > 1 && <ChevronUp className="text-white/50 animate-pulse" size={24} />}
          </div>
        </div>
      </div>
      <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
        <div>
          <div>ÉTAGE: <span className="text-white/80">{String(floor).padStart(3, '0')}</span> / 100</div>
          <div className="mt-1 opacity-70">
            {screen === 'persona' ? PERSONAS[personaIndex].chapeau : 'HALL D\'ACCUEIL'}
          </div>
        </div>
        <div className="flex items-end gap-1 h-4">
          {[4, 7, 10, 14].map((h, i) => (
            <div key={i} className="signal-bar" style={{ height: h }}></div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-screen h-screen bg-[#070707] text-[#b8b8b8] font-mono overflow-hidden scanlines vignette">
      <div className="noise-line"></div>
      {renderHUD()}

      <AnimatePresence mode="wait">
        {screen === 'boot' && (
          <motion.div
            key="boot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-black items-start justify-start p-8"
          >
            <pre className="text-sm leading-loose whitespace-pre-wrap">
              {bootLines.map((line, i) => (
                <span key={i} style={{ color: line.color || '#666' }}>{line.text}{'\n'}</span>
              ))}
            </pre>
          </motion.div>
        )}

        {screen === 'title' && (
          <motion.div
            key="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-[#050505] gap-8"
          >
            <div className="text-sm tracking-[0.45em] text-[#505050] text-center">
              AGENCE STUDIO X — SYSTÈME DE FORMATION CRÉATIVE
            </div>
            <h1 className="title-main">
              L'AS<span className="title-c-clip"><span className="title-c-letter animating">C</span></span>ENSEUR
            </h1>
            <div className="text-sm tracking-[0.3em] text-[#3e3e3e] text-center">
              LES 6 CHAPEAUX DU STUDIO · JEU D'ARGUMENTATION CRÉATIVE
            </div>
            <button className="btn primary" onClick={startSession}>
              [ DÉMARRER LA SESSION ]
            </button>
            <div className="text-xs text-[#222] mt-2">PROTOTYPE FULL EXPERIENCE</div>
          </motion.div>
        )}

        {screen === 'brief' && (
          <motion.div
            key="brief"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-[#050505] p-10"
          >
            <div className="w-full max-w-xl flex flex-col gap-6">
              <div className="dossier-box" data-label="MISSION ASSIGNÉE">
                <div className="font-oswald font-light text-3xl tracking-widest text-[#3e3e3e]">DOSSIER CONFIDENTIEL</div>
                <div className="text-sm text-[#404040] mt-1">ID: {sessionId} · NIVEAU: DESIGNER JUNIOR</div>
              </div>
              <div>
                <label className="block text-xs tracking-[0.35em] text-[#505050] mb-2">01 — TITRE DU MANDAT / NOM DU PROJET</label>
                <input
                  className="field-input h-11 min-h-0"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="ex: Campagne affiche Festival de Mégantic 2025..."
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.35em] text-[#505050] mb-2">02 — DESCRIPTION DU CONCEPT VISUEL</label>
                <textarea
                  className="field-input min-h-[120px]"
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder="Décrivez votre concept : approche visuelle, palette, typographie, public cible, intention créative..."
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-[#404040] tracking-widest">AUTHENTIFICATION REQUISE</div>
                <button className="btn primary" onClick={submitBrief}>
                  [ ACCÉDER À L'ASCENSEUR → ]
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'elevator' && (
          <motion.div
            key="elevator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-[#030303] gaine-lines"
          >
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="text-sm tracking-[0.5em] text-[#363636]">ÉTAGE EN COURS</div>
              <div className="elev-floor-num">{String(floor).padStart(3, '0')}</div>
              <div className="text-sm tracking-[0.28em] text-[#363636] mt-1">
                EN ROUTE VERS L'ÉTAGE {String(targetFloor).padStart(3, '0')}
              </div>
              <div className="w-12 h-px bg-[#1a1a1a] my-2"></div>
              <div className="text-sm tracking-[0.22em] text-[#363636] animate-pulse">MONTÉE EN COURS...</div>
            </div>
          </motion.div>
        )}

        {screen === 'persona' && (
          <motion.div
            key="persona"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="screen p-0 block"
          >
            <div className="absolute inset-0 bg-[#050505] overflow-hidden">
              <video
                ref={videoRef}
                onTimeUpdate={handleVideoTimeUpdate}
                className={`cctv-video ${isFrozen ? 'opacity-80' : ''}`}
                playsInline
              />
              
              <div className="cctv-svg-overlay absolute inset-0 pointer-events-none opacity-50">
                <svg viewBox="0 0 1524 1044" preserveAspectRatio="none" fill="none">
                  <g className="cctv-data-group" stroke="#6FBE52" strokeWidth="2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <line x1="1473" y1={84 + i * 30} x2="1524" y2={84 + i * 30} />
                        <line x1="1488" y1={99 + i * 30} x2="1525" y2={99 + i * 30} />
                      </React.Fragment>
                    ))}
                  </g>
                  <rect x="129" y="105" width="1272" height="790" stroke="#6FBE52" strokeWidth="2" />
                </svg>
              </div>

              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-20 border border-white/20 det-face">
                <div className="absolute -top-4 left-0 text-[8px] text-white/40 tracking-widest whitespace-nowrap">
                  ID: {PERSONAS[personaIndex].nom} · {PERSONAS[personaIndex].chapeau}
                </div>
              </div>

              <div className="absolute top-0 left-0 right-0 p-10 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
                <div>
                  <div className="text-xs tracking-widest text-white/50">{PERSONAS[personaIndex].titre}</div>
                  <div className="font-oswald font-bold text-2xl tracking-widest text-white">{PERSONAS[personaIndex].nom}</div>
                </div>
                <div className="text-xs tracking-widest text-white/50 border border-white/20 px-2 py-1">
                  {PERSONAS[personaIndex].chapeau}
                </div>
              </div>

              {isFrozen && (
                <div className="absolute top-36 left-1/2 -translate-x-1/2 text-xs tracking-[0.35em] text-white/60 border border-white/20 px-3 py-1 animate-pulse">
                  ▌▌ GEL D'IMAGE
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-20 p-10 pt-20 bg-gradient-to-t from-black via-black/90 to-transparent max-w-3xl mx-auto">
              <div className="text-xs tracking-[0.3em] text-white/40 mb-4">PROTOCOLE: {PERSONAS[personaIndex].protocol}</div>
              <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
                {chatLog.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.from === 'player' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] tracking-widest opacity-40">
                      {msg.from === 'persona' ? '▸ EXPERT' : '▸ VOUS'}
                    </div>
                    <div className={`p-3 text-lg leading-relaxed ${
                      msg.from === 'persona' 
                        ? 'text-white/80 border-l-2 border-white/20 bg-white/5' 
                        : 'text-white/50 italic border-right-2 border-white/10'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-1 items-center opacity-40">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {isFrozen && !isTyping && chatLog.length > 0 && chatLog[chatLog.length - 1].isQuestion && (
                <div className="mt-6 flex flex-col gap-3">
                  <div className="relative">
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#6FBE52] rounded-full shadow-[0_0_10px_#6FBE52] animate-pulse"></div>
                    <textarea
                      className="w-full bg-black/60 border border-white/10 border-b-white/30 text-white p-3 min-h-[80px] outline-none focus:border-white/40 transition-colors backdrop-blur-sm"
                      value={response}
                      onChange={e => setResponse(e.target.value)}
                      placeholder="Votre réponse — développez votre argumentation..."
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-white/30 tracking-widest">{response.length} CARACTÈRES</div>
                    <button className="btn primary" onClick={submitResponse}>
                      [ SOUMETTRE ]
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {screen === 'evaluation' && (
          <motion.div
            key="evaluation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-[#040404]"
          >
            <div className="w-full max-w-xl border border-white/10">
              <div className="flex justify-between p-3 border-b border-white/10 text-xs tracking-widest text-white/30">
                <span>{PERSONAS[personaIndex].nom} — {PERSONAS[personaIndex].chapeau}</span>
                <span>ANALYSE IA EN COURS</span>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {isEvaluating ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-white/20 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <div className="text-xs tracking-[0.3em] text-white/20 animate-pulse">TRAITEMENT DE LA RÉPONSE...</div>
                  </div>
                ) : evaluation && (
                  <div className="flex flex-col gap-6">
                    <div className="text-xs tracking-widest text-white/40">ÉVALUATION — {PERSONAS[personaIndex].nom}</div>
                    <div className="text-lg leading-relaxed text-white/70 border-l-2 border-white/10 pl-4 italic">
                      {evaluation.text}
                    </div>
                    <div className={`p-3 border text-sm tracking-widest text-center ${
                      evaluation.isPass ? 'border-white/30 text-white/70' : 'border-white/10 text-white/30'
                    }`}>
                      {evaluation.isPass ? '▲ ACCÈS ACCORDÉ — VOUS POUVEZ MONTER' : '▼ ACCÈS REFUSÉ — RÉPONDEZ À NOUVEAU'}
                    </div>
                    <div className="flex gap-3">
                      {evaluation.isPass ? (
                        <button className="btn primary flex-1" onClick={nextStep}>
                          [ CONTINUER → ÉTAGE {personaIndex + 1 < PERSONAS.length ? String(PERSONAS[personaIndex + 1].floor).padStart(3, '0') : '100'} ]
                        </button>
                      ) : (
                        <button className="btn primary flex-1" onClick={() => setScreen('persona')}>
                          [ RÉESSAYER ]
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'boardroom' && (
          <motion.div
            key="boardroom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ opacity: 0 }}
            className="screen p-0 block"
          >
            {boardroomPhase === 'video' ? (
              <video
                ref={boardroomVideoRef}
                onTimeUpdate={handleBoardroomTimeUpdate}
                className="cctv-video absolute inset-0 w-full h-full object-cover"
                playsInline
              />
            ) : (
              <>
                <div className="absolute inset-0 overflow-hidden">
                  <img 
                    src="/images/board0x.png" 
                    className="w-full h-full object-cover saturate-[0.45] brightness-[0.6] scale-110 animate-[board-slow-zoom_12s_ease-in_forwards]"
                    alt="Salle du conseil"
                  />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
                </div>
                
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-6 p-6">
                  <div className="w-full max-w-xl bg-white/5 border border-white/10 p-6 backdrop-blur-md">
                    <div className="text-[10px] tracking-[0.5em] text-white/30 mb-2">CONCEPT EN PRÉSENTATION</div>
                    <div className="font-oswald font-light text-2xl tracking-widest text-white/70 uppercase">{title}</div>
                  </div>

                  <div className="w-full max-w-xl bg-black/90 border border-white/10">
                    <div className="flex justify-between p-3 border-b border-white/10 text-[10px] tracking-widest text-white/30">
                      <span>PITCH FINAL — ÉTAGE 100</span>
                      <span>{sessionId}</span>
                    </div>
                    <div className="p-6 flex flex-col gap-4">
                      <label className="text-xs tracking-widest text-white/40">Intégrez les rétroactions des 6 experts dans votre concept bonifié</label>
                      <textarea
                        className="field-input min-h-[150px]"
                        value={pitch}
                        onChange={e => setPitch(e.target.value)}
                        placeholder="Présentez votre concept révisé en tenant compte des rétroactions reçues..."
                      />
                      <div className="flex justify-between items-center">
                        <div className="text-[10px] text-white/30 tracking-widest">{pitch.length} / min. 80 car.</div>
                        <button className="btn primary" onClick={submitPitch}>
                          [ PRÉSENTER AU PANEL → ]
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {screen === 'verdict' && (
          <motion.div
            key="verdict"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="screen bg-black p-0 overflow-hidden"
          >
            <video 
              key={verdictVideo}
              autoPlay 
              loop={verdictVideo.includes('Scene8x')} 
              muted={false}
              playsInline
              className="cctv-video absolute inset-0 w-full h-full object-cover"
              src={verdictVideo}
            />
            <div className="relative z-10 w-full max-w-md bg-black/80 border border-white/10 p-8 flex flex-col gap-6 backdrop-blur-sm">
              <div className="text-[10px] tracking-[0.45em] text-white/20 pb-4 border-b border-white/5">DÉLIBÉRATION DU PANEL</div>
              
              <div className="flex flex-col gap-4">
                {['noir', 'rouge', 'jaune', 'blanc', 'vert', 'bleu'].map((id) => {
                  const p = PERSONAS.find(pers => pers.id === id)!;
                  const score = verdictScores ? verdictScores[id] : 0;
                  return (
                    <div key={id} className="flex items-center gap-4">
                      <div className="text-[10px] tracking-widest text-white/30 w-24">{p.chapeau}</div>
                      <div className="flex-1 h-1 bg-white/5 relative overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                          className="absolute inset-y-0 left-0"
                          style={{ backgroundColor: p.accentColor }}
                        />
                      </div>
                      <div className="text-[10px] text-white/40 w-8 text-right">{score}%</div>
                    </div>
                  );
                })}
              </div>

              {verdictAvg !== null && (
                <div className="pt-4 border-t border-white/5 mt-2 flex justify-between items-baseline">
                  <span className="text-[10px] tracking-widest text-white/20">MOYENNE DU PANEL</span>
                  <div className="flex items-baseline">
                    <span className="font-oswald font-bold text-5xl text-white/70">{verdictAvg}</span>
                    <span className="text-xl text-white/40 ml-1">%</span>
                  </div>
                </div>
              )}

              {verdictWon !== null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 border text-sm tracking-widest text-center ${
                    verdictWon ? 'border-white/30 text-white/70' : 'border-white/10 text-white/30'
                  }`}
                >
                  {verdictWon ? '✓ ACCORD — PROJET APPROUVÉ' : '✗ REFUS — CONCEPT À REVOIR'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {screen === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="screen bg-[#060606] block overflow-y-auto"
          >
            <div className="max-w-6xl mx-auto p-10 flex flex-col gap-8">
              <div className="relative border border-white/10 p-6">
                <div className="absolute -top-2 left-4 bg-[#060606] px-2 text-[10px] tracking-widest text-white/20">— RAPPORT DE SESSION —</div>
                <h2 className="font-oswald font-light text-4xl tracking-widest text-white/80">RAPPORT DE SESSION</h2>
                <div className="text-xs text-white/30 mt-2 tracking-widest">
                  SESSION: {sessionId} · {new Date().toLocaleDateString()} · ÉTAGES: {results.length}/6
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERSONAS.map(p => {
                  const r = results.find(res => res.persona.id === p.id);
                  return (
                    <div key={p.id} className="border border-white/10 bg-white/[0.02] flex flex-col overflow-hidden">
                      <div className="relative h-48 overflow-hidden" style={{ backgroundColor: p.accentColor }}>
                        <div className="absolute inset-0 flex items-center justify-center font-oswald font-bold text-[120px] text-white/10 leading-none select-none">
                          {String(p.floor).padStart(3, '0')}
                        </div>
                        <div className="absolute inset-0 flex items-end justify-start p-4 bg-gradient-to-t from-black/80 to-transparent">
                          <div className="text-[10px] tracking-widest text-white/40">ÉTAGE {String(p.floor).padStart(3, '0')}</div>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-4 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="text-xs tracking-widest text-white/50">{p.chapeau} — {p.nom}</div>
                          <div className={`text-[10px] tracking-widest px-2 py-0.5 border ${
                            r ? 'border-white/30 text-white/60' : 'border-white/5 text-white/20'
                          }`}>
                            {r ? '✓ VALIDÉ' : '— EN ATTENTE'}
                          </div>
                        </div>
                        {r && (
                          <>
                            <div className="text-xs text-white/40 italic border-l border-white/10 pl-2 line-clamp-3">
                              "{r.response}"
                            </div>
                            <div className="text-xs text-white/60 leading-relaxed">
                              {r.evaluation}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4 no-print">
                <button className="btn primary flex items-center gap-2" onClick={() => window.print()}>
                  <Printer size={16} /> [ EXPORTER PDF ]
                </button>
                <button className="btn ghost flex items-center gap-2" onClick={() => setScreen('title')}>
                  <RefreshCw size={16} /> [ NOUVELLE SESSION ]
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
