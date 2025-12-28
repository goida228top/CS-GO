import { useEffect } from 'react';

interface PointerLockerProps {
  onLock: () => void;
  onUnlock: () => void;
  selector?: string;
}

export const PointerLocker = ({ onLock, onUnlock }: PointerLockerProps) => {
  useEffect(() => {
    const doc = document;
    
    const onClick = () => {
      // Пытаемся захватить курсор при клике
      // Casting to any to handle the Promise return in modern browsers without TS fuss
      const promise = doc.body.requestPointerLock() as any;
      
      // Catch the "The user has exited the lock..." error silently
      if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {
              // Intentionally empty. 
              // This suppresses "The user has exited the lock before this request was completed."
          });
      }
    };

    const onPointerLockChange = () => {
      if (doc.pointerLockElement === doc.body) {
        onLock();
      } else {
        onUnlock();
      }
    };

    const onError = (e: Event) => {
      // Suppress console error. It usually happens when spamming ESC or Alt-Tab.
      // console.error('Pointer Lock Error', e); 
    };

    doc.addEventListener('click', onClick);
    doc.addEventListener('pointerlockchange', onPointerLockChange);
    doc.addEventListener('pointerlockerror', onError);

    return () => {
      doc.removeEventListener('click', onClick);
      doc.removeEventListener('pointerlockchange', onPointerLockChange);
      doc.removeEventListener('pointerlockerror', onError);
    };
  }, [onLock, onUnlock]);

  return null;
};