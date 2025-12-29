import { io, Socket } from 'socket.io-client';
import { PlayerProfile, GameRoom } from './types';

// URL твоего сервера
const SERVER_URL = 'https://cs-go-3mje.onrender.com';

class SocketManager {
    public socket: Socket | null = null;
    public otherPlayers: any = {};
    public currentRoom: any = null; // Cache room state
    
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
             this.currentRoom = roomState;
             this.syncPlayersFromRoom(roomState);
             if (this.onRoomJoined) this.onRoomJoined(roomState);
        });
        
        this.socket.on('room_updated', (roomState) => {
             this.currentRoom = roomState;
             this.syncPlayersFromRoom(roomState);
             if (this.onRoomJoined) this.onRoomJoined(roomState); // Re-use this callback for updates in lobby
        });

        this.socket.on('game_started', () => {
             if (this.onGameStart) this.onGameStart();
        });

        // --- GAMEPLAY EVENTS ---
        this.socket.on('player_moved', (data) => {
             if (this.otherPlayers[data.id]) {
                 this.otherPlayers[data.id].position = data.pos;
                 this.otherPlayers[data.id].rotation = data.rot;
                 this.otherPlayers[data.id].weapon = data.weapon;
                 // Sync animation states
                 this.otherPlayers[data.id].animState = data.animState;
             } else {
                 // If we somehow missed this player, add stub
                 this.otherPlayers[data.id] = {
                     id: data.id,
                     position: data.pos,
                     rotation: data.rot,
                     weapon: data.weapon,
                     animState: data.animState || { isCrouching: false, isMoving: false }
                 };
             }
        });

        this.socket.on('disconnect', () => {
            console.log("❌ Disconnected from server");
        });
    }

    // Helper to populate otherPlayers from the Room object so World.tsx has data immediately
    private syncPlayersFromRoom(roomState: any) {
        if (!roomState || !roomState.players) return;
        
        Object.values(roomState.players).forEach((p: any) => {
            if (this.socket && p.id !== this.socket.id) {
                this.otherPlayers[p.id] = {
                    ...p, // Copy name, color, team
                    // Ensure position exists if server sends it
                    position: p.position || { x: 0, y: 0, z: 0 },
                    rotation: p.rotation || { y: 0 },
                    weapon: p.weapon || 'pistol',
                    animState: p.animState || { isCrouching: false, isMoving: false }
                };
            }
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
    updatePosition(
        pos: {x: number, y: number, z: number}, 
        rot: number, 
        weapon: string,
        animState: { isCrouching: boolean, isMoving: boolean }
    ) {
        if (!this.socket) return;
        this.socket.emit('update', {
            pos,
            rot: { y: rot },
            weapon,
            animState
        });
    }
}

export const socketManager = new SocketManager();