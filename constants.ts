
// constants.ts
import { Vector3 } from 'three';

// Player Settings
export const RUN_SPEED = 9.0; 
export const WALK_SPEED = 3.5; 
export const FLY_SPEED = 15;
export const SUPER_SPEED = 60;

// Physics constants
export const STOP_SPEED = 2.0; 
export const FRICTION = 14.0;   
export const ACCELERATION = 12.0; 
export const AIR_ACCELERATE = 100.0; 
export const AIR_MAX_SPEED = 1.0; 

export const JUMP_FORCE = 8.0; 
export const GRAVITY = 30; 

// --- CAMERA SETTINGS ---
export const CAMERA_DISTANCE = 0.0; 
export const CAMERA_RIGHT_OFFSET = 0.0; 
export const HEAD_YAW_LIMIT = Math.PI / 2.5; 
export const COLLISION_RADIUS = 0.35; 

// --- SPAWN POINTS ---
// T Spawn: -4.70 4.99 28.57
// CT Spawn: 9.27 1.13 -17.65
export const SPAWN_POINTS = {
    T: [new Vector3(-4.70, 4.99, 28.57)],
    CT: [new Vector3(9.27, 2.0, -17.65)], // Чуть поднял Y, чтобы не проваливались
    DM: [new Vector3(0, 5, 0)] // Default/Spectator
};

// Assets
export const PLAYER_MODEL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/model.gltf?v=3';
export const PISTOL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/pistol.gltf';
export const AK47_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/AK-47.gltf';
export const MAP_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/de_dust2_-_cs_map.glb';

// Body Dimensions
export const S = 0.66; 
export const BODY_HALF_SIZE = { x: 0.25 * S, y: 0.375 * S, z: 0.125 * S };
export const HEAD_HALF_SIZE = { x: 0.2 * S, y: 0.2 * S, z: 0.2 * S };
export const LIMB_HALF_SIZE = { x: 0.125 * S, y: 0.375 * S, z: 0.125 * S };

// --- WEAPON & BALLISTICS ---
export const BULLET_SPEED = 150.0; 
export const BULLET_GRAVITY = 5.0; 
export const BULLET_LIFETIME = 2.0; 
export const MAX_DECALS = 50; 

// Damage Multipliers
export const DMG_mult = {
    HEAD: 2.5,  // Голова
    BODY: 1.0,  // Тело
    LIMB: 0.5   // Руки/Ноги
};

// Weapon Configs (Balanced for new damage system)
export const WEAPONS_DATA = {
    pistol: {
        id: 'pistol',
        name: 'DESERT EAGLE',
        url: PISTOL_URL,
        // Base damage ~20. Head: 50 (2 shots), Body: 20 (5 shots), Limb: 10
        damage: 20, 
        force: 0.5,
        rate: 0.0, 
        auto: false,
        maxAmmo: 7,
        reloadTime: 2.25,
        position: { x: 0.40, y: -0.25, z: 1.10 },
        scale: 1.2,
        anims: { shoot: 'fire', reload: 'reload', inspect: 'inspect', idle: 'idle' }
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        url: AK47_URL,
        // Base damage ~24. Head: 60 (2 shots), Body: 24 (5 shots), Limb: 12
        damage: 24,
        force: 0.8,
        rate: 0.1, 
        auto: true,
        maxAmmo: 30,
        reloadTime: 2.5, 
        position: { x: 0.35, y: -0.35, z: 0.8 },
        scale: 1.0, 
        anims: { shoot: 'fire', reload: 'reload', inspect: 'inspect', idle: 'idle' }
    }
};

export const MUZZLE_OFFSET_FPS = { x: 0.15, y: -0.1, z: -0.4 }; 
