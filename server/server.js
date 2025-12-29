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
// players[socket.id] = { ...data, roomId: 'room1' }
let players = {}; 

// rooms['room1'] = { id: 'room1', name: 'NickRoom', players: {socketId: p}, status: 'waiting' }
let rooms = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initial connection doesn't do much until they create/join a room
    // But we capture their query params
    const { nickname, avatarColor } = socket.handshake.query;

    players[socket.id] = {
        id: socket.id,
        nickname: nickname || `Player ${socket.id.substr(0,4)}`,
        avatarColor: avatarColor || '#fff',
        roomId: null,
        team: null, // 'T' or 'CT'
        isHost: false,
        isDead: false,
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        rotation: { y: 0 },
        weapon: 'pistol'
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
        const roomId = `room-${socket.id}`; // Simple ID
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
            
            // Notify room of update
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

    // --- GAME LOGIC (Scoped to Rooms) ---
    // Previously we broadcasted to everyone. Now we use io.to(roomId)

    socket.on('update', (data) => {
        const p = players[socket.id];
        if (p && p.roomId) {
            p.position = data.pos;
            p.rotation = data.rot;
            p.weapon = data.weapon;
            
            socket.to(p.roomId).volatile.emit('player_moved', {
                id: socket.id,
                pos: data.pos,
                rot: data.rot,
                weapon: data.weapon
            });
        }
    });

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

    socket.on('hit', (data) => {
        const p = players[socket.id];
        if (!p || !p.roomId) return;
        
        const targetId = data.targetId;
        const target = players[targetId];

        // Ensure target is in same room
        if (target && target.roomId === p.roomId) {
            target.health -= data.damage;
            io.to(p.roomId).emit('player_damaged', { id: targetId, health: target.health });

            if (target.health <= 0 && !target.isDead) {
                target.isDead = true;
                target.deaths = (target.deaths || 0) + 1;
                io.to(p.roomId).emit('player_died', { 
                    victimId: targetId, 
                    killerId: socket.id 
                });
            }
        }
    });

    socket.on('disconnect', () => {
        const p = players[socket.id];
        if (p && p.roomId && rooms[p.roomId]) {
            // Remove from room
            delete rooms[p.roomId].players[socket.id];
            io.to(p.roomId).emit('player_left', { id: socket.id });
            io.to(p.roomId).emit('room_updated', rooms[p.roomId]);

            // If room empty, delete room
            if (Object.keys(rooms[p.roomId].players).length === 0) {
                delete rooms[p.roomId];
            } else if (p.isHost) {
                // Transfer host? (Simple version: no transfer, just first remaining player becomes host or chaos)
                // Let's keep it simple: Host leaves -> Room stays, no host functionality.
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
    // Auto assign team if not set, or let them pick in lobby
    p.team = null; 

    // Add to room data
    room.players[socket.id] = p;

    // Socket join room channel
    socket.join(roomId);

    // Notify client they joined
    socket.emit('room_joined', room);

    // Notify others in room
    socket.to(roomId).emit('room_updated', room);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 CS:GO Lobby Server running on port ${PORT}`);
});