import { io, Socket } from 'socket.io-client';
import { PlayerProfile, GameRoom } from './types';

// URL твоего сервера
const SERVER_URL = 'https://cs-go-3mje.onrender.com';

class SocketManager {
    public socket: Socket | null = null;
    public otherPlayers: any = {};
    
    // Callbacks for UI
    public onRoomListUpdate: ((rooms: GameRoom[]) => void) | null = null;
    public onRoomJoined: ((roomState: any) => void) | null = null;
    public onGameStart: (() => void) | null = null;

    connect(profile: PlayerProfile) {
        if (this.socket && this.socket.connected) return;

        console.log("🔌 Connecting to server:", SERVER_URL);

        this.socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            query: {
                nickname: profile.nickname,
                avatarColor: profile.avatarColor
            }
        });

        this.socket.on('connect', () => {
            console.log("✅ Connected! ID:", this.socket?.id);
        });

        // --- ROOM EVENTS ---
        this.socket.on('rooms_list', (rooms: GameRoom[]) => {
            if (this.onRoomListUpdate) this.onRoomListUpdate(rooms);
        });

        this.socket.on('room_joined', (roomState) => {
             console.log("Joined room:", roomState);
             if (this.onRoomJoined) this.onRoomJoined(roomState);
        });

        this.socket.on('game_started', () => {
             if (this.onGameStart) this.onGameStart();
        });

        // --- GAMEPLAY EVENTS ---
        // (These are handled in World.tsx mostly, but we keep basic listeners here)
        this.socket.on('disconnect', () => {
            console.log("❌ Disconnected from server");
        });
    }

    // --- LOBBY ACTIONS ---
    
    getRooms() {
        this.socket?.emit('get_rooms');
    }

    createRoom(mapName: string) {
        this.socket?.emit('create_room', { map: mapName });
    }

    joinRoom(roomId: string) {
        this.socket?.emit('join_room', { roomId });
    }

    switchTeam(team: string) {
        this.socket?.emit('switch_team', { team });
    }

    startGame() {
        this.socket?.emit('start_game');
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Отправка позиции (вызываем в useFrame)
    updatePosition(pos: {x: number, y: number, z: number}, rot: number, weapon: string) {
        if (!this.socket) return;
        this.socket.emit('update', {
            pos,
            rot: { y: rot },
            weapon
        });
    }
}

export const socketManager = new SocketManager();