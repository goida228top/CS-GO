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
             if (this.onRoomJoined) this.onRoomJoined(roomState); 
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
                 this.otherPlayers[data.id].animState = data.animState;
             } else {
                 this.otherPlayers[data.id] = {
                     id: data.id,
                     position: data.pos,
                     rotation: data.rot,
                     weapon: data.weapon,
                     animState: data.animState || { isCrouching: false, isMoving: false },
                     shootTrigger: 0,
                     isDead: false
                 };
             }
        });

        this.socket.on('player_shot', (data) => {
            if (this.otherPlayers[data.id]) {
                const current = this.otherPlayers[data.id].shootTrigger || 0;
                this.otherPlayers[data.id].shootTrigger = current + 1;
            }
            
            const event = new CustomEvent('FIRE_BULLET', { 
                detail: { 
                    position: data.origin, 
                    velocity: { x: data.direction.x * 150, y: data.direction.y * 150, z: data.direction.z * 150 } // approx speed
                } 
            });
            window.dispatchEvent(event);
        });

        // Update Death State
        this.socket.on('player_died', (data) => {
            const { victimId, force } = data;
            if (this.otherPlayers[victimId]) {
                this.otherPlayers[victimId].isDead = true;
                this.otherPlayers[victimId].deathForce = force;
            }
        });

        this.socket.on('player_respawned', (data) => {
             if (this.otherPlayers[data.id]) {
                 this.otherPlayers[data.id].isDead = false;
             }
        });

        this.socket.on('disconnect', () => {
            console.log("❌ Disconnected from server");
        });
    }

    private syncPlayersFromRoom(roomState: any) {
        if (!roomState || !roomState.players) return;
        
        Object.values(roomState.players).forEach((p: any) => {
            if (this.socket && p.id !== this.socket.id) {
                const existing = this.otherPlayers[p.id] || {};
                this.otherPlayers[p.id] = {
                    ...existing,
                    ...p, 
                    position: p.position || { x: 0, y: 0, z: 0 },
                    rotation: p.rotation || { y: 0 },
                    weapon: p.weapon || 'pistol',
                    animState: p.animState || { isCrouching: false, isMoving: false },
                    shootTrigger: existing.shootTrigger || 0,
                    isDead: p.isDead || false
                };
            }
        });
    }

    // --- ACTIONS ---
    
    getRooms() { this.socket?.emit('get_rooms'); }
    createRoom(mapName: string) { this.socket?.emit('create_room', { map: mapName }); }
    joinRoom(roomId: string) { this.socket?.emit('join_room', { roomId }); }
    switchTeam(team: string) { this.socket?.emit('switch_team', { team }); }
    startGame() { this.socket?.emit('start_game'); }
    disconnect() { if (this.socket) { this.socket.disconnect(); this.socket = null; } }

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