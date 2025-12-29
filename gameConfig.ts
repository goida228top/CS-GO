
// gameConfig.ts
if (typeof window !== 'undefined') {
  window.GAME_SETTINGS = {
    gunForce: 0.1,
    dragMode: false,
    showHitboxes: false,
    fpsWeaponPosition: { x: 0.40, y: -0.25, z: 1.10 }
  };

  window.CHEATS = {
      esp: false,
      chams: false,
      aimbot: false,
      godMode: false,
      infiniteAmmo: false,
      rapidFire: false,
      autoPistol: false,
      fly: false,
      speedhack: false,
      bunnyhop: false
  };
}

export {}; // Make it a module