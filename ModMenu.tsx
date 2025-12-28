
import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

export const ModMenu = () => {
    const [visible, setVisible] = useState(false);
    const [force, setForce] = useState(0.1);
    const [drag, setDrag] = useState(false);
    
    // Состояние для позиции оружия (обновлено по умолчанию)
    const [weaponPos, setWeaponPos] = useState({ x: 0.40, y: -0.25, z: 1.10 });

    useEffect(() => {
        const toggle = (e: KeyboardEvent) => { if (e.code === 'KeyM') setVisible(v => !v); };
        window.addEventListener('keydown', toggle);
        
        // Синхронизируем с глобальными настройками при маунте
        if (window.GAME_SETTINGS && window.GAME_SETTINGS.fpsWeaponPosition) {
             setWeaponPos(window.GAME_SETTINGS.fpsWeaponPosition);
        }

        return () => window.removeEventListener('keydown', toggle);
    }, []);

    const updateForce = (val: number) => {
        setForce(val);
        window.GAME_SETTINGS.gunForce = val;
    };

    const updateDrag = (val: boolean) => {
        setDrag(val);
        window.GAME_SETTINGS.dragMode = val;
    };

    const updateWeaponPos = (axis: 'x' | 'y' | 'z', val: number) => {
        const newPos = { ...weaponPos, [axis]: val };
        setWeaponPos(newPos);
        window.GAME_SETTINGS.fpsWeaponPosition = newPos;
    };

    const respawn = () => {
        window.dispatchEvent(new Event('RESPAWN_ALL'));
    };

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
            <div className="absolute top-4 right-4 text-white text-right pointer-events-none z-50">
                <p className="text-xs opacity-50 shadow-black drop-shadow-md">Press 'M' for Mod Menu</p>
                <p className="text-xs opacity-50 shadow-black drop-shadow-md">F - Fly Mode | G - Super Speed</p>
            </div>
            
            {visible && (
                <div className="absolute top-10 right-10 w-72 bg-black/90 text-white p-4 rounded border border-gray-700 pointer-events-auto font-mono text-xs z-50">
                    <h2 className="text-lg font-bold mb-3 text-lime-400 border-b border-gray-800 pb-1">MOD MENU</h2>
                    
                    {/* GUN POSITION DEBUGGER */}
                    <div className="mb-4 bg-gray-900 p-2 rounded border border-gray-800">
                        <h3 className="text-cyan-400 font-bold mb-2 uppercase">FPS Gun Position</h3>
                        
                        <div className="mb-2">
                            <label className="flex justify-between mb-1">
                                <span>X (Right/Left)</span>
                                <span className="text-gray-500">{weaponPos.x.toFixed(2)}</span>
                            </label>
                            <input type="range" min="-1" max="1" step="0.05" value={weaponPos.x} onChange={(e) => updateWeaponPos('x', Number(e.target.value))} className="w-full accent-cyan-500" />
                        </div>

                        <div className="mb-2">
                            <label className="flex justify-between mb-1">
                                <span>Y (Up/Down)</span>
                                <span className="text-gray-500">{weaponPos.y.toFixed(2)}</span>
                            </label>
                            <input type="range" min="-1" max="1" step="0.05" value={weaponPos.y} onChange={(e) => updateWeaponPos('y', Number(e.target.value))} className="w-full accent-cyan-500" />
                        </div>

                        <div>
                            <label className="flex justify-between mb-1">
                                <span>Z (Fwd/Back)</span>
                                <span className="text-gray-500">{weaponPos.z.toFixed(2)}</span>
                            </label>
                            <input type="range" min="-1" max="2" step="0.05" value={weaponPos.z} onChange={(e) => updateWeaponPos('z', Number(e.target.value))} className="w-full accent-cyan-500" />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="block mb-1 text-gray-400">Physics Push Force</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.001"
                            value={force} 
                            onChange={(e) => updateForce(Number(e.target.value))}
                            className="w-full accent-lime-500"
                        />
                    </div>

                    <div className="mb-3 flex items-center justify-between p-2 bg-gray-800 rounded">
                        <span>Drag Mode (Hold Click)</span>
                        <input 
                            type="checkbox" 
                            checked={drag} 
                            onChange={(e) => updateDrag(e.target.checked)}
                            className="w-4 h-4 accent-lime-500 cursor-pointer"
                        />
                    </div>

                    <button 
                        onClick={respawn}
                        className="w-full py-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white font-bold rounded border border-red-800 transition-colors"
                    >
                        RESPAWN DUMMIES
                    </button>
                </div>
            )}
        </Html>
    );
};
