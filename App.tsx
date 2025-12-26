import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls, useProgress, Html } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Player } from './Player';
import { World } from './World';

// Компонент загрузчика
const Loader = () => {
  const { active, progress } = useProgress();
  
  if (!active) return null;

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-[#050505] flex flex-col items-center justify-center z-50">
      <div className="w-64">
        <div className="text-white font-black text-2xl mb-2 tracking-tighter text-center animate-pulse">
          LOADING SYSTEM...
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-gray-500 text-xs mt-2 text-right font-mono">
          {progress.toFixed(0)}%
        </div>
      </div>
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

      <div 
        className={`absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-20 pointer-events-none 
        ${(locked || !ready) ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 bg-black/80 backdrop-blur-sm`}
      >
        <div className="p-8 bg-gray-900/90 border border-gray-700 rounded-2xl text-center shadow-2xl transform transition-transform duration-500 hover:scale-105">
          <h1 className="text-5xl font-black mb-2 text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">BOX WALKER 3D</h1>
          <p className="text-gray-400 mb-6 font-medium tracking-wide">Lite Version 1.2</p>
          
          <div className="text-sm text-gray-300 space-y-3 mb-8 text-left inline-block bg-black/40 p-6 rounded-xl border border-white/5 shadow-inner">
            <p className="flex items-center gap-3">🖱️ <span className="text-white font-bold">CLICK</span> to Capture Mouse</p>
            <p className="flex items-center gap-3">⌨️ <span className="text-white font-bold bg-gray-700 px-1 rounded">W</span><span className="text-white font-bold bg-gray-700 px-1 rounded">A</span><span className="text-white font-bold bg-gray-700 px-1 rounded">S</span><span className="text-white font-bold bg-gray-700 px-1 rounded">D</span> to Move</p>
            <p className="flex items-center gap-3">⌨️ <span className="text-white font-bold bg-gray-700 px-2 rounded">SHIFT</span> to Run/Walk</p>
            <p className="flex items-center gap-3">⌨️ <span className="text-white font-bold bg-gray-700 px-2 rounded">SPACE</span> to Jump</p>
            <p className="flex items-center gap-3">⌨️ <span className="text-white font-bold bg-gray-700 px-2 rounded">E</span> to Equip/Attack</p>
            <p className="flex items-center gap-3">⌨️ <span className="text-white font-bold bg-gray-700 px-2 rounded">R</span> to RAGDOLL</p>
            <p className="flex items-center gap-3">🖱️ <span className="text-white font-bold">MOUSE</span> to Look</p>
          </div>
          
          <div className="text-indigo-400 text-xs uppercase tracking-[0.2em] animate-pulse font-bold bg-indigo-500/10 py-2 rounded-full border border-indigo-500/20">
            Click anywhere to start
          </div>
        </div>
      </div>

      {locked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none opacity-80 mix-blend-difference">
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]"></div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 5, 8], fov: 50 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          stencil: false,
          depth: true
        }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -25, 0]}>
            <World />
            <Player isLocked={locked} />
          </Physics>
          
          <PointerLockControls 
            onLock={() => setLocked(true)} 
            onUnlock={() => setLocked(false)}
            selector="#root"
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;