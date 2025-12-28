import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { WEAPONS_DATA } from './constants';

interface WeaponRendererProps {
    weaponId: 'pistol' | 'ak47';
    shootTrigger?: number;
    reloadTrigger?: number;
    inspectTrigger?: number;
}

export const WeaponRenderer: React.FC<WeaponRendererProps> = ({ weaponId, shootTrigger = 0, reloadTrigger = 0, inspectTrigger = 0 }) => {
  const group = useRef<any>(null);
  
  const weaponData = WEAPONS_DATA[weaponId];
  
  // Dynamic load based on weaponId
  const { scene, animations } = useGLTF(weaponData.url);
  
  const clone = useMemo(() => {
      // Поскольку ты удалил руки сам, просто клонируем сцену
      // Но оставляем минимальную очистку теней для красоты
      const clonedScene = SkeletonUtils.clone(scene);
      
      clonedScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
              child.castShadow = false;
              child.receiveShadow = false;
          }
      });

      return clonedScene;
  }, [scene]);

  const { actions, names } = useAnimations(animations, group);

  // DEBUG: Показываем в консоли, какие анимации реально есть в модели
  useEffect(() => {
      console.log(`[WeaponRenderer] Loaded ${weaponId}. Available animations:`, names);
  }, [weaponId, names]);

  // State to track if we are currently in a "blocking" animation (like reload)
  const [isBusy, setIsBusy] = useState(false);
  const busyTimer = useRef<number | null>(null);

  // Helper to stop everything smoothly
  const stopAll = (except?: string) => {
      if (!actions) return;
      Object.keys(actions).forEach(key => {
          if (key !== except && actions[key] && actions[key].isRunning()) {
              actions[key].fadeOut(0.1);
          }
      });
  };

  const playAction = (animName: string, speed: number = 1, blockingTime: number = 0, loop = false) => {
      if (!actions || !actions[animName]) {
          console.warn(`[WeaponRenderer] Animation "${animName}" missing for ${weaponId}. Check console for available names.`);
          return;
      }

      if (busyTimer.current) clearTimeout(busyTimer.current);
      
      const action = actions[animName];
      stopAll(animName); // Stop others
      
      action.reset();
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      action.clampWhenFinished = !loop;
      action.timeScale = speed;
      action.fadeIn(0.05).play();

      if (blockingTime > 0) {
          setIsBusy(true);
          busyTimer.current = setTimeout(() => {
              setIsBusy(false);
              // Return to idle after blocking action
              if (actions[weaponData.anims.idle]) {
                   playAction(weaponData.anims.idle, 1, 0, true);
              }
          }, blockingTime * 1000) as unknown as number;
      }
  };

  // Initial Idle
  useEffect(() => {
      if (actions && actions[weaponData.anims.idle]) {
          playAction(weaponData.anims.idle, 1, 0, true);
      } else {
          // Если idle нет, пробуем первую попавшуюся, чтобы оружие не замерло в Т-позе
          if (names.length > 0 && actions[names[0]]) {
              console.log(`Idle animation missing for ${weaponId}, playing ${names[0]} instead.`);
              playAction(names[0], 1, 0, true);
          }
      }
  }, [actions, weaponId]);

  // --- SHOOTING ---
  useEffect(() => {
      if (shootTrigger > 0) {
          playAction(weaponData.anims.shoot, 1.5, 0, false); 
      }
  }, [shootTrigger]);

  // --- RELOAD ---
  useEffect(() => {
      if (reloadTrigger > 0) {
          playAction(weaponData.anims.reload, 1.0, weaponData.reloadTime, false);
      }
  }, [reloadTrigger]);

  // --- INSPECT (SPIN) ---
  useEffect(() => {
      if (inspectTrigger > 0) {
          if (!isBusy) {
              playAction(weaponData.anims.inspect, 1.0, 0, false);
          }
      }
  }, [inspectTrigger]);

  useEffect(() => {
      return () => {
          if (busyTimer.current) clearTimeout(busyTimer.current);
      };
  }, []);

  return (
    <group ref={group} dispose={null}>
        <primitive object={clone} />
    </group>
  );
};