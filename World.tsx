import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { MapModel } from './MapModel';
import { Mannequin } from './Mannequin';
import { PhysicsDragger } from './PhysicsDragger';
// ModMenu moved to App.tsx
import { NetworkPlayer } from './NetworkPlayer'; // IMPORT
import { socketManager } from './SocketManager'; // IMPORT
import './gameConfig'; 
import { MAP_URL, BULLET_GRAVITY, BULLET_LIFETIME, MAX_DECALS } from './constants';
import { Bullet, Decal } from './types';
import { Vector3, Raycaster, Object3D, MeshBasicMaterial } from 'three';

useGLTF.preload(MAP_URL);

// --- BULLET SYSTEM COMPONENT ---
const BulletSystem = () => {
    const { scene } = useThree();
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [decals, setDecals] = useState<Decal[]>([]);
    
    const raycaster = useRef(new Raycaster());
    const bulletIdCounter = useRef(0);

    const tempPos = useRef(new Vector3());
    const tempVel = useRef(new Vector3());
    const tempDummy = useRef(new Object3D());

    useEffect(() => {
        const handleFire = (e: any) => {
            if (!e.detail) return;
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
        
        // --- GATHER HITTABLE OBJECTS ---
        const map = scene.getObjectByName('environment');
        const hittableObjects: Object3D[] = [];
        if (map) hittableObjects.push(map);
        
        // Traverse scene to find Mannequins (alive) and Ragdolls (dead parts)
        scene.traverse((obj) => {
             // Alive Mannequin Tag
             if (obj.userData && obj.userData.isMannequin) {
                 hittableObjects.push(obj);
             }
             // Dead Ragdoll Tag (on the inner mesh of the RigidBody)
             if (obj.userData && obj.userData.isRagdoll) {
                 hittableObjects.push(obj);
             }
        });

        bullets.forEach(bullet => {
            if ((now - bullet.createdAt) / 1000 > BULLET_LIFETIME) return;

            tempPos.current.set(bullet.position[0], bullet.position[1], bullet.position[2]);
            tempVel.current.set(bullet.velocity[0], bullet.velocity[1], bullet.velocity[2]);
            
            const startPos = tempPos.current.clone();
            tempVel.current.y -= BULLET_GRAVITY * delta;
            const velocityStep = tempVel.current.clone().multiplyScalar(delta);
            const nextPos = tempPos.current.clone().add(velocityStep);
            const dist = velocityStep.length();

            const direction = velocityStep.clone().normalize();
            raycaster.current.set(startPos, direction);
            
            const intersects = raycaster.current.intersectObjects(hittableObjects, true);
            const hit = intersects.find(hit => hit.distance <= dist);

            if (hit && hit.point) {
                let hitHandled = false;
                
                // 1. Check for Ragdoll (Dead) - Priority
                let obj: Object3D | null = hit.object;
                while(obj) {
                    if (obj.userData && obj.userData.isRagdoll) {
                        hitHandled = true;
                        // Use a higher force multiplier for ragdolls to make them "juggle"
                        const juggleMultiplier = 2.0; 
                        const impulseForce = direction.clone().multiplyScalar(window.GAME_SETTINGS.gunForce * juggleMultiplier);
                        
                        // Add a slight upward component to help them fly
                        impulseForce.y += 0.5 * window.GAME_SETTINGS.gunForce;

                        const event = new CustomEvent('RAGDOLL_HIT', { 
                            detail: { 
                                ragdollId: obj.userData.ragdollId,
                                partName: obj.userData.partName || hit.object.name, 
                                force: [impulseForce.x, impulseForce.y, impulseForce.z],
                                point: [hit.point.x, hit.point.y, hit.point.z]
                            } 
                        });
                        window.dispatchEvent(event);
                        break;
                    }
                    if (obj.userData && obj.userData.isMannequin) {
                        hitHandled = true;
                        // Alive Mannequin Logic
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

                // 2. Check for Wall (Decal)
                if (!hitHandled && hit.face) {
                    const normal = hit.face.normal.clone();
                    normal.transformDirection(hit.object.matrixWorld).normalize();
                    const decalPos = hit.point.clone();
                    
                    tempDummy.current.position.copy(hit.point);
                    tempDummy.current.lookAt(hit.point.clone().add(normal));
                    
                    const newDecal: Decal = {
                        id: `decal-${Date.now()}-${Math.random()}`,
                        position: [decalPos.x, decalPos.y, decalPos.z],
                        rotation: [tempDummy.current.rotation.x, tempDummy.current.rotation.y, tempDummy.current.rotation.z]
                    };
                    
                    setDecals(prev => {
                        const next = [...prev, newDecal];
                        if (next.length > MAX_DECALS) next.shift();
                        return next;
                    });
                }
                
                return; // Bullet destroyed
            }

            // Move bullet
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
                    <boxGeometry args={[0.03, 0.03, 0.03]} />
                    <meshBasicMaterial {...({ color: "yellow" } as any)} />
                </mesh>
            ))}

            {decals.map(d => (
                <mesh key={d.id} position={d.position} rotation={d.rotation}>
                    <boxGeometry args={[0.1, 0.1, 0.1]} />
                    <meshBasicMaterial {...({ color: "black" } as any)} />
                </mesh>
            ))}
        </>
    );
};

interface WorldProps {
    gameMode: string;
    isDev?: boolean;
}

export const World: React.FC<WorldProps> = ({ gameMode, isDev = false }) => {
  const [networkPlayers, setNetworkPlayers] = useState<any[]>([]);

  // SOCKET LISTENER
  useEffect(() => {
      const socket = socketManager.socket;
      
      const updatePlayers = () => {
          const others = Object.values(socketManager.otherPlayers || {});
          setNetworkPlayers([...others]);
      };
      
      // Initialize with whatever we have right now
      updatePlayers();

      if (socket) {
          // Listen to events that change player list
          socket.on('player_joined', (p) => {
              socketManager.otherPlayers[p.id] = p;
              updatePlayers();
          });

          socket.on('current_players', (players) => {
              const others: any = {};
              Object.values(players).forEach((p: any) => {
                 if(p.id !== socket.id) others[p.id] = p;
              });
              socketManager.otherPlayers = others;
              updatePlayers();
          });

          socket.on('player_left', ({ id }) => {
              delete socketManager.otherPlayers[id];
              updatePlayers();
          });

          socket.on('player_moved', (data) => {
              if (socketManager.otherPlayers[data.id]) {
                  socketManager.otherPlayers[data.id].position = data.pos;
                  socketManager.otherPlayers[data.id].rotation = data.rot;
                  socketManager.otherPlayers[data.id].animState = data.animState; // Sync Anim State
                  socketManager.otherPlayers[data.id].weapon = data.weapon;
              }
          });
      }

      return () => {
          if (socket) {
              socket.off('player_joined');
              socket.off('current_players');
              socket.off('player_left');
              socket.off('player_moved');
          }
      };
  }, []);

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

      {/* RENDER NETWORK PLAYERS */}
      {networkPlayers.map((p) => (
          <NetworkPlayer 
            key={p.id}
            id={p.id}
            position={p.position}
            rotation={p.rotation}
            color={p.avatarColor}
            nickname={p.nickname}
            team={p.team}
            weapon={p.weapon}
            animState={p.animState}
          />
      ))}

      {gameMode === 'training' && (
          <>
            <Mannequin id="dummy-1" position={[-19.27, 2.90, -23.39]} />
            <Mannequin id="dummy-2" position={[22.32, 4.34, -19.59]} />
            <Mannequin id="dummy-3" position={[5.0, 1.0, 5.0]} />
          </>
      )}

      {/* Physics Dragger only for training or dev */}
      {(gameMode === 'training' || isDev) && <PhysicsDragger />}
      
      <BulletSystem />
    </group>
  );
};