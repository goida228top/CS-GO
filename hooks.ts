
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
    shoot: false,
    aim: false,
    toggleFly: false,
    boost: false,
    toggleView: false,
    reload: false,
    inspect: false,
    buy: false,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Блокируем обновление страницы на F5, если мы в игре
      if (e.code === 'F5') {
        e.preventDefault();
      }

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
          setMovement((m) => ({ ...m, reload: true }));
          break;
        case 'KeyF':
          setMovement((m) => ({ ...m, inspect: true })); // Spin logic
          break;
        case 'KeyV': 
          setMovement((m) => ({ ...m, toggleFly: true }));
          break;
        case 'KeyG':
          setMovement((m) => ({ ...m, boost: true }));
          break;
        case 'KeyB':
          setMovement((m) => ({ ...m, buy: true }));
          break;
        case 'F5':
          setMovement((m) => ({ ...m, toggleView: true }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'F5') {
        e.preventDefault();
      }
      
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
          setMovement((m) => ({ ...m, reload: false }));
          break;
        case 'KeyF':
          setMovement((m) => ({ ...m, inspect: false }));
          break;
        case 'KeyV':
          setMovement((m) => ({ ...m, toggleFly: false }));
          break;
        case 'KeyG':
          setMovement((m) => ({ ...m, boost: false }));
          break;
        case 'KeyB':
          setMovement((m) => ({ ...m, buy: false }));
          break;
        case 'F5':
          setMovement((m) => ({ ...m, toggleView: false }));
          break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        setMovement((m) => ({ ...m, aim: true }));
      }
      if (e.button === 0) {
        setMovement((m) => ({ ...m, shoot: true }));
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        setMovement((m) => ({ ...m, aim: false }));
      }
      if (e.button === 0) {
        setMovement((m) => ({ ...m, shoot: false }));
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return movement;
};
