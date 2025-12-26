
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, useProgress } from '@react-three/drei';
import { Physics } from '@react-three/rapier'; 
import { Player } from './Player';
import { World } from './World';

// Компонент загрузчика
const Loader = () => {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-[#050505] flex flex-col items-center justify-center z-50">
      <div className="text-white font-black text-2xl mb-2 animate-pulse">LOADING... {progress.toFixed(0)}%</div>
    </div>
  );
};

// UI Компаса
const CompassUI = () => {
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCompassUpdate = (e: CustomEvent<number>) => {
      if (arrowRef.current) {
        // e.detail содержит угол в радианах
        // Преобразуем в градусы и поворачиваем стрелку
        // -e.detail т.к. CSS rotation по часовой, а наши расчеты могут отличаться
        const deg = e.detail * (180 / Math.PI);
        arrowRef.current.style.transform = `rotate(${deg}deg)`;
      }
    };

    window.addEventListener('COMPASS_UPDATE', handleCompassUpdate as EventListener);
    return () => {
      window.removeEventListener('COMPASS_UPDATE', handleCompassUpdate as EventListener);
    };
  }, []);

  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-black/50 rounded-full border-2 border-white/30 flex items-center justify-center z-10 pointer-events-none backdrop-blur-sm">
        <div ref={arrowRef} className="w-full h-full flex items-center justify-center transition-transform duration-75">
             {/* Рисуем стрелку CSS-ом */}
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[20px] border-b-cyan-400 mb-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
        </div>
        <div className="absolute text-[10px] font-mono text-white/50 bottom-1">MAP</div>
    </div>
  );
};

const App: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false); 
  const { active } = useProgress();
  
  useEffect(() => {
    if (!active) {
      const timeout = setTimeout(() => setReady(true), 500);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  return (
    <div className="relative w-full h-full bg-[#111]">
      <Loader />
      
      {!locked && ready && (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 bg-black/80 text-white pointer-events-none">
          <h1 className="text-5xl font-black mb-4">BOX WALKER 3D</h1>
          <p>CLICK TO START</p>
          <div className="mt-8 text-sm text-gray-400 text-center">
             <p>WASD - Move | SPACE - Jump</p>
             <p>F - Toggle Fly Mode | G - Super Speed</p>
             <p>Follow the Arrow to find the map!</p>
          </div>
        </div>
      )}

      {locked && (
        <>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mix-blend-difference">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            <CompassUI />
        </>
      )}

      <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }}>
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]}>
            <World />
            <Player isLocked={locked} />
          </Physics>
          <PointerLockControls onLock={() => setLocked(true)} onUnlock={() => setLocked(false)} selector="#root" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;
