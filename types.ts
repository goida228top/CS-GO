export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  equip: boolean;
  ragdoll: boolean; // Включение/выключение физики
}

export type Keys = keyof ControlState;