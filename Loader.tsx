
import React from 'react';
import { useProgress } from '@react-three/drei';

export const Loader = () => {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-[#050505] flex flex-col items-center justify-center z-50">
      <div className="text-white font-black text-2xl mb-2 animate-pulse">LOADING... {progress.toFixed(0)}%</div>
    </div>
  );
};
