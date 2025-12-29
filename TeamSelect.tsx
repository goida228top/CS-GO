import React, { useState, useEffect } from 'react';
import { PlayerProfile, Team } from './types';
import { socketManager } from './SocketManager';

interface TeamSelectProps {
    userProfile: PlayerProfile;
    onSelectTeam: (team: Team) => void; // Triggered when game starts
}

interface LobbyPlayer {
    id: string;
    nickname: string;
    avatarColor: string;
    team: Team;
    isHost: boolean;
}

export const TeamSelect: React.FC<TeamSelectProps> = ({ userProfile, onSelectTeam }) => {
    const [players, setPlayers] = useState<LobbyPlayer[]>([]);
    
    // Determine if I am the host
    const myId = socketManager.socket?.id;
    const isHost = players.find(p => p.id === myId)?.isHost || false;

    useEffect(() => {
        // Listen for room state updates
        socketManager.onRoomJoined = (roomState) => {
            if (roomState.players) {
                // Convert object to array
                const playerList = Object.values(roomState.players) as LobbyPlayer[];
                setPlayers(playerList);
            }
        };

        socketManager.onGameStart = () => {
             // Game started by host
             // Find my team
             const me = players.find(p => p.id === socketManager.socket?.id); // Refresh players from state? No, relies on server message usually
             // But for safety, we just pass the last known team or the server sends it.
             // Simplified: Just callback to App to start rendering World
             
             // We need to pass the team I selected.
             // We'll trust the server state or local state.
             const myTeam = players.find(p => p.id === socketManager.socket?.id)?.team || 'CT';
             onSelectTeam(myTeam);
        };
        
        // Also listen for player updates (joins/team switches) while in lobby
        const socket = socketManager.socket;
        if(socket) {
            socket.on('room_updated', (roomState) => {
                const playerList = Object.values(roomState.players) as LobbyPlayer[];
                setPlayers(playerList);
            });
        }

        return () => {
            if(socket) socket.off('room_updated');
            socketManager.onGameStart = null;
        };
    }, []);

    const handleJoinTeam = (team: Team) => {
        socketManager.switchTeam(team);
    };

    const handleStartGame = () => {
        socketManager.startGame();
    };

    const tPlayers = players.filter(p => p.team === 'T');
    const ctPlayers = players.filter(p => p.team === 'CT');

    const PlayerSlot: React.FC<{ player: LobbyPlayer }> = ({ player }) => (
        <div className="flex items-center gap-3 bg-black/40 p-2 rounded mb-2 border border-white/5 animate-fade-in-up">
            <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: player.avatarColor }}></div>
            <div className="flex flex-col">
                <span className={`font-bold text-sm ${player.id === myId ? 'text-yellow-400' : 'text-white'}`}>
                    {player.nickname} {player.id === myId && '(YOU)'}
                </span>
                {player.isHost && <span className="text-[10px] text-lime-500 font-mono tracking-wider">HOST</span>}
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 z-50 bg-black/90 font-sans select-none flex flex-col">
             <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-black to-transparent pointer-events-none z-10"></div>

            {/* HEADER */}
            <div className="text-center py-6 border-b border-white/10 relative z-20">
                 <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                     LOBBY
                 </h2>
                 <p className="text-gray-500 text-xs mt-1">WAITING FOR PLAYERS...</p>
            </div>
            
            <div className="flex-1 flex w-full relative">
                
                {/* VS BADGE */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                    VS
                </div>

                {/* TERRORISTS SIDE */}
                <div className="flex-1 flex flex-col relative border-r border-white/10 bg-gradient-to-br from-orange-900/20 to-black">
                    <div className="p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-4xl font-black text-orange-500 uppercase drop-shadow-md">Terrorists</h3>
                            <div className="text-6xl opacity-20">👺</div>
                        </div>
                        
                        {/* Player List */}
                        <div className="flex-1 overflow-y-auto">
                            {tPlayers.map(p => <PlayerSlot key={p.id} player={p} />)}
                            {tPlayers.length === 0 && <div className="text-white/20 text-sm italic">Slot Empty</div>}
                        </div>

                        {/* Join Button */}
                        <button 
                            onClick={() => handleJoinTeam('T')}
                            disabled={tPlayers.find(p => p.id === myId) !== undefined}
                            className="mt-4 w-full py-4 border-2 border-orange-600/50 text-orange-500 hover:bg-orange-600 hover:text-white transition-all uppercase font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            JOIN T SIDE
                        </button>
                    </div>
                </div>

                {/* CT SIDE */}
                <div className="flex-1 flex flex-col relative border-l border-white/10 bg-gradient-to-bl from-cyan-900/20 to-black">
                    <div className="p-8 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-4xl font-black text-cyan-500 uppercase drop-shadow-md">Counter-Terrorists</h3>
                            <div className="text-6xl opacity-20">👮‍♂️</div>
                        </div>

                        {/* Player List */}
                        <div className="flex-1 overflow-y-auto">
                            {ctPlayers.map(p => <PlayerSlot key={p.id} player={p} />)}
                            {ctPlayers.length === 0 && <div className="text-white/20 text-sm italic">Slot Empty</div>}
                        </div>

                         {/* Join Button */}
                         <button 
                            onClick={() => handleJoinTeam('CT')}
                            disabled={ctPlayers.find(p => p.id === myId) !== undefined}
                            className="mt-4 w-full py-4 border-2 border-cyan-600/50 text-cyan-500 hover:bg-cyan-600 hover:text-white transition-all uppercase font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            JOIN CT SIDE
                        </button>
                    </div>
                </div>
            </div>

            {/* HOST CONTROLS */}
            {isHost && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40">
                    <button 
                        onClick={handleStartGame}
                        className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white font-black text-xl uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(22,163,74,0.6)] hover:shadow-[0_0_50px_rgba(22,163,74,1)] hover:scale-105 transition-all"
                    >
                        START MATCH
                    </button>
                </div>
            )}
            
            {!isHost && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 text-gray-500 font-mono text-sm bg-black/80 px-4 py-2 rounded">
                    WAITING FOR HOST TO START...
                </div>
            )}
        </div>
    );
};