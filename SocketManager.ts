import { io, Socket } from 'socket.io-client';
import { PlayerProfile } from './types';

// URL твоего сервера
const SERVER_URL = 'https://cs-go-3mje.onrender.com';

class SocketManager {
    public socket: Socket | null = null;
    public otherPlayers: any = {};

    connect(profile: PlayerProfile) {
        if (this.socket) return;

        console.log("🔌 Connecting to server:", SERVER_URL);

        this.socket = io(SERVER_URL, {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log("✅ Connected! ID:", this.socket?.id);
            // Join the game immediately upon connection
            this.socket?.emit('join', {
                nickname: profile.nickname,
                avatarColor: profile.avatarColor,
                team: profile.team
            });
        });

        this.socket.on('disconnect', () => {
            console.log("❌ Disconnected from server");
        });
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