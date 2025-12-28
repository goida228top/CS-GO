
// constants.ts
import { Vector3 } from 'three';

// Player Settings
export const RUN_SPEED = 9.0; // Max running speed (CS style units converted)
export const WALK_SPEED = 3.5; // Crouching speed
export const FLY_SPEED = 15;
export const SUPER_SPEED = 60;

// Physics constants (Source Engine style)
export const STOP_SPEED = 2.0; // Increased to catch stops earlier
export const FRICTION = 14.0;   // Increased significantly (was 6.0) to stop sliding immediately
export const ACCELERATION = 12.0; // Increased (was 8.0) to make movement responsive against high friction
export const AIR_ACCELERATE = 100.0; // Air control (high for strafing)
export const AIR_MAX_SPEED = 1.0; // Cap on how much speed you can ADD in air (not total speed)

export const JUMP_FORCE = 8.0; // Updated to 8.0 (Higher jump)
export const GRAVITY = 30; // Snappier gravity

// --- CAMERA SETTINGS (1st Person) ---
export const CAMERA_DISTANCE = 0.0; // Was 3.5 for 3rd person
export const CAMERA_RIGHT_OFFSET = 0.0; // Was 0.7 for 3rd person

export const HEAD_YAW_LIMIT = Math.PI / 2.5; 
export const COLLISION_RADIUS = 0.35; // INCREASED from 0.2 to 0.35 to prevent wall clipping

// Assets
export const PLAYER_MODEL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/model.gltf?v=3';
export const PISTOL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/pistol.gltf';
export const AK47_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/AK-47.gltf';
export const MAP_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/de_dust2_-_cs_map.glb';

// Body Dimensions
export const S = 0.66; // Scale
export const BODY_HALF_SIZE = { x: 0.25 * S, y: 0.375 * S, z: 0.125 * S };
export const HEAD_HALF_SIZE = { x: 0.2 * S, y: 0.2 * S, z: 0.2 * S };
export const LIMB_HALF_SIZE = { x: 0.125 * S, y: 0.375 * S, z: 0.125 * S };

// --- WEAPON & BALLISTICS ---
export const BULLET_SPEED = 150.0; // Units per second
export const BULLET_GRAVITY = 5.0; // Slight drop over distance
export const BULLET_LIFETIME = 2.0; // Seconds
export const MAX_DECALS = 50; // Max bullet holes

// Weapon Configs
export const WEAPONS_DATA = {
    pistol: {
        id: 'pistol',
        name: 'DESERT EAGLE',
        url: PISTOL_URL,
        damage: 25,
        force: 0.5,
        rate: 0.0, // Semi-auto (wait for click release)
        auto: false,
        maxAmmo: 7,
        reloadTime: 2.25,
        position: { x: 0.40, y: -0.25, z: 1.10 },
        scale: 1.2,
        // STANDARDIZED NAMES
        anims: {
            shoot: 'fire',
            reload: 'reload',
            inspect: 'inspect',
            idle: 'idle' 
        }
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        url: AK47_URL,
        damage: 35,
        force: 0.8,
        rate: 0.1, // 600 RPM -> 0.1s between shots
        auto: true,
        maxAmmo: 30,
        reloadTime: 2.5, // Approx
        position: { x: 0.35, y: -0.35, z: 0.8 },
        scale: 1.0, 
        // STANDARDIZED NAMES
        anims: {
            shoot: 'fire',
            reload: 'reload',
            inspect: 'inspect',
            idle: 'idle'
        }
    }
};

export const MUZZLE_OFFSET_FPS = { x: 0.15, y: -0.1, z: -0.4 }; // Relative to weapon