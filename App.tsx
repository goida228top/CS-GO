import React, { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress, Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier'; 
import { Player } from './Player';
import { World } from './World';
import { Loader } from './Loader';
import { MainMenu } from './MainMenu';
import { TeamSelect } from './TeamSelect';
import { PointerLocker } from './PointerLocker';
import { HUD } from './HUD';
import { BuyMenu } from './BuyMenu';
import { PlayerProfile, Team } from './types';
import { socketManager } from './SocketManager'; // IMPORT

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
  
  // Game Flow State
  const [gameMode, setGameMode] = useState<string>('training');
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  
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

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'ShiftLeft') {
              const now = Date.now();
              // < 500ms between presses
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

  const { active } = useProgress();
  
  // Use Vector3 as requested by the type definition in error
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
      
      // If Mode is Duel or Bomb or TDM, show Team Select first
      if (modeId === 'duel' || modeId === 'bomb' || modeId === 'tdm') {
          setShowTeamSelect(true);
      } else {
          // Training mode skips team select (Defaults to CT usually or just free roam)
          startGame();
      }
  };

  const handleTeamSelected = (team: Team) => {
      setUserProfile(prev => ({ ...prev, team }));
      setShowTeamSelect(false);
      startGame(true); // Is Online
  };

  const startGame = (online = false) => {
      setGameStarted(true);
      safeRequestLock();
      
      // Connect to server if it's an online mode
      if (online || gameMode === 'duel' || gameMode === 'tdm') {
          socketManager.connect(userProfile);
      }
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
      
      {/* Step 1: Main Menu */}
      {!gameStarted && !showTeamSelect && ready && (
          <MainMenu onPlay={handlePlay} />
      )}

      {/* Step 2: Team Select (Overlay) */}
      {!gameStarted && showTeamSelect && (
          <TeamSelect userProfile={userProfile} onSelectTeam={handleTeamSelected} />
      )}

      {/* Pause Screen */}
      {gameStarted && !locked && !isBuyMenuOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 bg-black/50 text-white pointer-events-none backdrop-blur-sm">
          <h2 className="text-4xl font-bold mb-2">PAUSED</h2>
          <p className="text-xl animate-pulse">CLICK TO RESUME</p>
          <div className="mt-8 text-sm text-gray-300 text-center bg-black/60 p-4 rounded">
             <p>WASD - Move | SPACE - Jump</p>
             <p>B - Buy Menu</p>
             <p>F - Inspect | R - Reload</p>
             {isDev && <p className="text-lime-400 mt-2 font-bold animate-pulse">DEV MODE: PRESS L-SHIFT FOR CHEATS</p>}
          </div>
        </div>
      )}

      {gameStarted && locked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mix-blend-difference">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
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