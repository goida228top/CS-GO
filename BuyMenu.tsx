
import React from 'react';

interface BuyMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

// Типы для товаров
interface ShopItem {
    id: string;
    name: string;
    price: number;
    img?: string; // В будущем можно иконки
    code: 'pistol' | 'ak47' | null; // Код для внутренней логики
    locked: boolean;
}

export const BuyMenu = ({ isOpen, onClose }: BuyMenuProps) => {
    if (!isOpen) return null;

    // Функция покупки
    const handleBuy = (item: ShopItem) => {
        if (item.locked) return;
        
        // Отправляем событие покупки, которое поймает ActivePlayer
        if (item.code) {
            window.dispatchEvent(new CustomEvent('GAME_BUY_WEAPON', { detail: item.code }));
        }
        
        // В CS2 меню обычно не закрывается сразу, но для удобства можем закрыть или оставить
        // onClose(); 
    };

    // Данные магазина (CS2 Style)
    const columns = [
        {
            title: "Equipment",
            key: 1,
            items: [
                { id: 'kevlar', name: 'Kevlar Vest', price: 650, code: null, locked: true },
                { id: 'helmet', name: 'Kevlar + Helmet', price: 1000, code: null, locked: true },
                { id: 'zeus', name: 'Zeus x27', price: 200, code: null, locked: true },
                { id: 'defuse', name: 'Defuse Kit', price: 400, code: null, locked: true },
            ] as ShopItem[]
        },
        {
            title: "Pistols",
            key: 2,
            items: [
                { id: 'glock', name: 'Glock-18', price: 200, code: null, locked: true },
                { id: 'usp', name: 'USP-S', price: 200, code: null, locked: true },
                { id: 'p250', name: 'P250', price: 300, code: null, locked: true },
                { id: 'deagle', name: 'Desert Eagle', price: 700, code: 'pistol', locked: false }, // Доступен
                { id: 'tec9', name: 'Tec-9', price: 500, code: null, locked: true },
            ] as ShopItem[]
        },
        {
            title: "Mid-Tier",
            key: 3,
            items: [
                { id: 'mac10', name: 'MAC-10', price: 1050, code: null, locked: true },
                { id: 'mp9', name: 'MP9', price: 1250, code: null, locked: true },
                { id: 'ump', name: 'UMP-45', price: 1200, code: null, locked: true },
                { id: 'p90', name: 'P90', price: 2350, code: null, locked: true },
                { id: 'xm1014', name: 'XM1014', price: 2000, code: null, locked: true },
            ] as ShopItem[]
        },
        {
            title: "Rifles",
            key: 4,
            items: [
                { id: 'famas', name: 'FAMAS', price: 2050, code: null, locked: true },
                { id: 'galil', name: 'Galil AR', price: 1800, code: null, locked: true },
                { id: 'm4a1', name: 'M4A1-S', price: 2900, code: null, locked: true },
                { id: 'ak47', name: 'AK-47', price: 2700, code: 'ak47', locked: false }, // Доступен
                { id: 'awp', name: 'AWP', price: 4750, code: null, locked: true },
            ] as ShopItem[]
        },
        {
            title: "Grenades",
            key: 5,
            items: [
                { id: 'flash', name: 'Flashbang', price: 200, code: null, locked: true },
                { id: 'smoke', name: 'Smoke Grenade', price: 300, code: null, locked: true },
                { id: 'he', name: 'High Explosive', price: 300, code: null, locked: true },
                { id: 'molotov', name: 'Molotov', price: 400, code: null, locked: true },
                { id: 'decoy', name: 'Decoy', price: 50, code: null, locked: true },
            ] as ShopItem[]
        }
    ];

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-sans select-none">
            <div className="relative w-[90%] max-w-6xl h-[80%] flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-white text-xl font-bold uppercase tracking-wider">
                        Buy Time Remaining <span className="text-red-500">45:00</span>
                    </div>
                    <div className="text-green-400 text-2xl font-bold font-mono">
                        $ 16000
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 grid grid-cols-5 gap-2">
                    {columns.map((col, idx) => (
                        <div key={col.key} className="flex flex-col bg-[#1c1c1c]/90 rounded-sm overflow-hidden border border-white/5">
                            {/* Column Header */}
                            <div className="bg-[#2a2a2a] text-gray-400 p-2 text-sm font-bold uppercase flex justify-between">
                                <span>{idx + 1}</span>
                                <span>{col.title}</span>
                            </div>
                            
                            {/* Items List */}
                            <div className="flex-1 p-1 flex flex-col gap-1">
                                {col.items.map((item, itemIdx) => (
                                    <div 
                                        key={item.id}
                                        onClick={() => handleBuy(item)}
                                        className={`
                                            relative h-16 border rounded-sm p-2 flex flex-col justify-between transition-all group
                                            ${item.locked 
                                                ? 'border-transparent bg-white/5 cursor-not-allowed opacity-50 grayscale' 
                                                : 'border-transparent bg-[#333] hover:bg-[#444] hover:border-white/50 cursor-pointer active:bg-[#555]'
                                            }
                                            ${item.code ? 'border-l-4 border-l-green-500' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] text-gray-500 font-mono">{idx+1}{itemIdx+1}</span>
                                            <span className={`text-sm font-bold ${item.locked ? 'text-gray-500' : 'text-white group-hover:text-green-400'}`}>
                                                {item.name}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-end">
                                             <span className={`text-xs ${item.locked ? 'text-gray-600' : 'text-green-500 font-bold'}`}>
                                                ${item.price}
                                             </span>
                                        </div>
                                        
                                        {/* Icon Placeholder (Silhouette) */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                                             {/* Здесь могла бы быть картинка SVG оружия */}
                                             <span className="text-4xl">🔫</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Tip */}
                <div className="mt-4 text-center text-gray-500 text-sm">
                    Press <span className="text-white font-bold">[B]</span> or <span className="text-white font-bold">[ESC]</span> to close
                </div>
            </div>
        </div>
    );
};
