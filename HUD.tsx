import React, { useState, useEffect, useRef } from 'react';
import { PlayerProfile } from './types';

// Simple cross icon for HP
const MedicalCross = () => (
    <div className="w-6 h-6 relative mr-2">
        <div className="absolute top-0 left-[35%] w-[30%] h-full bg-white/90 shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
        <div className="absolute top-[35%] left-0 w-full h-[30%] bg-white/90 shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
    </div>
);

interface HUDProps {
    userProfile?: PlayerProfile;
}

export const HUD: React.FC<HUDProps> = ({ userProfile }) => {
    const [state, setState] = useState({ visible: false, ammo: 0, isReloading: false, health: 100 });
    
    // Default avatar color if none
    const myColor = userProfile?.avatarColor || '#3b82f6';
    
    // Используем ref для координат, чтобы не вызывать ререндер всего компонента 60 раз в секунду
    const posRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleUpdate = (e: any) => {
            if (e.detail) setState(prev => ({ ...prev, ...e.detail }));
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

    const isCT = userProfile?.team === 'CT' || !userProfile?.team;
    
    return (
        <div className="absolute inset-0 pointer-events-none z-20 font-sans select-none">
            
            {/* TOP SCOREBOARD */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2 flex items-start">
                <div className="flex bg-black/70 backdrop-blur-md rounded-lg overflow-hidden shadow-lg border border-white/10">
                    
                    {/* CT Side (Left) */}
                    <div className="flex items-center px-4 py-2 bg-gradient-to-r from-cyan-900/60 to-transparent gap-3 min-w-[120px] justify-start">
                        {/* Avatar */}
                        <div 
                            className="w-8 h-8 rounded flex items-center justify-center shadow-inner border border-white/20" 
                            style={{ backgroundColor: isCT ? myColor : '#333' }}
                        >
                            {isCT && <span className="text-[10px] text-white/50 font-bold">{userProfile?.nickname?.slice(0,2).toUpperCase()}</span>}
                        </div>
                        <span className={`font-black text-2xl drop-shadow-md ${isCT ? 'text-white' : 'text-gray-500'}`}>0</span>
                    </div>

                    {/* Timer (Middle) */}
                    <div className="flex items-center justify-center px-4 py-2 border-x border-white/10 min-w-[80px] bg-black/40">
                        <span className="text-white font-mono font-bold text-xl tracking-widest opacity-90">01:55</span>
                    </div>

                    {/* T Side (Right) */}
                    <div className="flex items-center px-4 py-2 bg-gradient-to-l from-orange-900/60 to-transparent gap-3 min-w-[120px] justify-end">
                         <span className={`font-black text-2xl drop-shadow-md ${!isCT ? 'text-white' : 'text-gray-500'}`}>0</span>
                        {/* Avatar */}
                        <div 
                             className="w-8 h-8 rounded flex items-center justify-center shadow-inner border border-white/20"
                             style={{ backgroundColor: !isCT ? myColor : '#333' }}
                        >
                             {!isCT && <span className="text-[10px] text-white/50 font-bold">{userProfile?.nickname?.slice(0,2).toUpperCase()}</span>}
                        </div>
                    </div>

                </div>
            </div>

            {/* COORDINATES */}
            <div 
                ref={posRef}
                className="absolute top-4 right-4 text-[10px] font-mono text-white/40 tracking-wider bg-black/20 p-1 rounded"
            >
                POS: 0.00 0.00 0.00
            </div>

            {/* BOTTOM HUD */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                
                {/* LEFT: HEALTH & ARMOR */}
                <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                        {/* HP BAR */}
                        <div className="flex items-center bg-black/60 backdrop-blur px-6 py-3 rounded-tr-xl rounded-bl-xl border-l-4 border-lime-500 shadow-lg">
                             <MedicalCross />
                             <div className="flex flex-col justify-center h-full">
                                <span className="text-4xl font-black text-white leading-none tracking-wide drop-shadow-md">
                                    {state.health}
                                </span>
                             </div>
                        </div>
                        {/* ARMOR BAR (Fake for now) */}
                         <div className="flex items-center bg-black/40 backdrop-blur px-4 py-1 rounded-r-lg border-l-4 border-cyan-500 shadow-lg w-fit mt-1">
                             <span className="text-xs text-cyan-200 font-bold tracking-wider">🛡️ 100</span>
                         </div>
                    </div>
                </div>

                {/* RIGHT: WEAPON & AMMO */}
                {state.visible && (
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-end bg-black/60 backdrop-blur px-6 py-3 rounded-tl-xl rounded-br-xl border-r-4 border-orange-500 shadow-lg">
                            <div className="flex flex-col items-end mr-4">
                                <span className="text-4xl font-black text-white leading-none tracking-wide drop-shadow-md">
                                    {state.ammo}
                                </span>
                                <span className="text-xs text-gray-400 font-bold tracking-wider">/ ∞</span>
                            </div>
                            <div className="h-8 w-[1px] bg-white/20 mx-2"></div>
                             {/* Simple icon for bullet */}
                            <div className="text-3xl">|||</div>
                        </div>
                        
                        {state.isReloading && (
                            <div className="bg-red-600/80 text-white px-3 py-1 text-xs font-black uppercase tracking-widest animate-pulse rounded">
                                RELOADING
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};