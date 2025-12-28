const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from anywhere (for now)
        methods: ["GET", "POST"]
    }
});

// Game State
let players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // 1. Join Game
    socket.on('join', (data) => {
        // data: { nickname, avatarColor, team }
        players[socket.id] = {
            id: socket.id,
            nickname: data.nickname || `Player ${socket.id.substr(0,4)}`,
            avatarColor: data.avatarColor || '#fff',
            team: data.team || 'CT',
            position: { x: 0, y: 0, z: 0 },
            rotation: { y: 0, headX: 0 },
            health: 100,
            weapon: 'pistol',
            isDead: false
        };

        // Broadcast new player to everyone EXCEPT sender
        socket.broadcast.emit('player_joined', players[socket.id]);
        
        // Send current list of existing players to the NEW player
        socket.emit('current_players', players);
    });

    // 2. Movement Update (High Frequency)
    socket.on('update', (data) => {
        // No Anti-Cheat: We blindly trust the client
        if (players[socket.id]) {
            players[socket.id].position = data.pos;
            players[socket.id].rotation = data.rot;
            players[socket.id].weapon = data.weapon;
            
            // Broadcast movement (volatile = drops if network is busy, good for movement)
            socket.broadcast.volatile.emit('player_moved', {
                id: socket.id,
                pos: data.pos,
                rot: data.rot,
                weapon: data.weapon
            });
        }
    });

    // 3. Actions
    socket.on('shoot', (data) => {
        socket.broadcast.emit('player_shot', {
            id: socket.id,
            origin: data.origin,
            direction: data.direction
        });
    });

    socket.on('reload', () => {
        socket.broadcast.emit('player_reloaded', { id: socket.id });
    });

    // 4. Damage / Death
    socket.on('hit', (data) => {
        // targetId, damage
        const target = players[data.targetId];
        if (target) {
            target.health -= data.damage;
            io.emit('player_damaged', { id: data.targetId, health: target.health });
            
            if (target.health <= 0 && !target.isDead) {
                target.isDead = true;
                target.deaths = (target.deaths || 0) + 1;
                io.emit('player_died', { 
                    victimId: data.targetId, 
                    killerId: socket.id 
                });
            }
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('player_left', { id: socket.id });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 CS:GO Server running on port ${PORT}`);
});