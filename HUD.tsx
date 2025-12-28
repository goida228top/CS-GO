
import React, { useState, useEffect, useRef } from 'react';

export const HUD = () => {
    const [state, setState] = useState({ visible: false, ammo: 0, isReloading: false });
    
    // Используем ref для координат, чтобы не вызывать ререндер всего компонента 60 раз в секунду
    const posRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleUpdate = (e: any) => {
            if (e.detail) setState(e.detail);
        };

        const handlePosUpdate = (e: any) => {
            if (posRef.current && e.detail) {
                const { x, y, z } = e.detail;
                posRef.current.innerText = `POS: ${x.toFixed(2)}  ${y.toFixed(2)}  ${z.toFixed(2)}`;
            }
        };

        window.addEventListener('HUD_UPDATE', handleUpdate);
        window.addEventListener('HUD_POS_UPDATE', handlePosUpdate);
        
        return () => {
            window.removeEventListener('HUD_UPDATE', handleUpdate);
            window.removeEventListener('HUD_POS_UPDATE', handlePosUpdate);
        };
    }, []);

    // Показываем интерфейс всегда, когда есть ammo (или можно добавить флаг gameStarted, но пока так)
    // Если нужно скрывать худ в меню, можно проверять visible, но координаты и счет часто нужны всегда в игре.
    // Оставим проверку visible только для патронов, а топ-бар покажем всегда (или можно добавить условие).
    
    return (
        <div className="absolute inset-0 pointer-events-none z-20 font-sans select-none">
            
            {/* TOP SCOREBOARD */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-start">
                <div className="flex bg-black/60 backdrop-blur-md rounded-b-xl overflow-hidden shadow-lg border-x border-b border-white/10">
                    
                    {/* CT Side (Left) */}
                    <div className="flex items-center px-6 py-2 bg-gradient-to-r from-cyan-900/50 to-transparent gap-3">
                        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                            <span className="text-white font-bold text-xs">CT</span>
                        </div>
                        <span className="text-cyan-400 font-black text-3xl drop-shadow-md">0</span>
                    </div>

                    {/* Timer (Middle) */}
                    <div className="flex items-center justify-center px-6 py-2 border-x border-white/10 min-w-[100px]">
                        <span className="text-white font-mono font-bold text-2xl tracking-widest opacity-90">00:00</span>
                    </div>

                    {/* T Side (Right) */}
                    <div className="flex items-center px-6 py-2 bg-gradient-to-l from-orange-900/50 to-transparent gap-3 flex-row-reverse">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                            <span className="text-black font-bold text-xs">T</span>
                        </div>
                        <span className="text-yellow-500 font-black text-3xl drop-shadow-md">0</span>
                    </div>

                </div>
            </div>

            {/* COORDINATES (Bottom Left) */}
            <div 
                ref={posRef}
                className="absolute bottom-4 left-4 text-[10px] font-mono text-white/40 tracking-wider bg-black/20 p-1 rounded"
            >
                POS: 0.00 0.00 0.00
            </div>

            {/* AMMO & RELOAD (Bottom Right) */}
            {state.visible && (
                <div className="absolute bottom-10 right-10 flex flex-col items-end">
                    <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-t from-orange-600 to-yellow-400 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
                        {state.ammo} <span className="text-3xl text-gray-400">/ ∞</span>
                    </div>
                    {state.isReloading && (
                        <div className="text-red-500 font-bold animate-pulse text-xl tracking-widest">RELOADING...</div>
                    )}
                </div>
            )}
        </div>
    );
};
