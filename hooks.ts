import { useState, useEffect } from 'react';
import { ControlState } from './types';

export const useKeyboardControls = (): ControlState => {
  const [movement, setMovement] = useState<ControlState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    equip: false,
    ragdoll: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((m) => ({ ...m, right: true }));
          break;
        case 'Space':
          setMovement((m) => ({ ...m, jump: true }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovement((m) => ({ ...m, crouch: true }));
          break;
        case 'KeyE':
          setMovement((m) => ({ ...m, equip: true }));
          break;
        case 'KeyR':
           // Для рагдола сделаем переключение (toggle) прямо здесь или просто флаг
           // Но лучше просто флаг нажатия, а переключение логики в компоненте.
           // В данном случае просто передаем true пока нажата, 
           // но для удобства сделаем toggle в компоненте Player.
           setMovement((m) => ({ ...m, ragdoll: true }));
           break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((m) => ({ ...m, forward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((m) => ({ ...m, backward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((m) => ({ ...m, left: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((m) => ({ ...m, right: false }));
          break;
        case 'Space':
          setMovement((m) => ({ ...m, jump: false }));
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          setMovement((m) => ({ ...m, crouch: false }));
          break;
        case 'KeyE':
          setMovement((m) => ({ ...m, equip: false }));
          break;
        case 'KeyR':
          setMovement((m) => ({ ...m, ragdoll: false }));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
};