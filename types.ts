
// types.ts
export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  equip: boolean;
  shoot: boolean;
  aim: boolean;
  toggleFly: boolean;
  boost: boolean;
  toggleView: boolean; 
  reload: boolean; 
  inspect: boolean; 
  buy: boolean; // New Key 'B'
}

// FIX: Храним данные как массивы примитивов, чтобы React не замораживал объекты Three.js
export interface Bullet {
  id: string;
  position: [number, number, number]; 
  velocity: [number, number, number];
  createdAt: number;
}

export interface Decal {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export type Keys = keyof ControlState;

// --- NEW TYPES FOR UI/PROFILE ---
export type Team = 'T' | 'CT' | 'SPECTATOR';

export interface PlayerProfile {
    nickname: string;
    avatarColor: string; // Hex code
    team?: Team;
}

declare global {
  interface Window {
    GAME_SETTINGS: {
      gunForce: number;
      dragMode: boolean;
      showHitboxes: boolean;
      fpsWeaponPosition: { x: number, y: number, z: number };
    };
  }
  
  // JSX augmentation
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}