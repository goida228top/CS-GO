
import { Vector3 } from 'three';

export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  equip: boolean;
  shoot: boolean; // Стрельба
  aim: boolean; // Прицеливание
  toggleFly: boolean; // Включение полета (F)
  boost: boolean; // Ускорение (G)
}

export type Keys = keyof ControlState;

// Расширяем window для хранения глобальных настроек отладки
declare global {
  interface Window {
    GAME_SETTINGS: {
      gunForce: number;
      dragMode: boolean;
    };
  }
}
