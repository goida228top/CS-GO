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
import { PlayerProfile, Team } from './types';
import { socketManager } from './SocketManager'; 

// Helper to safely request lock without throwing unhandled rejections
const safeRequestLock = () => {
    try {
        const promise = document.body.requestPointerLock() as any;
        if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {
                // Silently ignore "User exited lock" error
            });
        }
    } catch (e) {
        // Ignore synchronous errors
    }
};

const App: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false); 
  const [gameStarted, setGameStarted] = useState(false);
  
  // Explicit Pause State (controlled by ESC)
  const [isPaused, setIsPaused] = useState(false);
  
  // Game Flow State
  const [gameStep, setGameStep] = useState<'menu' | 'browser' | 'lobby' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<string>('training');
  
  // User Data
  const [userProfile, setUserProfile] = useState<PlayerProfile>({
      nickname: 'Player',
      avatarColor: '#3b82f6'
  });
  
  const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
  
  // --- DEV MODE LOGIC ---
  const [isDev, setIsDev] = useState(() => localStorage.getItem('dev_mode') === 'true');
  const shiftCounter = useRef(0);
  const lastShiftTime = useRef(0);

  // Toggle Dev Mode
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.ctrlKey || e.code === 'ControlLeft') {
              const now = Date.now();
              if (now - lastShiftTime.current < 500) {
                  shiftCounter.current++;
              } else {
                  shiftCounter.current = 1;
              }
              lastShiftTime.current = now;

              if (shiftCounter.current >= 5) {
                  const newState = !isDev;
                  setIsDev(newState);
                  localStorage.setItem('dev_mode', String(newState));
                  // Visual Feedback
                  const msg = document.createElement('div');
                  msg.innerText = newState ? "👨‍💻 DEVELOPER MODE ACTIVATED" : "🚫 DEV MODE OFF";
                  msg.style.cssText = "position:fixed; top:10%; left:50%; transform:translate(-50%,0); background:lime; color:black; font-weight:bold; padding:20px; z-index:9999; border: 4px solid white;";
                  document.body.appendChild(msg);
                  setTimeout(() => msg.remove(), 2000);
                  shiftCounter.current = 0;
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDev]);

  // Handle ESC for Pause
  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.code === 'Escape' && gameStarted) {
              if (isBuyMenuOpen) {
                  setIsBuyMenuOpen(false);
                  safeRequestLock();
              } else {
                  // Toggle Pause
                  setIsPaused(prev => {
                      const next = !prev;
                      if (next) document.exitPointerLock();
                      else safeRequestLock();
                      return next;
                  });
              }
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [gameStarted, isBuyMenuOpen]);

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
      
      if (modeId === 'duel' || modeId === 'bomb' || modeId === 'tdm') {
          // Online Modes -> Go to Server Browser
          setGameStep('browser');
      } else {
          // Training -> Start immediately
          startGame(false);
      }
  };

  const handleRoomJoined = () => {
      setGameStep('lobby');
  };

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
          safeRequestLock();
      }
  };

  const handleResume = () => {
      setIsPaused(false);
      safeRequestLock();
  };

  return (
    <div className="relative w-full h-full bg-[#111]">
      <Loader />
      
      {/* Pass profile to HUD for scorebaord */}
      <HUD userProfile={userProfile} />
      
      {/* HUD BUY MENU - Renders above canvas */}
      <BuyMenu 
          isOpen={isBuyMenuOpen} 
          onClose={() => handleBuyMenuToggle(false)} 
      />

      {/* DEV MOD MENU */}
      <ModMenu isDev={isDev} gameMode={gameMode} />
      
      {/* Step 1: Main Menu */}
      {gameStep === 'menu' && ready && (
          <MainMenu onPlay={handlePlay} />
      )}

      {/* Step 2: Server Browser (Online Only) */}
      {gameStep === 'browser' && (
          <ServerBrowser 
            userProfile={userProfile} 
            onBack={() => setGameStep('menu')}
            onRoomJoined={handleRoomJoined}
          />
      )}

      {/* Step 3: Lobby (Wait for start) */}
      {gameStep === 'lobby' && (
          <TeamSelect userProfile={userProfile} onSelectTeam={handleLobbyStart} />
      )}

      {/* PAUSE SCREEN (Only visible if explicitly paused by ESC) */}
      {gameStarted && isPaused && !isBuyMenuOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 bg-black/60 text-white backdrop-blur-sm pointer-events-auto">
          <h2 className="text-5xl font-black italic mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">PAUSED</h2>
          
          <button 
              onClick={handleResume}
              className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors mb-4"
          >
              RESUME GAME
          </button>
          
          <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 border border-white/20 text-white/50 hover:text-white hover:border-white font-bold uppercase tracking-widest transition-colors"
          >
              DISCONNECT
          </button>

          <div className="mt-8 text-sm text-gray-400 text-center font-mono">
             <p>WASD - Move | SPACE - Jump</p>
             <p>B - Buy Menu</p>
             {isDev && <p className="text-lime-400 mt-2 font-bold animate-pulse">DEV MODE: CTRL TO OPEN MENU</p>}
          </div>
        </div>
      )}

      {/* UNLOCKED BUT NOT PAUSED (Small hint) */}
      {gameStarted && !locked && !isPaused && !isBuyMenuOpen && (
           <div 
             className="absolute top-0 left-0 w-full h-full z-10 cursor-pointer flex items-center justify-center group"
             onClick={handleResume}
           >
               <div className="bg-black/40 px-4 py-2 rounded text-white font-bold text-sm backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                   CLICK TO CAPTURE MOUSE
               </div>
           </div>
      )}

      {/* RETICLE (Only when locked) */}
      {gameStarted && locked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mix-blend-difference">
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_2px_black]"></div>
        </div>
      )}

      {gameStarted && !isBuyMenuOpen && (
         <PointerLocker 
            onLock={() => setLocked(true)} 
            onUnlock={() => setLocked(false)} 
         />
      )}

      <Canvas 
        camera={{ position: [0, 5, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: false }}
      >
        <Stats />
        <Suspense fallback={null}>
            {gameStarted && (
              <Physics gravity={gravity}>
                <World gameMode={gameMode} isDev={isDev} />
                <Player isLocked={locked} onBuyMenuToggle={handleBuyMenuToggle} />
              </Physics>
            )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;