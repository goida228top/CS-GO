
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MapModel } from './MapModel';
import { Mannequin } from './Mannequin';
import { PhysicsDragger } from './PhysicsDragger';
import { ModMenu } from './ModMenu';
import './gameConfig'; 
import { MAP_URL, BULLET_GRAVITY, BULLET_LIFETIME, MAX_DECALS } from './constants';
import { Bullet, Decal } from './types';
import { Vector3, Raycaster, Object3D, MeshBasicMaterial } from 'three';

useGLTF.preload(MAP_URL);

// --- BULLET SYSTEM COMPONENT ---
const BulletSystem = () => {
    const { scene } = useThree();
    // Храним только примитивы (массивы), никаких Vector3 в стейте!
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [decals, setDecals] = useState<Decal[]>([]);
    
    const raycaster = useRef(new Raycaster());
    const bulletIdCounter = useRef(0);

    // Временные векторы для расчетов, чтобы не создавать их каждый кадр (оптимизация и GC)
    const tempPos = useRef(new Vector3());
    const tempVel = useRef(new Vector3());
    const tempNormal = useRef(new Vector3());
    const tempDummy = useRef(new Object3D());

    useEffect(() => {
        const handleFire = (e: any) => {
            if (!e.detail) return;
            // Получаем Vector3 из события, но сразу конвертируем в массив для стейта
            const { position, velocity } = e.detail;
            
            const newBullet: Bullet = {
                id: `bullet-${bulletIdCounter.current++}`,
                position: [position.x, position.y, position.z],
                velocity: [velocity.x, velocity.y, velocity.z],
                createdAt: Date.now()
            };
            setBullets(prev => [...prev, newBullet]);
        };
        
        window.addEventListener('FIRE_BULLET', handleFire);
        return () => window.removeEventListener('FIRE_BULLET', handleFire);
    }, []);

    useFrame((state, delta) => {
        if (bullets.length === 0) return;

        const now = Date.now();
        const survivingBullets: Bullet[] = [];
        
        const map = scene.getObjectByName('environment');
        const hittableObjects: Object3D[] = [];
        if (map) hittableObjects.push(map);
        
        scene.traverse((obj) => {
             if (obj.userData && obj.userData.isMannequin) {
                 hittableObjects.push(obj);
             }
        });

        bullets.forEach(bullet => {
            if ((now - bullet.createdAt) / 1000 > BULLET_LIFETIME) return;

            // 1. Восстанавливаем Vector3 из массива для расчетов
            tempPos.current.set(bullet.position[0], bullet.position[1], bullet.position[2]);
            tempVel.current.set(bullet.velocity[0], bullet.velocity[1], bullet.velocity[2]);
            
            const startPos = tempPos.current.clone();

            // Гравитация
            tempVel.current.y -= BULLET_GRAVITY * delta;
            
            // Движение
            const velocityStep = tempVel.current.clone().multiplyScalar(delta);
            const nextPos = tempPos.current.clone().add(velocityStep);
            const dist = velocityStep.length();

            // Рейкаст
            const direction = velocityStep.clone().normalize();
            raycaster.current.set(startPos, direction);
            
            // Важно: проверяем на undefined
            const intersects = raycaster.current.intersectObjects(hittableObjects, true);
            const hit = intersects.find(hit => hit.distance <= dist);

            if (hit && hit.point) {
                // --- ЛОГИКА ПОПАДАНИЯ ---
                
                // Проверяем манекен
                let isMannequin = false;
                let obj: Object3D | null = hit.object;
                while(obj) {
                    if (obj.userData && obj.userData.isMannequin) {
                        isMannequin = true;
                        // Отправляем массив, чтобы не заморозить Vector3
                        const impulseForce = direction.clone().multiplyScalar(window.GAME_SETTINGS.gunForce);
                        const event = new CustomEvent('MANNEQUIN_HIT', { 
                            detail: { 
                                id: obj.userData.id, 
                                force: [impulseForce.x, impulseForce.y, impulseForce.z] 
                            } 
                        });
                        window.dispatchEvent(event);
                        break;
                    }
                    obj = obj.parent;
                }

                // Если стена -> Декаль
                // FIX: Проверяем hit.face, так как он может быть null
                if (!isMannequin && hit.face) {
                    // ВАЖНО: hit.face.normal находится в локальных координатах объекта (стены).
                    // Трансформируем нормаль в мировые координаты, чтобы исправить поворот на стенах.
                    const normal = hit.face.normal.clone();
                    normal.transformDirection(hit.object.matrixWorld).normalize();
                    
                    // Позиция декали. Оставляем прямо в точке попадания, так как теперь это куб.
                    const decalPos = hit.point.clone();
                    
                    // Расчет вращения через фиктивный объект
                    tempDummy.current.position.copy(hit.point);
                    // Смотрим в точку "стена + нормаль", то есть перпендикулярно стене наружу
                    tempDummy.current.lookAt(hit.point.clone().add(normal));
                    
                    const newDecal: Decal = {
                        id: `decal-${Date.now()}-${Math.random()}`,
                        // Сохраняем ТОЛЬКО массивы
                        position: [decalPos.x, decalPos.y, decalPos.z],
                        rotation: [tempDummy.current.rotation.x, tempDummy.current.rotation.y, tempDummy.current.rotation.z]
                    };
                    
                    setDecals(prev => {
                        const next = [...prev, newDecal];
                        if (next.length > MAX_DECALS) next.shift();
                        return next;
                    });
                }
                
                // Пуля уничтожается
                return; 
            }

            // Если не попали - обновляем позицию (сохраняем как массив)
            survivingBullets.push({
                ...bullet,
                position: [nextPos.x, nextPos.y, nextPos.z],
                velocity: [tempVel.current.x, tempVel.current.y, tempVel.current.z]
            });
        });

        setBullets(survivingBullets);
    });

    return (
        <>
            {bullets.map(b => (
                <mesh key={b.id} position={b.position}>
                    {/* Маленькие желтые кубики */}
                    <boxGeometry args={[0.03, 0.03, 0.03]} />
                    <meshBasicMaterial {...({ color: "yellow" } as any)} />
                </mesh>
            ))}

            {decals.map(d => (
                <mesh key={d.id} position={d.position} rotation={d.rotation}>
                    {/* Квадратные (кубические) дырки от пуль */}
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                    <meshBasicMaterial {...({ color: "black" } as any)} />
                </mesh>
            ))}
        </>
    );
};

export const World: React.FC = () => {
  return (
    <group>
      <color attach="background" args={['#000000']} />

      <ambientLight {...({ intensity: 0.7 } as any)} />
      <directionalLight
        {...({
            position: [20, 30, 20],
            intensity: 1.5
        } as any)}
      />
      
      <gridHelper args={[500, 50, 0x444444, 0x222222]} {...({ position: [0, -2.1, 0] } as any)} />

      <Suspense fallback={null}>
        <MapModel />
      </Suspense>

      {/* Обновленные позиции манекенов */}
      <Mannequin id="dummy-1" position={[-19.27, 2.90, -23.39]} />
      <Mannequin id="dummy-2" position={[22.32, 4.34, -19.59]} />

      <PhysicsDragger />
      <BulletSystem />
      <ModMenu />
    </group>
  );
};
