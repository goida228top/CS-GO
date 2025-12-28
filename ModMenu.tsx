import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

interface ModMenuProps {
    isDev: boolean;
    gameMode: string;
}

export const ModMenu: React.FC<ModMenuProps> = ({ isDev, gameMode }) => {
    const [visible, setVisible] = useState(false);
    const [force, setForce] = useState(0.1);
    
    // Cheats State
    const [wallhack, setWallhack] = useState(false);
    const [aimbot, setAimbot] = useState(false);
    const [canFly, setCanFly] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Training mode -> 'M' key
            if (gameMode === 'training' && e.code === 'KeyM') {
                setVisible(v => !v);
                return;
            }

            // Dev Mode -> Left Shift
            if (isDev && e.code === 'ShiftLeft') {
                // If we are holding shift for crouch, we don't want to spam menu,
                // but user asked for "Left Shift opens cheat menu".
                // Let's implement toggle on press.
                setVisible(v => !v);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDev, gameMode]);

    // Apply Cheats
    useEffect(() => {
        window.GAME_SETTINGS.showHitboxes = wallhack;
        window.dispatchEvent(new Event('SETTINGS_CHANGED'));
    }, [wallhack]);

    // We use a global variable or event for flying, let's update a setting or dispatch event
    // For now, let's make fly toggleable via key V in ActivePlayer if logic allows,
    // but here we just update a visual state or global flag.
    // Hack: We'll overwrite the 'training' mode check in ActivePlayer logic via a global flag if needed,
    // but better to just use the UI.

    const updateForce = (val: number) => {
        setForce(val);
        window.GAME_SETTINGS.gunForce = val;
    };

    const respawn = () => {
        window.dispatchEvent(new Event('RESPAWN_ALL'));
    };

    if (!visible) return null;

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
            <div className="absolute top-1/2 left-20 -translate-y-1/2 w-80 bg-black/95 text-white p-6 rounded-xl border-2 border-red-600 pointer-events-auto font-mono text-sm z-50 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                
                <div className="flex justify-between items-center mb-6 border-b border-red-800 pb-2">
                    <h2 className="text-2xl font-black text-red-500 italic tracking-widest">
                        {isDev ? "HACK_MENU_V3" : "TRAINING_MENU"}
                    </h2>
                    <span className="text-xs text-gray-500">{isDev ? "DEV_ACCESS" : "USER"}</span>
                </div>
                
                {/* CHEATS SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800 hover:border-red-500 transition-colors">
                        <span className="font-bold text-lg">WALLHACK (ESP)</span>
                        <div 
                            onClick={() => setWallhack(!wallhack)}
                            className={`w-12 h-6 rounded-full relative cursor-pointer ${wallhack ? 'bg-red-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${wallhack ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800 hover:border-red-500 transition-colors">
                         <div className="flex flex-col">
                            <span className="font-bold text-lg">AIMBOT</span>
                            <span className="text-[10px] text-gray-500">AUTO-LOCK ON HEAD</span>
                         </div>
                        <div 
                            onClick={() => setAimbot(!aimbot)}
                            className={`w-12 h-6 rounded-full relative cursor-pointer ${aimbot ? 'bg-red-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aimbot ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded border border-gray-800 hover:border-red-500 transition-colors">
                         <div className="flex flex-col">
                            <span className="font-bold text-lg">FLY MODE</span>
                            <span className="text-[10px] text-gray-500">PRESS 'V' TO TOGGLE</span>
                         </div>
                         <div className={`text-xs font-bold ${isDev || gameMode === 'training' ? 'text-green-500' : 'text-red-500'}`}>
                             {isDev || gameMode === 'training' ? "UNLOCKED" : "LOCKED"}
                         </div>
                    </div>
                </div>

                {/* SLIDERS */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                    <div className="mb-3">
                        <label className="block mb-1 text-gray-400 font-bold uppercase">Physics Punch Force</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="5" 
                            step="0.1"
                            value={force} 
                            onChange={(e) => updateForce(Number(e.target.value))}
                            className="w-full accent-red-500"
                        />
                        <div className="text-right text-xs text-red-400">{force.toFixed(1)}x</div>
                    </div>
                </div>

                <button 
                    onClick={respawn}
                    className="w-full mt-4 py-3 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white font-black uppercase tracking-widest rounded border border-red-900 transition-all hover:shadow-[0_0_15px_red]"
                >
                    RESET MAP OBJECTS
                </button>
                
                <div className="mt-4 text-[10px] text-center text-gray-600 font-mono">
                    build_version: 0.9.1-alpha <br/>
                    uid: {isDev ? "admin_root" : "guest"}
                </div>
            </div>
        </Html>
    );
};