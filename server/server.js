const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- DATA STORE ---
let players = {}; 
let rooms = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    const { nickname, avatarColor } = socket.handshake.query;

    players[socket.id] = {
        id: socket.id,
        nickname: nickname || `Player ${socket.id.substr(0,4)}`,
        avatarColor: avatarColor || '#fff',
        roomId: null,
        team: null,
        isHost: false,
        isDead: false,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        weapon: 'pistol',
        animState: { isCrouching: false, isMoving: false } 
    };

    // --- LOBBY LOGIC ---

    socket.on('get_rooms', () => {
        const roomList = Object.values(rooms).map(r => ({
            id: r.id,
            name: r.name,
            map: r.map,
            players: Object.keys(r.players).length,
            maxPlayers: 10,
            status: r.status
        }));
        socket.emit('rooms_list', roomList);
    });

    socket.on('create_room', (data) => {
        const roomId = `room-${socket.id}`;
        const roomName = `${players[socket.id].nickname}'s Server`;
        
        rooms[roomId] = {
            id: roomId,
            name: roomName,
            map: data.map || 'de_dust2',
            players: {},
            status: 'waiting'
        };

        joinRoomLogic(socket, roomId, true);
    });

    socket.on('join_room', ({ roomId }) => {
        if (rooms[roomId]) {
            joinRoomLogic(socket, roomId, false);
        }
    });

    socket.on('switch_team', ({ team }) => {
        const p = players[socket.id];
        if (p && p.roomId && rooms[p.roomId]) {
            p.team = team;
            rooms[p.roomId].players[socket.id].team = team;
            io.to(p.roomId).emit('room_updated', rooms[p.roomId]);
        }
    });

    socket.on('start_game', () => {
        const p = players[socket.id];
        if (p && p.roomId && rooms[p.roomId]) {
            if (p.isHost) {
                rooms[p.roomId].status = 'playing';
                io.to(p.roomId).emit('game_started');
            }
        }
    });

    // --- GAME LOGIC ---

    // 1. MOVEMENT & STATE UPDATE
    socket.on('update', (data) => {
        const p = players[socket.id];
        if (p && p.roomId) {
            // Update Server State
            p.position = data.pos;
            p.rotation = data.rot;
            p.weapon = data.weapon;
            p.animState = data.animState;
            
            // Broadcast to others (Removed volatile for smoother movement on standard connections)
            socket.to(p.roomId).emit('player_moved', {
                id: socket.id,
                pos: data.pos,
                rot: data.rot,
                weapon: data.weapon,
                animState: data.animState
            });
        }
    });

    // 2. SHOOTING
    socket.on('shoot', (data) => {
        const p = players[socket.id];
        if (p && p.roomId) {
            socket.to(p.roomId).emit('player_shot', {
                id: socket.id,
                origin: data.origin,
                direction: data.direction
            });
        }
    });

    // 3. DAMAGE / HITS
    socket.on('hit', (data) => {
        const p = players[socket.id];
        if (!p || !p.roomId) return;
        
        const targetId = data.targetId;
        const target = players[targetId];

        if (target && target.roomId === p.roomId) {
            target.health -= data.damage;
            io.to(p.roomId).emit('player_damaged', { id: targetId, health: target.health });

            if (target.health <= 0 && !target.isDead) {
                target.isDead = true;
                target.deaths = (target.deaths || 0) + 1;
                
                // Broadcast death AND update internal room state so new joiners see them dead
                if (rooms[p.roomId].players[targetId]) {
                    rooms[p.roomId].players[targetId].isDead = true;
                }
                
                io.to(p.roomId).emit('player_died', { 
                    victimId: targetId, 
                    killerId: socket.id,
                    force: data.force || {x:0, y:0, z:0} // Pass force for ragdoll
                });
            }
        }
    });
    
    // 4. RESPAWN (Simple logic for now)
    socket.on('request_respawn', () => {
        const p = players[socket.id];
        if (p && p.roomId) {
            p.isDead = false;
            p.health = 100;
            if (rooms[p.roomId].players[socket.id]) {
                rooms[p.roomId].players[socket.id].isDead = false;
                rooms[p.roomId].players[socket.id].health = 100;
            }
            io.to(p.roomId).emit('player_respawned', { id: socket.id });
        }
    });

    socket.on('disconnect', () => {
        const p = players[socket.id];
        if (p && p.roomId && rooms[p.roomId]) {
            delete rooms[p.roomId].players[socket.id];
            io.to(p.roomId).emit('player_left', { id: socket.id });
            io.to(p.roomId).emit('room_updated', rooms[p.roomId]);

            if (Object.keys(rooms[p.roomId].players).length === 0) {
                delete rooms[p.roomId];
            }
        }
        delete players[socket.id];
        console.log(`Player disconnected: ${socket.id}`);
    });
});

function joinRoomLogic(socket, roomId, isHost) {
    const p = players[socket.id];
    const room = rooms[roomId];

    p.roomId = roomId;
    p.isHost = isHost;
    p.team = null; 
    p.isDead = false;
    p.health = 100;

    room.players[socket.id] = p;

    socket.join(roomId);
    socket.emit('room_joined', room);
    socket.to(roomId).emit('room_updated', room);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 CS:GO Lobby Server running on port ${PORT}`);
});