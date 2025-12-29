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

// --- CONSTANTS ---
const WARMUP_TIME = 20;
const FREEZE_TIME = 15;
const ROUND_TIME = 600; // 10 minutes
const END_TIME = 5;

// --- DATA STORE ---
let players = {}; 
let rooms = {};

// --- GAME LOOP ---
setInterval(() => {
    Object.values(rooms).forEach(room => {
        if (room.status === 'playing') {
            gameLoop(room);
        }
    });
}, 1000);

function gameLoop(room) {
    if (!room.gameState) return;

    room.gameState.timer--;

    // Check Win Condition (Team Elimination) ONLY during 'live'
    if (room.gameState.status === 'live') {
        const aliveT = Object.values(room.players).filter(p => p.team === 'T' && !p.isDead).length;
        const aliveCT = Object.values(room.players).filter(p => p.team === 'CT' && !p.isDead).length;
        const totalT = Object.values(room.players).filter(p => p.team === 'T').length;
        const totalCT = Object.values(room.players).filter(p => p.team === 'CT').length;

        // If a team exists but has 0 alive players -> Lose
        if (totalT > 0 && aliveT === 0) {
            endRound(room, 'CT');
            return;
        }
        if (totalCT > 0 && aliveCT === 0) {
            endRound(room, 'T');
            return;
        }
    }

    // Timer Expiration Logic
    if (room.gameState.timer <= 0) {
        switch (room.gameState.status) {
            case 'warmup':
                startFreezeTime(room);
                break;
            case 'freeze':
                startLiveRound(room);
                break;
            case 'live':
                // Time ran out -> CT wins by default (defuse map logic)
                endRound(room, 'CT'); 
                break;
            case 'end':
                startFreezeTime(room); // Next round
                break;
        }
    }

    // Broadcast state update (optimized to sending minimal data)
    io.to(room.id).emit('game_state_update', room.gameState);
}

function startWarmup(room) {
    room.gameState.status = 'warmup';
    room.gameState.timer = WARMUP_TIME;
    io.to(room.id).emit('announcement', "РАЗМИНКА: 20 СЕКУНД");
}

function startFreezeTime(room) {
    room.gameState.status = 'freeze';
    room.gameState.timer = FREEZE_TIME;
    room.gameState.round++;
    
    // Respawn everyone
    Object.values(room.players).forEach(p => {
        p.isDead = false;
        p.health = 100;
    });

    io.to(room.id).emit('respawn_all'); // Client triggers position reset
    io.to(room.id).emit('announcement', `РАУНД ${room.gameState.round} - ПОДГОТОВКА`);
}

function startLiveRound(room) {
    room.gameState.status = 'live';
    room.gameState.timer = ROUND_TIME;
    io.to(room.id).emit('announcement', "БОЙ НАЧАЛСЯ!");
}

function endRound(room, winnerTeam) {
    room.gameState.status = 'end';
    room.gameState.timer = END_TIME;
    room.gameState.winner = winnerTeam;
    
    if (winnerTeam === 'T') room.gameState.scoreT++;
    else if (winnerTeam === 'CT') room.gameState.scoreCT++;

    const winnerName = winnerTeam === 'T' ? "ТЕРРОРИСТЫ" : "СПЕЦНАЗ";
    io.to(room.id).emit('announcement', `${winnerName} ПОБЕДИЛИ В РАУНДЕ!`);
}

// --- SOCKETS ---

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

    socket.on('get_rooms', () => {
        const roomList = Object.values(rooms).map(r => ({
            id: r.id,
            name: r.name,
            map: r.map,
            players: Object.keys(r.players).length,
            maxPlayers: 10,
            status: r.status,
            gameState: r.gameState
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
            status: 'waiting',
            gameState: {
                status: 'waiting',
                timer: 0,
                round: 0,
                scoreT: 0,
                scoreCT: 0,
                winner: null
            }
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
                startWarmup(rooms[p.roomId]); // Start Warmup
                io.to(p.roomId).emit('game_started');
            }
        }
    });

    // --- GAME LOGIC ---

    socket.on('update', (data) => {
        const p = players[socket.id];
        if (p && p.roomId) {
            p.position = data.pos;
            p.rotation = data.rot;
            p.weapon = data.weapon;
            p.animState = data.animState;
            
            socket.to(p.roomId).emit('player_moved', {
                id: socket.id,
                pos: data.pos,
                rot: data.rot,
                weapon: data.weapon,
                animState: data.animState
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
        const room = rooms[p.roomId];

        // Only allow damage if game is live or warmup (not freeze or end)
        const canDamage = room.gameState.status === 'live' || room.gameState.status === 'warmup';

        if (target && target.roomId === p.roomId && canDamage && !target.isDead) {
            target.health -= data.damage;
            io.to(p.roomId).emit('player_damaged', { id: targetId, health: target.health });

            if (target.health <= 0) {
                target.isDead = true;
                target.deaths = (target.deaths || 0) + 1;
                
                if (room.players[targetId]) room.players[targetId].isDead = true;
                
                io.to(p.roomId).emit('player_died', { 
                    victimId: targetId, 
                    killerId: socket.id,
                    force: data.force || {x:0, y:0, z:0}
                });
            }
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