import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress, Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier'; 
import { Player } from './Player';
import { World } from './World';
import { Loader } from './Loader';
import { MainMenu } from './MainMenu';
import { ServerBrowser } from './ServerBrowser';
import { TeamSelect } from './TeamSelect';
import { PointerLocker } from './PointerLocker';
import { HUD } from './HUD';
import { BuyMenu } from './BuyMenu';
import { ModMenu } from './ModMenu'; 
import { PlayerProfile, Team, GameState } from './types';
import { socketManager } from './SocketManager'; 

const safeRequestLock = () => {
    try {
        const promise = document.body.requestPointerLock() as any;
        if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
        }
    } catch (e) {}
};

const DeathScreen = ({ killerName, damage }: { killerName: string, damage: number }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/30 z-50 pointer-events-none">
        <h1 className="text-6xl font-black text-red-500 uppercase tracking-widest drop-shadow-[0_0_10px_black] animate-pulse">
            ВЫ ПОГИБЛИ
        </h1>
        <div className="mt-4 bg-black/80 px-8 py-4 rounded border border-red-500/50">
            <div className="text-xl text-white font-bold">
                УБИЙЦА: <span className="text-red-400">{killerName}</span>
            </div>
        </div>
        <p className="mt-8 text-white/50 animate-bounce">Нажмите [B] чтобы купить оружие к следующему раунду</p>
    </div>
);

const Announcement = ({ text }: { text: string }) => {
    if(!text) return null;
    return (
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 bg-black/70 px-10 py-4 border-y-2 border-yellow-500 z-40 animate-fade-in-up">
            <h2 className="text-3xl font-black text-yellow-400 uppercase tracking-widest text-center">{text}</h2>
        </div>
    );
};

const App: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false); 
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [gameStep, setGameStep] = useState<'menu' | 'browser' | 'lobby' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<string>('training');
  
  const [userProfile, setUserProfile] = useState<PlayerProfile>({
      nickname: 'Player',
      avatarColor: '#3b82f6'
  });
  
  const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
  const [isDev, setIsDev] = useState(() => localStorage.getItem('dev_mode') === 'true');
  const shiftCounter = useRef(0);
  const lastShiftTime = useRef(0);

  // --- GAME STATE ---
  const [gameState, setGameState] = useState<GameState>({
      status: 'waiting',
      timer: 0,
      round: 0,
      scoreT: 0,
      scoreCT: 0,
      winner: null
  });
  const [announcement, setAnnouncement] = useState<string | null>(null);
  
  // --- DEATH STATE ---
  const [isDead, setIsDead] = useState(false);
  const [killerName, setKillerName] = useState('Unknown');

  // Socket Logic for Game Loop
  useEffect(() => {
      socketManager.onGameStateUpdate = (state) => {
          setGameState(state);
          // Pass score to HUD via events if needed or props
          window.dispatchEvent(new CustomEvent('SCORE_UPDATE', { detail: state }));
      };

      socketManager.onAnnouncement = (msg) => {
          setAnnouncement(msg);
          setTimeout(() => setAnnouncement(null), 5000);
      };

      socketManager.onLocalDeath = (killerId) => {
          setIsDead(true);
          const killer = socketManager.otherPlayers[killerId];
          setKillerName(killer ? killer.nickname : 'Unknown');
          document.exitPointerLock();
      };

      socketManager.onRespawnAll = () => {
          setIsDead(false);
          setKillerName('');
          // ActivePlayer listens to this via event separately to reset pos
      };

      return () => {
          socketManager.onGameStateUpdate = null;
          socketManager.onAnnouncement = null;
          socketManager.onLocalDeath = null;
          socketManager.onRespawnAll = null;
      };
  }, []);

  // Toggle Dev Mode
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.code === 'ControlLeft') {
              const now = Date.now();
              if (now - lastShiftTime.current < 500) shiftCounter.current++;
              else shiftCounter.current = 1;
              lastShiftTime.current = now;

              if (shiftCounter.current >= 5) {
                  const newState = !isDev;
                  setIsDev(newState);
                  localStorage.setItem('dev_mode', String(newState));
                  shiftCounter.current = 0;
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDev]);

  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.code === 'Escape' && gameStarted) {
              if (isBuyMenuOpen) {
                  setIsBuyMenuOpen(false);
                  if(!isDead) safeRequestLock();
              } else {
                  setIsPaused(prev => {
                      const next = !prev;
                      if (next) document.exitPointerLock();
                      else if(!isDead) safeRequestLock();
                      return next;
                  });
              }
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [gameStarted, isBuyMenuOpen, isDead]);

  const { active } = useProgress();
  const gravity = useMemo<[number, number, number]>(() => [0, -20, 0], []);
  
  useEffect(() => {
    if (!active) {
      const timeout = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  const handlePlay = (modeId: string, profile: PlayerProfile) => {
      setGameMode(modeId);
      setUserProfile(profile);
      if (modeId === 'duel' || modeId === 'bomb' || modeId === 'tdm') setGameStep('browser');
      else startGame(false);
  };

  const handleRoomJoined = () => setGameStep('lobby');
  const handleLobbyStart = (team: Team) => {
      setUserProfile(prev => ({ ...prev, team }));
      startGame(true);
  };

  const startGame = (online = false) => {
      setGameStep('game');
      setGameStarted(true);
      setIsPaused(false);
      safeRequestLock();
  };
  
  const handleBuyMenuToggle = (isOpen: boolean) => {
      setIsBuyMenuOpen(isOpen);
      if (isOpen) {
          document.exitPointerLock();
          setLocked(false);
      } else {
          if(!isDead) safeRequestLock();
      }
  };

  const handleResume = () => {
      setIsPaused(false);
      if(!isDead) safeRequestLock();
  };

  return (
    <div className="relative w-full h-full bg-[#111]">
      <Loader />
      
      <HUD userProfile={userProfile} />
      {announcement && <Announcement text={announcement} />}
      {isDead && <DeathScreen killerName={killerName} damage={100} />}

      <BuyMenu isOpen={isBuyMenuOpen} onClose={() => handleBuyMenuToggle(false)} />
      <ModMenu isDev={isDev} gameMode={gameMode} />
      
      {gameStep === 'menu' && ready && <MainMenu onPlay={handlePlay} />}
      {gameStep === 'browser' && <ServerBrowser userProfile={userProfile} onBack={() => setGameStep('menu')} onRoomJoined={handleRoomJoined} />}
      {gameStep === 'lobby' && <TeamSelect userProfile={userProfile} onSelectTeam={handleLobbyStart} />}

      {gameStarted && isPaused && !isBuyMenuOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 bg-black/60 text-white backdrop-blur-sm pointer-events-auto">
          <h2 className="text-5xl font-black italic mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">PAUSED</h2>
          <button onClick={handleResume} className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors mb-4">RESUME GAME</button>
          <button onClick={() => window.location.reload()} className="px-8 py-3 border border-white/20 text-white/50 hover:text-white hover:border-white font-bold uppercase tracking-widest transition-colors">DISCONNECT</button>
        </div>
      )}

      {/* Show Capture Hint if not locked, not paused, not dead */}
      {gameStarted && !locked && !isPaused && !isBuyMenuOpen && !isDead && (
           <div className="absolute top-0 left-0 w-full h-full z-10 cursor-pointer flex items-center justify-center group" onClick={handleResume}>
               <div className="bg-black/40 px-4 py-2 rounded text-white font-bold text-sm backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">CLICK TO CAPTURE MOUSE</div>
           </div>
      )}

      {gameStarted && locked && !isDead && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mix-blend-difference">
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_2px_black]"></div>
        </div>
      )}

      {gameStarted && !isBuyMenuOpen && !isDead && (
         <PointerLocker onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} />
      )}

      <Canvas camera={{ position: [0, 5, 8], fov: 50 }} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: false }}>
        <Stats />
        <Suspense fallback={null}>
            {gameStarted && (
              <Physics gravity={gravity}>
                <World gameMode={gameMode} isDev={isDev} />
                <Player isLocked={locked && !isDead} onBuyMenuToggle={handleBuyMenuToggle} />
              </Physics>
            )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;