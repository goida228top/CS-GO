
// gameConfig.ts
if (typeof window !== 'undefined') {
  window.GAME_SETTINGS = {
    gunForce: 0.1,
    dragMode: false,
    showHitboxes: false,
    fpsWeaponPosition: { x: 0.40, y: -0.25, z: 1.10 } // Обновлено по скриншоту
  };
}

export {}; // Make it a module
