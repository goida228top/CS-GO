
import React, { useRef, useEffect } from 'react';

export const CompassUI = () => {
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCompassUpdate = (e: CustomEvent<number>) => {
      if (arrowRef.current) {
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
    <div className="absolute top-16 left-1/2 -translate-x-1/2 w-16 h-16 bg-black/50 rounded-full border-2 border-white/30 flex items-center justify-center z-10 pointer-events-none backdrop-blur-sm">
        <div ref={arrowRef} className="w-full h-full flex items-center justify-center transition-transform duration-75">
            <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[20px] border-b-cyan-400 mb-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
        </div>
    </div>
  );
};
