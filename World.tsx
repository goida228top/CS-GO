
import React, { useState, useEffect, useRef, Suspense, useLayoutEffect, useMemo } from 'react';
import { Stars, useGLTF, useAnimations, Html } from '@react-three/drei';
import { RigidBody, CuboidCollider, useRapier, RapierRigidBody } from '@react-three/rapier'; 
import { Vector3, LoopRepeat, Raycaster, Vector2, MeshStandardMaterial, Color, Box3, Group, Mesh, MeshBasicMaterial } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Ragdoll, PLAYER_MODEL_URL, S, BODY_HALF_SIZE, HEAD_HALF_SIZE, LIMB_HALF_SIZE } from './Player';

// --- ИНИЦИАЛИЗАЦИЯ ГЛОБАЛЬНЫХ НАСТРОЕК ---
if (typeof window !== 'undefined') {
  window.GAME_SETTINGS = {
    gunForce: 0.1,
    dragMode: false
  };
}

const MAP_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/de_dust2_-_cs_map.glb';

// Компонент для отрисовки зеленой сетки поверх карты
const WireframeOverlay = ({ originalScene }: { originalScene: Group }) => {
    const wireframeGroup = useMemo(() => {
        const clone = originalScene.clone();
        const limeMaterial = new MeshBasicMaterial({ 
            color: 'lime', 
            wireframe: true, 
            transparent: true, 
            opacity: 0.3,
            depthTest: false, // Чтобы просвечивало сквозь стены
            depthWrite: false
        });

        clone.traverse((obj) => {
            if (obj instanceof Mesh) {
                obj.material = limeMaterial;
                obj.castShadow = false;
                obj.receiveShadow = false;
            }
        });
        return clone;
    }, [originalScene]);

    return <primitive object={wireframeGroup} />;
};

const MapModel = () => {
  const { scene } = useGLTF(MAP_URL);
  const [processedScene, setProcessedScene] = useState<Group | null>(null);

  useLayoutEffect(() => {
    if (!scene) return;

    const clonedScene = scene.clone();

    // 1. Вычисляем оригинальные размеры
    const originalBox = new Box3().setFromObject(clonedScene);
    const originalSize = new Vector3();
    originalBox.getSize(originalSize);

    console.log("Map Original Size:", originalSize);

    // 2. Вычисляем коэффициент масштаба (цель ~80 метров)
    const targetSize = 80;
    const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);
    let scaleFactor = 1;
    if (maxDim > 0) {
        scaleFactor = targetSize / maxDim;
    }
    console.log(`Baking scale: ${scaleFactor}`);

    // 3. ПРИМЕНЯЕМ МАСШТАБ К ГЕОМЕТРИИ
    clonedScene.traverse((obj) => {
        if (obj instanceof Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material) {
                obj.material.side = 2; // DoubleSide
                obj.material.envMapIntensity = 0.5;
                if (obj.material.map) obj.material.map.anisotropy = 16;
                obj.material.needsUpdate = true;
            }
            obj.geometry.scale(scaleFactor, scaleFactor, scaleFactor);
            obj.position.multiplyScalar(scaleFactor);
            obj.updateMatrix();
        }
    });
    
    // Обновляем мировую матрицу после скейла
    clonedScene.updateMatrixWorld(true);

    // 4. ВЫЧИСЛЯЕМ ГРАНИЦЫ УЖЕ ОТМАСШТАБИРОВАННОЙ СЦЕНЫ
    const scaledBox = new Box3().setFromObject(clonedScene);
    const scaledCenter = new Vector3();
    scaledBox.getCenter(scaledCenter);

    // 5. ВЫЧИСЛЯЕМ СМЕЩЕНИЕ
    // Центрируем по X и Z.
    // По Y ставим так, чтобы самый низ (min.y) стал равен 0.
    const offsetX = -scaledCenter.x;
    const offsetY = -scaledBox.min.y; 
    const offsetZ = -scaledCenter.z;

    clonedScene.position.set(offsetX, offsetY, offsetZ);
    clonedScene.updateMatrixWorld(true);

    setProcessedScene(clonedScene);

  }, [scene]);

  if (!processedScene) return null;

  return (
    <group>
      <RigidBody type="fixed" colliders="trimesh" friction={1} restitution={0}>
        <primitive object={processedScene} />
      </RigidBody>
      
      {/* ВИЗУАЛИЗАЦИЯ ХИТБОКСОВ (ЗЕЛЕНАЯ СЕТКА) */}
      <WireframeOverlay originalScene={processedScene} />
    </group>
  );
};

// Глобальное хранилище состояния убитых манекенов
const deadMannequins = new Map<string, Vector3>();

const Hitbox = ({ position, args }: { position: [number, number, number], args: { x: number, y: number, z: number } }) => (
    <>
      <CuboidCollider position={position} args={[args.x, args.y, args.z]} />
      <mesh position={position} renderOrder={1}>
        <boxGeometry args={[args.x * 2, args.y * 2, args.z * 2]} />
        <meshBasicMaterial color="lime" wireframe depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
);

const Mannequin = ({ id, position }: { id: string, position: [number, number, number] }) => {
    const [isDead, setIsDead] = useState(() => deadMannequins.has(id));
    const [hitForce, setHitForce] = useState(() => deadMannequins.get(id) || new Vector3());
    const groupRef = useRef<any>(null);

    const { scene, animations = [] } = useGLTF(PLAYER_MODEL_URL);
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    const { actions } = useAnimations(animations, groupRef);

    useEffect(() => {
        if (!isDead && actions && actions['idle']) {
            actions['idle'].reset().play();
            actions['idle'].setLoop(LoopRepeat, Infinity);
        }
    }, [actions, isDead]);

    useEffect(() => {
        const onHit = (e: any) => {
            if (e.detail.id === id && !isDead) {
                const force = e.detail.force;
                setHitForce(force);
                setIsDead(true);
                deadMannequins.set(id, force);
            }
        };

        const onRespawn = () => {
            setIsDead(false);
            deadMannequins.delete(id);
            setHitForce(new Vector3(0,0,0));
        };

        window.addEventListener('MANNEQUIN_HIT', onHit);
        window.addEventListener('RESPAWN_ALL', onRespawn);
        return () => {
            window.removeEventListener('MANNEQUIN_HIT', onHit);
            window.removeEventListener('RESPAWN_ALL', onRespawn);
        };
    }, [id, isDead]);

    if (isDead) {
        return (
            <Ragdoll 
                position={new Vector3(position[0], position[1], position[2])} 
                initialVelocity={hitForce} 
            />
        );
    }

    const legHeight = LIMB_HALF_SIZE.y * 2;
    const bodyHeight = BODY_HALF_SIZE.y * 2;
    
    const legLeftPos: [number, number, number] = [-BODY_HALF_SIZE.x / 2, LIMB_HALF_SIZE.y, 0];
    const legRightPos: [number, number, number] = [BODY_HALF_SIZE.x / 2, LIMB_HALF_SIZE.y, 0];
    const bodyPos: [number, number, number] = [0, legHeight + BODY_HALF_SIZE.y, 0];
    const headPos: [number, number, number] = [0, legHeight + bodyHeight + HEAD_HALF_SIZE.y, 0];
    const armY = legHeight + bodyHeight - LIMB_HALF_SIZE.y;
    const armLeftPos: [number, number, number] = [-(BODY_HALF_SIZE.x + LIMB_HALF_SIZE.x), armY, 0];
    const armRightPos: [number, number, number] = [(BODY_HALF_SIZE.x + LIMB_HALF_SIZE.x), armY, 0];

    return (
        <group ref={groupRef} position={position} userData={{ isMannequin: true, id: id }}>
            <RigidBody type="fixed" colliders={false}>
                 <Hitbox position={bodyPos} args={BODY_HALF_SIZE} />
                 <Hitbox position={headPos} args={HEAD_HALF_SIZE} />
                 <Hitbox position={legLeftPos} args={LIMB_HALF_SIZE} />
                 <Hitbox position={legRightPos} args={LIMB_HALF_SIZE} />
                 <Hitbox position={armLeftPos} args={LIMB_HALF_SIZE} />
                 <Hitbox position={armRightPos} args={LIMB_HALF_SIZE} />
            </RigidBody>
            <primitive object={clonedScene} scale={0.66} />
        </group>
    );
};

const PhysicsDragger = () => {
    const { camera, scene } = useThree();
    const { rapier, world } = useRapier();
    const draggedObject = useRef<RapierRigidBody | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (!window.GAME_SETTINGS.dragMode || e.button !== 0) return;
            setIsDragging(true);
        };

        const onMouseUp = () => {
            setIsDragging(false);
            draggedObject.current = null;
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }, [camera, scene]);

    useFrame(() => {
        if (!isDragging || !window.GAME_SETTINGS.dragMode) return;

        const origin = camera.position;
        const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        const ray = new rapier.Ray(origin, direction);
        const hit = world.castRay(ray, 100, true);

        if (hit && hit.collider) {
            const collider = hit.collider;
            const body = collider.parent();
            if (body && !body.isFixed()) {
                const targetPoint = origin.clone().add(direction.clone().multiplyScalar(3));
                const bodyPos = body.translation();
                const currentPos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
                
                const force = targetPoint.sub(currentPos).multiplyScalar(20);
                const linVel = body.linvel();
                force.sub(new Vector3(linVel.x, linVel.y, linVel.z).multiplyScalar(5));

                body.applyImpulse(force, true);
                body.setAngvel({x:0, y:0, z:0}, true);
            }
        }
    });

    return null;
}

const ModMenu = () => {
    const [visible, setVisible] = useState(false);
    const [force, setForce] = useState(0.1);
    const [drag, setDrag] = useState(false);

    useEffect(() => {
        const toggle = (e: KeyboardEvent) => { if (e.code === 'KeyM') setVisible(v => !v); };
        window.addEventListener('keydown', toggle);
        return () => window.removeEventListener('keydown', toggle);
    }, []);

    const updateForce = (val: number) => {
        setForce(val);
        window.GAME_SETTINGS.gunForce = val;
    };

    const updateDrag = (val: boolean) => {
        setDrag(val);
        window.GAME_SETTINGS.dragMode = val;
    };

    const respawn = () => {
        window.dispatchEvent(new Event('RESPAWN_ALL'));
    };

    return (
        <Html fullscreen style={{ pointerEvents: 'none' }}>
            <div className="absolute top-4 right-4 text-white text-right">
                <p className="text-xs opacity-50">Press 'M' for Mod Menu</p>
                <p className="text-xs opacity-50">F - Fly Mode | G - Super Speed</p>
            </div>
            
            {visible && (
                <div className="absolute top-10 right-10 w-64 bg-black/80 text-white p-4 rounded border border-gray-700 pointer-events-auto font-mono text-sm">
                    <h2 className="text-xl font-bold mb-4 text-lime-400">MOD MENU</h2>
                    
                    <div className="mb-4">
                        <label className="block mb-1">Gun Push Force: {force.toFixed(3)}</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.001"
                            value={force} 
                            onChange={(e) => updateForce(Number(e.target.value))}
                            className="w-full accent-lime-500"
                        />
                    </div>

                    <div className="mb-4 flex items-center justify-between">
                        <span>Drag Mode (Hold Click)</span>
                        <input 
                            type="checkbox" 
                            checked={drag} 
                            onChange={(e) => updateDrag(e.target.checked)}
                            className="w-4 h-4 accent-lime-500"
                        />
                    </div>

                    <button 
                        onClick={respawn}
                        className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded"
                    >
                        RESPAWN ALL
                    </button>
                    
                    <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-2">
                        <p>Controls:</p>
                        <p>WASD - Move</p>
                        <p>E - Equip Gun</p>
                        <p>F - Toggle Fly</p>
                        <p>G - Boost (in Fly)</p>
                        <p>Click - Shoot / Drag</p>
                    </div>
                </div>
            )}
        </Html>
    );
};

useGLTF.preload(MAP_URL);

export const World: React.FC = () => {
  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50]} />
      </directionalLight>
      <spotLight position={[0, 50, 0]} angle={0.5} penumbra={1} intensity={1000} color="white" target-position={[0,0,0]} />
      
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <gridHelper args={[500, 50, 0x444444, 0x222222]} position={[0, -2.1, 0]} />

      <Suspense fallback={null}>
        <MapModel />
      </Suspense>

      <Mannequin id="dummy-1" position={[5, 10, 5]} />
      <Mannequin id="dummy-2" position={[-5, 10, 5]} />

      <PhysicsDragger />
      <ModMenu />
    </group>
  );
};
