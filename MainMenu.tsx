
import React, { useState } from 'react';

interface MainMenuProps {
    onPlay: () => void;
}

/**
 * --- ОПИСАНИЕ ИГРОВЫХ РЕЖИМОВ (ПЛАН) ---
 * 
 * 1. ЗАКЛАДКА БОМБЫ (BOMB DEFUSAL)
 *    - Тип: Командный (Terrorists vs Counter-Terrorists).
 *    - Игроки: Любое четное кол-во до 10 (2, 4, 6, 8, 10).
 *    - Правила:
 *      - 8 раундов (смена сторон или до победы в 5? решим позже).
 *      - Permadeath (смерть окончательна до конца раунда).
 *      - Цель T: Поставить бомбу и защитить до взрыва ИЛИ убить всех CT.
 *      - Цель CT: Обезвредить бомбу ИЛИ убить всех T (если бомба не стоит).
 *      
 * 2. ДУЭЛЬ (DUEL)
 *    - Тип: 1 на 1.
 *    - Игроки: Строго 2.
 *    - Правила:
 *      - Без задач (бомб/флагов).
 *      - Доступен весь арсенал.
 *      - Побеждает тот, кто первым наберет N убийств или выиграет N раундов.
 * 
 * 3. КОМАНДНЫЙ БОЙ (TEAM DEATHMATCH)
 *    - Тип: Командный.
 *    - Игроки: Любое четное кол-во до 10.
 *    - Правила:
 *      - Таймер матча: 15 минут.
 *      - Респаун: Через 3 секунды после смерти (бесконечные жизни).
 *      - Цель: Команда с большим количеством убийств по истечении времени побеждает.
 * 
 * 4. ТРЕНИРОВКА (TRAINING) - [АКТИВЕН СЕЙЧАС]
 *    - Тип: Одиночный (Sandbox).
 *    - Цель: Тест механик, стрельба по манекенам, изучение карты.
 */

type GameModeId = 'bomb' | 'duel' | 'tdm' | 'training';

interface GameModeDef {
    id: GameModeId;
    title: string;
    description: string;
    players: string;
    locked: boolean;
}

const GAME_MODES: GameModeDef[] = [
    {
        id: 'bomb',
        title: 'ЗАКЛАДКА БОМБЫ',
        description: 'Тактический режим. Одна жизнь на раунд. Установите или обезвредьте C4.',
        players: '2-10 ИГРОКОВ',
        locked: true
    },
    {
        id: 'duel',
        title: 'ДУЭЛЬ 1x1',
        description: 'Чистый скилл. Никаких помех. Только ты и твой противник.',
        players: '2 ИГРОКА',
        locked: true
    },
    {
        id: 'tdm',
        title: 'КОМАНДНЫЙ БОЙ',
        description: 'Битва на истощение. 15 минут. Быстрый респаун.',
        players: '2-10 ИГРОКОВ',
        locked: true
    },
    {
        id: 'training',
        title: 'ТРЕНИРОВКА',
        description: 'Полигон. Отработка стрельбы по манекенам и изучение мувмента.',
        players: '1 ИГРОК',
        locked: false
    }
];

export const MainMenu: React.FC<MainMenuProps> = ({ onPlay }) => {
    const [view, setView] = useState<'main' | 'settings' | 'gamemodes'>('main');
    const [hitboxes, setHitboxes] = useState(() => window.GAME_SETTINGS.showHitboxes);

    const toggleHitboxes = () => {
        const newVal = !hitboxes;
        setHitboxes(newVal);
        window.GAME_SETTINGS.showHitboxes = newVal;
        window.dispatchEvent(new Event('SETTINGS_CHANGED'));
    };

    const handleModeSelect = (mode: GameModeDef) => {
        if (mode.locked) return;
        // В будущем здесь мы будем передавать ID режима в App.tsx
        // Пока что просто запускаем текущую игру (Тренировка)
        onPlay();
    };

    const renderMainScreen = () => (
        <div className="flex flex-col items-center gap-6 animate-fade-in-up">
            <h1 className="text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(132,204,22,0.5)]">
                BOX WALKER 3D
            </h1>
            
            <button 
                onClick={() => setView('gamemodes')}
                className="w-64 py-4 text-xl font-bold border-2 border-lime-500 text-lime-400 hover:bg-lime-500 hover:text-black transition-all duration-200 uppercase tracking-widest shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:shadow-[0_0_25px_rgba(132,204,22,0.6)]"
            >
                PLAY
            </button>
            
            <button 
                onClick={() => setView('settings')}
                className="w-64 py-3 text-lg font-bold border-2 border-gray-600 text-gray-400 hover:border-white hover:text-white transition-all duration-200 uppercase tracking-widest"
            >
                SETTINGS
            </button>
        </div>
    );

    const renderGameModes = () => (
        <div className="flex flex-col items-center w-full max-w-5xl px-4 animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-8 text-white tracking-widest border-b-2 border-lime-500 pb-2">ВЫБОР РЕЖИМА</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {GAME_MODES.map((mode) => (
                    <div 
                        key={mode.id}
                        onClick={() => handleModeSelect(mode)}
                        className={`
                            relative flex flex-col p-4 border-2 rounded-lg transition-all duration-200 group
                            ${mode.locked 
                                ? 'border-gray-800 bg-gray-900/50 cursor-not-allowed opacity-60' 
                                : 'border-lime-500/30 bg-black hover:bg-lime-900/10 hover:border-lime-400 cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(132,204,22,0.2)]'
                            }
                        `}
                    >
                        {mode.locked && (
                            <div className="absolute top-2 right-2 text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        )}
                        
                        <div className={`text-xs font-bold mb-2 ${mode.locked ? 'text-gray-500' : 'text-cyan-400'}`}>
                            {mode.players}
                        </div>
                        
                        <h3 className={`text-xl font-black mb-2 leading-tight ${mode.locked ? 'text-gray-400' : 'text-white group-hover:text-lime-400'}`}>
                            {mode.title}
                        </h3>
                        
                        <p className="text-xs text-gray-400 leading-relaxed">
                            {mode.description}
                        </p>

                        {!mode.locked && (
                            <div className="mt-4 pt-4 border-t border-gray-800 text-lime-400 text-xs font-bold uppercase tracking-widest text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                ЗАПУСК &gt;&gt;
                            </div>
                        )}
                         {mode.locked && (
                            <div className="mt-auto pt-4 text-gray-600 text-xs font-bold uppercase tracking-widest text-center">
                                ЗАБЛОКИРОВАНО
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <button 
                onClick={() => setView('main')}
                className="mt-10 px-8 py-2 border border-white/20 hover:bg-white/10 text-white transition-all uppercase text-sm"
            >
                НАЗАД
            </button>
        </div>
    );

    const renderSettings = () => (
        <div className="flex flex-col items-center gap-6 w-96 p-8 border border-gray-800 bg-black rounded-lg">
            <h2 className="text-3xl font-bold mb-4 text-gray-200">SETTINGS</h2>
            
            <div className="flex items-center justify-between w-full p-4 border border-gray-700 rounded hover:border-lime-500/50 transition-colors">
                <span className="text-lg">Show Hitboxes</span>
                <div 
                    onClick={toggleHitboxes}
                    className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${hitboxes ? 'bg-lime-500' : 'bg-gray-700'}`}
                >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${hitboxes ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
            </div>

            <button 
                onClick={() => setView('main')}
                className="mt-8 w-full py-3 border border-white/20 hover:bg-white/10 text-white transition-all uppercase"
            >
                BACK
            </button>
        </div>
    );

    return (
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center z-50 bg-black/95 text-white font-mono bg-[url('https://raw.githubusercontent.com/goida228top/textures/main/grid_bg.png')] bg-cover bg-center">
            {/* Dark overlay for better text readability over potential bg image */}
            <div className="absolute inset-0 bg-black/80 pointer-events-none"></div>
            
            <div className="z-10 w-full flex justify-center">
                {view === 'main' && renderMainScreen()}
                {view === 'gamemodes' && renderGameModes()}
                {view === 'settings' && renderSettings()}
            </div>
            
            <div className="absolute bottom-4 text-gray-600 text-xs z-10">
                v1.1.0-alpha
            </div>
        </div>
    );
};
