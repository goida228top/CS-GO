import React, { useState } from 'react';
import { PlayerProfile, Team } from './types';

interface TeamSelectProps {
    userProfile: PlayerProfile;
    onSelectTeam: (team: Team) => void;
}

export const TeamSelect: React.FC<TeamSelectProps> = ({ userProfile, onSelectTeam }) => {
    const [hoveredTeam, setHoveredTeam] = useState<Team | null>(null);

    // Mock other players for visual flair (Online prep)
    const ctPlayers = [
        // Empty for duel
    ];

    const tPlayers = [
        // Empty for duel
    ];

    return (
        <div className="absolute inset-0 z-50 bg-black/90 font-sans select-none flex flex-col">
            <div className="text-center py-6 border-b border-white/10">
                 <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em]">Выберите команду</h2>
            </div>
            
            <div className="flex-1 flex w-full">
                {/* TERRORISTS */}
                <div 
                    className={`
                        flex-1 flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300
                        ${hoveredTeam === 'T' ? 'bg-orange-900/40' : 'bg-black'}
                        border-r border-white/10 hover:border-orange-500/50
                    `}
                    onMouseEnter={() => setHoveredTeam('T')}
                    onMouseLeave={() => setHoveredTeam(null)}
                    onClick={() => onSelectTeam('T')}
                >
                    {/* Background Image tint */}
                    <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/goida228top/textures/main/t_bg.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                    
                    <div className="z-10 flex flex-col items-center transform transition-transform duration-300 hover:scale-105">
                        <div className="text-6xl mb-4">👺</div>
                        <h3 className="text-4xl font-black text-yellow-500 uppercase mb-2 drop-shadow-md">Terrorists</h3>
                        <p className="text-gray-400 text-sm tracking-widest mb-8">1 / 1 SLOTS</p>
                        
                        <div className="w-64 bg-black/50 border border-yellow-900/50 rounded p-4 min-h-[100px]">
                            {/* If hovering, show player preview here */}
                            {hoveredTeam === 'T' && (
                                <div className="flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: userProfile.avatarColor }}></div>
                                    <span className="text-white font-bold">{userProfile.nickname}</span>
                                </div>
                            )}
                             <div className="mt-4 text-xs text-gray-600 text-center uppercase">Waiting for opponent...</div>
                        </div>
                    </div>
                </div>

                {/* COUNTER-TERRORISTS */}
                <div 
                     className={`
                        flex-1 flex flex-col items-center justify-center relative cursor-pointer transition-all duration-300
                        ${hoveredTeam === 'CT' ? 'bg-cyan-900/40' : 'bg-black'}
                        border-l border-white/10 hover:border-cyan-500/50
                    `}
                    onMouseEnter={() => setHoveredTeam('CT')}
                    onMouseLeave={() => setHoveredTeam(null)}
                    onClick={() => onSelectTeam('CT')}
                >
                     <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/goida228top/textures/main/ct_bg.jpg')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

                    <div className="z-10 flex flex-col items-center transform transition-transform duration-300 hover:scale-105">
                        <div className="text-6xl mb-4">👮‍♂️</div>
                        <h3 className="text-4xl font-black text-cyan-500 uppercase mb-2 drop-shadow-md">Counter-Terrorists</h3>
                        <p className="text-gray-400 text-sm tracking-widest mb-8">1 / 1 SLOTS</p>

                         <div className="w-64 bg-black/50 border border-cyan-900/50 rounded p-4 min-h-[100px]">
                            {hoveredTeam === 'CT' && (
                                <div className="flex items-center gap-3 animate-pulse">
                                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: userProfile.avatarColor }}></div>
                                    <span className="text-white font-bold">{userProfile.nickname}</span>
                                </div>
                            )}
                            <div className="mt-4 text-xs text-gray-600 text-center uppercase">Waiting for opponent...</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="py-4 text-center text-gray-500 text-xs uppercase tracking-widest">
                Spectator Mode Disabled in Duel
            </div>
        </div>
    );
};