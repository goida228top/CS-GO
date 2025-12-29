import React, { useState, useEffect } from 'react';

interface ModMenuProps {
    isDev: boolean;
    gameMode: string;
}

type TabName = 'COMBAT' | 'VISUALS' | 'PLAYER' | 'WORLD';

export const ModMenu: React.FC<ModMenuProps> = ({ isDev, gameMode }) => {
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<TabName>('VISUALS');
    const [, forceUpdate] = useState({});

    // Toggle Menu
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            // Right Control or just Control to open
            if (e.code === 'ControlRight' || e.code === 'ControlLeft') {
                setVisible(v => {
                    const newState = !v;
                    if (newState) {
                        document.exitPointerLock();
                    }
                    return newState;
                });
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleCheat = (key: keyof typeof window.CHEATS) => {
        window.CHEATS[key] = !window.CHEATS[key];
        // Trigger event for components that listen directly (like ESP)
        window.dispatchEvent(new Event('CHEAT_UPDATE'));
        forceUpdate({});
    };

    const updateForce = (val: number) => {
        if (window.GAME_SETTINGS) window.GAME_SETTINGS.gunForce = val;
        forceUpdate({});
    };

    const respawnMannequins = () => {
        window.dispatchEvent(new Event('RESPAWN_ALL'));
    };

    if (!visible) return null;

    const renderToggle = (label: string, cheatKey: keyof typeof window.CHEATS, desc: string) => (
        <div 
            onClick={() => toggleCheat(cheatKey)}
            className={`
                flex items-center justify-between p-4 mb-2 rounded border-l-4 cursor-pointer transition-all select-none
                ${window.CHEATS[cheatKey] 
                    ? 'bg-gray-800 border-lime-500 shadow-[0_0_15px_rgba(132,204,22,0.2)]' 
                    : 'bg-gray-900 border-gray-700 hover:bg-gray-800'}
            `}
        >
            <div className="flex flex-col">
                <span className={`font-bold text-lg ${window.CHEATS[cheatKey] ? 'text-white' : 'text-gray-400'}`}>
                    {label}
                </span>
                <span className="text-[10px] text-gray-500 font-mono uppercase">{desc}</span>
            </div>
            <div className={`w-4 h-4 rounded-sm ${window.CHEATS[cheatKey] ? 'bg-lime-500 shadow-[0_0_10px_lime]' : 'bg-gray-700'}`} />
        </div>
    );

    return (
        <div className="absolute inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans">
            <div className="w-[800px] h-[600px] flex bg-[#111] rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                
                {/* SIDEBAR */}
                <div className="w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col">
                    <div className="p-8 border-b border-gray-800">
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400 italic">
                            HYPER<span className="text-white">CLIENT</span>
                        </h1>
                        <p className="text-xs text-gray-500 mt-1 font-mono">b1.0.0 | dev_build</p>
                    </div>
                    
                    <div className="flex-1 py-4">
                        {(['COMBAT', 'VISUALS', 'PLAYER', 'WORLD'] as TabName[]).map(tab => (
                            <div 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    px-8 py-4 cursor-pointer font-bold text-sm tracking-widest transition-all
                                    ${activeTab === tab 
                                        ? 'text-white bg-gradient-to-r from-white/10 to-transparent border-l-4 border-lime-500' 
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-l-4 border-transparent'}
                                `}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 text-center text-[10px] text-gray-700 font-mono">
                        PRESS [CTRL] TO CLOSE
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 p-8 overflow-y-auto bg-[url('https://raw.githubusercontent.com/goida228top/textures/main/grid_bg.png')] bg-cover">
                    <h2 className="text-4xl font-black text-white mb-8 border-b border-white/10 pb-4">{activeTab}</h2>

                    {activeTab === 'COMBAT' && (
                        <div className="grid grid-cols-1 gap-2">
                            {renderToggle('KILL AURA', 'aimbot', 'Auto-locks on nearest enemy head')}
                            {renderToggle('RAPID FIRE', 'rapidFire', 'Removes weapon fire rate limit')}
                            {renderToggle('AUTO PISTOL', 'autoPistol', 'Makes pistols fully automatic')}
                        </div>
                    )}

                    {activeTab === 'VISUALS' && (
                        <div className="grid grid-cols-1 gap-2">
                            {renderToggle('ESP BOX', 'esp', 'Draws 2D boxes around players')}
                            {renderToggle('CHAMS', 'chams', 'See players through walls (Pink Glow)')}
                        </div>
                    )}

                    {activeTab === 'PLAYER' && (
                        <div className="grid grid-cols-1 gap-2">
                            {renderToggle('GOD MODE', 'godMode', 'Invulnerability to damage')}
                            {renderToggle('FLIGHT', 'fly', 'Fly like a bird (Press V)')}
                            {renderToggle('NO RELOAD', 'infiniteAmmo', 'Infinite clip size')}
                            {renderToggle('SPEED', 'speedhack', 'Increases movement speed')}
                        </div>
                    )}

                    {activeTab === 'WORLD' && (
                        <div className="space-y-6">
                            {gameMode === 'training' ? (
                                <>
                                    <div className="bg-gray-900 p-4 rounded border border-gray-800">
                                        <label className="block text-gray-400 font-bold mb-2 text-sm uppercase">Bullet Force Power</label>
                                        <input 
                                            type="range" min="0" max="5" step="0.1" 
                                            defaultValue={window.GAME_SETTINGS?.gunForce || 0.1}
                                            onChange={(e) => updateForce(parseFloat(e.target.value))}
                                            className="w-full accent-lime-500"
                                        />
                                        <div className="text-right text-lime-500 font-mono mt-1">{(window.GAME_SETTINGS?.gunForce || 0.1).toFixed(1)}x</div>
                                    </div>
                                    
                                    <button 
                                        onClick={respawnMannequins}
                                        className="w-full py-4 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white font-bold rounded border border-red-500/50 uppercase tracking-widest transition-all"
                                    >
                                        Respawn Mannequins
                                    </button>
                                </>
                            ) : (
                                <div className="p-6 bg-red-900/20 border border-red-500/30 rounded text-center text-red-400 font-bold">
                                    WORLD SETTINGS LOCKED IN ONLINE MODE
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};