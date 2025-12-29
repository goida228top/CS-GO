import React, { useEffect, useState } from 'react';
import { socketManager } from './SocketManager';
import { GameRoom, PlayerProfile } from './types';

interface ServerBrowserProps {
    userProfile: PlayerProfile;
    onBack: () => void;
    onRoomJoined: () => void; // Callback when successfully joined a lobby
}

export const ServerBrowser: React.FC<ServerBrowserProps> = ({ userProfile, onBack, onRoomJoined }) => {
    const [rooms, setRooms] = useState<GameRoom[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Connect socket if not connected
        socketManager.connect(userProfile);

        // Subscribe to room updates
        socketManager.onRoomListUpdate = (updatedRooms) => {
            setRooms(updatedRooms);
            setIsLoading(false);
        };

        // Subscribe to successful join
        socketManager.onRoomJoined = () => {
            onRoomJoined();
        };

        // Fetch initial list
        socketManager.getRooms();
        setIsLoading(true);

        // Poll every 3 seconds for updates
        const interval = setInterval(() => {
             socketManager.getRooms();
        }, 3000);

        return () => {
            clearInterval(interval);
            socketManager.onRoomListUpdate = null;
        };
    }, []);

    const handleCreate = () => {
        // Map name is technically implied by the creator's name logic requested
        socketManager.createRoom('de_dust2');
    };

    const handleJoin = (roomId: string) => {
        socketManager.joinRoom(roomId);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/95 font-sans text-white flex flex-col items-center pt-20 bg-[url('https://raw.githubusercontent.com/goida228top/textures/main/grid_bg.png')] bg-cover">
            <div className="w-full max-w-4xl p-6 bg-black/80 border border-gray-800 rounded-lg shadow-2xl backdrop-blur-md">
                
                <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <div>
                        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
                            SERVER BROWSER
                        </h2>
                        <p className="text-gray-500 text-sm font-mono mt-1">
                            ONLINE: <span className="text-green-500">{rooms.reduce((acc, r) => acc + r.players, 0)} PLAYERS</span>
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleCreate}
                        className="px-6 py-3 bg-gradient-to-r from-lime-600 to-lime-500 hover:from-lime-500 hover:to-lime-400 text-black font-black uppercase tracking-widest rounded shadow-[0_0_15px_rgba(132,204,22,0.4)] transition-all transform hover:scale-105"
                    >
                        + Create Lobby
                    </button>
                </div>

                {/* SERVER LIST */}
                <div className="min-h-[400px] border border-gray-800 rounded bg-[#111]">
                    <div className="grid grid-cols-12 bg-[#222] p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-1 text-center">ID</div>
                        <div className="col-span-6">SERVER NAME (HOST)</div>
                        <div className="col-span-3 text-center">MAP</div>
                        <div className="col-span-2 text-center">PLAYERS</div>
                    </div>

                    {isLoading && rooms.length === 0 ? (
                         <div className="p-10 text-center text-gray-500 animate-pulse">Searching for signals...</div>
                    ) : rooms.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            No servers found. Create one!
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[400px]">
                            {rooms.map((room, idx) => (
                                <div 
                                    key={room.id}
                                    className={`
                                        grid grid-cols-12 p-4 border-b border-gray-800 items-center transition-colors
                                        ${room.status === 'playing' ? 'opacity-50 grayscale' : 'hover:bg-white/5 cursor-pointer'}
                                    `}
                                    onClick={() => room.status !== 'playing' && handleJoin(room.id)}
                                >
                                    <div className="col-span-1 text-center font-mono text-gray-600">#{idx + 1}</div>
                                    <div className="col-span-6 font-bold text-white flex items-center gap-2">
                                        {room.status === 'playing' && <span className="text-[10px] bg-red-600 px-1 rounded">LIVE</span>}
                                        {room.name}
                                    </div>
                                    <div className="col-span-3 text-center text-gray-400 text-sm">{room.map}</div>
                                    <div className="col-span-2 text-center font-mono text-cyan-400">
                                        {room.players}/{room.maxPlayers}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-between items-center">
                    <button 
                        onClick={onBack}
                        className="px-6 py-2 border border-gray-600 text-gray-400 hover:text-white hover:border-white transition-all uppercase text-sm font-bold"
                    >
                        &lt; Back to Menu
                    </button>
                    <div className="text-xs text-gray-600 font-mono">
                        REGION: EUROPE (EU-WEST)
                    </div>
                </div>

            </div>
        </div>
    );
};