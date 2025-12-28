import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress, Stats } from '@react-three/drei';
import { Physics } from '@react-three/rapier'; 
import { Player } from './Player';
import { World } from './World';
import { Loader } from './Loader';
import { MainMenu } from './MainMenu';
import { PointerLocker } from './PointerLocker';
import { HUD } from './HUD';
import { BuyMenu } from './BuyMenu';

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
  
  // New state to pause pointer lock when buy menu is open
  const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);

  const { active } = useProgress();
  
  // Use Vector3 as requested by the type definition in error
  const gravity = useMemo<[number, number, number]>(() => [0, -20, 0], []);
  
  useEffect(() => {
    if (!active) {
      const timeout = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  const handlePlay = () => {
      setGameStarted(true);
      safeRequestLock();
  };
  
  // Callback passed to Player to handle UI state
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
      <HUD />
      
      {/* HUD BUY MENU - Renders above canvas */}
      <BuyMenu 
          isOpen={isBuyMenuOpen} 
          onClose={() => handleBuyMenuToggle(false)} 
      />
      
      {!gameStarted && ready && (
          <MainMenu onPlay={handlePlay} />
      )}

      {/* Pause Screen (Only if game started, not locked, AND not in buy menu) */}
      {gameStarted && !locked && !isBuyMenuOpen && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 bg-black/50 text-white pointer-events-none backdrop-blur-sm">
          <h2 className="text-4xl font-bold mb-2">PAUSED</h2>
          <p className="text-xl animate-pulse">CLICK TO RESUME</p>
          <div className="mt-8 text-sm text-gray-300 text-center bg-black/60 p-4 rounded">
             <p>WASD - Move | SPACE - Jump</p>
             <p>B - Buy Menu</p>
             <p>F - Inspect | R - Reload</p>
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
                <World />
                {/* Pass the toggle handler down */}
                <Player isLocked={locked} onBuyMenuToggle={handleBuyMenuToggle} />
              </Physics>
            )}
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;