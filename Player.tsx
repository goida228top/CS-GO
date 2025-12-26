import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { Vector3, Group, Object3D, Quaternion, Mesh } from 'three';
import { useKeyboardControls } from './hooks';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, useSphericalJoint } from '@react-three/rapier';

// --- НАСТРОЙКИ ---
const RUN_SPEED = 5; 
const WALK_SPEED = 2.5;
const JUMP_FORCE = 10;
const GRAVITY = 25;
const CAMERA_DISTANCE = 3.5;
const CAMERA_RIGHT_OFFSET = 0.7; 
const HEAD_YAW_LIMIT = Math.PI / 2.5; 

// Настройки "Выстрела из дробовика"
// Увеличили силу, чтобы труп летел "смачно"
const SHOTGUN_FORCE = 120; 
const SHOTGUN_LIFT = 60;  

const PLAYER_MODEL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/model.gltf';
const PISTOL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/pistol.gltf';

interface PlayerProps {
  isLocked: boolean;
}

const normalizeAngle = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

// --- КОМПОНЕНТ ОРУЖИЯ ---
const WeaponRenderer = () => {
  const { scene } = useGLTF(PISTOL_URL);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return (
    <group position={[0, -0.55, 0.05]} rotation={[Math.PI / 2, Math.PI, Math.PI]} scale={1.2}>
      <primitive object={clone} />
    </group>
  );
};

// --- КОМПОНЕНТ РАГДОЛЛА (Использует части реальной модели) ---
const Ragdoll = ({ position, rotation }: { position: Vector3, rotation: number }) => {
  const { scene } = useGLTF(PLAYER_MODEL_URL);
  
  // Разбираем модель на части для физики
  const modelParts = useMemo(() => {
    const clone = scene.clone();
    const parts: any = {
      head: null,
      body: null,
      armL: null,
      armR: null,
      legL: null,
      legR: null
    };

    clone.traverse((child) => {
      if (child.type === 'Mesh' || child.type === 'Group') {
        const name = child.name.toLowerCase();
        // Пытаемся найти части тела по имени в GLTF
        if (name.includes('head')) parts.head = child;
        else if (name.includes('body') || name.includes('torso')) parts.body = child;
        else if ((name.includes('arm') || name.includes('hand')) && name.includes('left')) parts.armL = child;
        else if ((name.includes('arm') || name.includes('hand')) && name.includes('right')) parts.armR = child;
        else if (name.includes('leg') && name.includes('left')) parts.legL = child;
        else if (name.includes('leg') && name.includes('right')) parts.legR = child;
      }
    });
    
    // Если части не найдены (например, имена другие), берем просто что есть или создаем пустышки, 
    // но здесь мы полагаемся на то, что модель стандартная (Steve-like).
    return parts;
  }, [scene]);

  // Физические ссылки
  const torsoRef = useRef<any>(null);
  const headRef = useRef<any>(null);
  const leftArmRef = useRef<any>(null);
  const rightArmRef = useRef<any>(null);
  const leftLegRef = useRef<any>(null);
  const rightLegRef = useRef<any>(null);
  
  const { camera } = useThree();

  // --- СУСТАВЫ (КЛЕЙ) ---
  // Соединяем части тела "суставами", чтобы они не разлетались
  useSphericalJoint(torsoRef, headRef, [[0, 0.375, 0], [0, -0.25, 0]]); 
  useSphericalJoint(torsoRef, leftArmRef, [[-0.25, 0.35, 0], [0.125, 0.35, 0]]); 
  useSphericalJoint(torsoRef, rightArmRef, [[0.25, 0.35, 0], [-0.125, 0.35, 0]]); 
  useSphericalJoint(torsoRef, leftLegRef, [[-0.125, -0.375, 0], [0, 0.375, 0]]); 
  useSphericalJoint(torsoRef, rightLegRef, [[0.125, -0.375, 0], [0, 0.375, 0]]);

  // --- ЭФФЕКТ ДРОБОВИКА (ИМПУЛЬС) ---
  useEffect(() => {
     if (torsoRef.current) {
        // Вектор удара (назад от направления взгляда)
        const kickX = Math.sin(rotation) * SHOTGUN_FORCE;
        const kickZ = Math.cos(rotation) * SHOTGUN_FORCE;

        torsoRef.current.applyImpulse({ 
            x: kickX, 
            y: SHOTGUN_LIFT,
            z: kickZ 
        }, true);

        // Кручение для реалистичности падения
        torsoRef.current.applyTorqueImpulse({ 
            x: (Math.random() - 0.5) * 30, 
            y: (Math.random() - 0.5) * 50, 
            z: (Math.random() - 0.5) * 30 
        }, true);
     }
  }, []);

  // Камера следит за трупом
  useFrame(() => {
      if (torsoRef.current) {
          const pos = torsoRef.current.translation();
          const target = new Vector3(pos.x, pos.y, pos.z);
          camera.lookAt(target);
          const camTargetPos = target.clone().add(new Vector3(Math.sin(rotation) * 4, 2.5, Math.cos(rotation) * 4));
          camera.position.lerp(camTargetPos, 0.1);
      }
  });

  const bodyCommonProps = { 
      colliders: "cuboid" as const, 
      restitution: 0.2, // Немного упругости
      friction: 1.0,    // Высокое трение, чтобы не скользил как лед
      linearDamping: 0.1,
      angularDamping: 0.1
  };

  const startPos = new Vector3(position.x, position.y + 0.9, position.z);
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rotation);

  // Вспомогательная функция для рендера части модели или заглушки (если часть не найдена)
  const RenderPart = ({ part, size, color }: { part: any, size: [number, number, number], color: string }) => {
    if (part) {
        // Сбрасываем трансформации части, так как она теперь управляется физикой
        part.position.set(0, 0, 0);
        part.rotation.set(0, 0, 0);
        return <primitive object={part} />;
    }
    // Фолбэк на случай если модель другая
    return (
        <mesh castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
  };

  return (
    <group position={startPos} quaternion={q}>
      {/* TORSO */}
      <RigidBody ref={torsoRef} {...bodyCommonProps} position={[0, 0, 0]}>
        <RenderPart part={modelParts.body} size={[0.5, 0.75, 0.25]} color="#008a8a" />
      </RigidBody>

      {/* HEAD */}
      <RigidBody ref={headRef} {...bodyCommonProps} position={[0, 0.625, 0]}>
         {/* Смещение головы внутри коллайдера, если нужно, но primitive обычно центрируется */}
         <group position={[0, -0.25, 0]}>
            <RenderPart part={modelParts.head} size={[0.5, 0.5, 0.5]} color="#583e2f" />
         </group>
      </RigidBody>

      {/* LEFT ARM */}
      <RigidBody ref={leftArmRef} {...bodyCommonProps} position={[-0.375, 0, 0]}>
        <group position={[0.125, -0.25, 0]}>
            <RenderPart part={modelParts.armL} size={[0.25, 0.75, 0.25]} color="#8f6047" />
        </group>
      </RigidBody>

      {/* RIGHT ARM */}
      <RigidBody ref={rightArmRef} {...bodyCommonProps} position={[0.375, 0, 0]}>
        <group position={[-0.125, -0.25, 0]}>
            <RenderPart part={modelParts.armR} size={[0.25, 0.75, 0.25]} color="#8f6047" />
        </group>
      </RigidBody>

      {/* LEFT LEG */}
      <RigidBody ref={leftLegRef} {...bodyCommonProps} position={[-0.125, -0.75, 0]}>
        <group position={[0, -0.25, 0]}>
            <RenderPart part={modelParts.legL} size={[0.25, 0.75, 0.25]} color="#2d2d8d" />
        </group>
      </RigidBody>

      {/* RIGHT LEG */}
      <RigidBody ref={rightLegRef} {...bodyCommonProps} position={[0.125, -0.75, 0]}>
         <group position={[0, -0.25, 0]}>
            <RenderPart part={modelParts.legR} size={[0.25, 0.75, 0.25]} color="#2d2d8d" />
         </group>
      </RigidBody>
    </group>
  );
};

// --- ОБЫЧНЫЙ ИГРОК ---
const ActivePlayer = ({ 
    isLocked, 
    setIsRagdoll,
    saveState 
}: { 
    isLocked: boolean, 
    setIsRagdoll: (v: boolean) => void,
    saveState: (pos: Vector3, rot: number) => void
}) => {
  const meshRef = useRef<Group>(null);
  const { camera } = useThree();
  const controls = useKeyboardControls();
  
  const { scene, animations } = useGLTF(PLAYER_MODEL_URL);
  const { actions } = useAnimations(animations, meshRef);

  const [headBone, setHeadBone] = useState<Object3D | null>(null);
  const [rightArmBone, setRightArmBone] = useState<Object3D | null>(null);

  const [velocity] = useState(new Vector3(0, 0, 0));
  const [isJumping, setIsJumping] = useState(false);
  const [isEquipped, setIsEquipped] = useState(true);
  const lastEquipState = useRef(false);
  const lastRagdollState = useRef(false);

  const rotationRef = useRef({ yaw: 0, pitch: 0 });
  const bodyYawRef = useRef(0);
  const direction = new Vector3();

  // Настройка костей для анимации головы и оружия
  useEffect(() => {
    let foundHead: Object3D | null = null;
    let foundArm: Object3D | null = null;
    scene.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name === 'head') foundHead = child;
        if (name.includes('right') && name.includes('arm')) foundArm = child;
    });
    if (foundHead) setHeadBone(foundHead);
    if (foundArm) setRightArmBone(foundArm);
  }, [scene]);

  // Логика анимаций
  useEffect(() => {
    const isMoving = controls.forward || controls.backward || controls.left || controls.right;
    const legsAnim = actions['walk'];
    const idleAnim = actions['idle']; 
    const armsWalkAnim = actions['hand_walk']; 
    const pistolAnim = actions['pistol'];

    const play = (action: any) => { if (action && !action.isRunning()) action.reset().fadeIn(0.2).play(); };
    const fade = (action: any) => action?.fadeOut(0.2);

    if (isMoving) {
        if (legsAnim) { play(legsAnim); legsAnim.timeScale = controls.crouch ? 1.0 : 1.5; }
        if (isEquipped) {
            if (pistolAnim) { play(pistolAnim); fade(armsWalkAnim); fade(idleAnim); }
            else fade(armsWalkAnim);
        } else {
            fade(pistolAnim);
            if (armsWalkAnim) { play(armsWalkAnim); armsWalkAnim.timeScale = controls.crouch ? 1.0 : 1.5; }
        }
        if (!isEquipped) fade(idleAnim); 
    } else {
        fade(legsAnim); fade(armsWalkAnim);
        if (isEquipped && pistolAnim) { play(pistolAnim); fade(idleAnim); }
        else { fade(pistolAnim); if (idleAnim) play(idleAnim); }
    }
  }, [controls, actions, isEquipped]);

  // Экипировка
  useEffect(() => {
    if (controls.equip && !lastEquipState.current) setIsEquipped(prev => !prev);
    lastEquipState.current = controls.equip;
  }, [controls.equip]);

  // Включение Ragdoll
  useEffect(() => {
      if (controls.ragdoll && !lastRagdollState.current) {
          if (meshRef.current) {
            saveState(meshRef.current.position.clone(), bodyYawRef.current);
          }
          setIsRagdoll(true);
      }
      lastRagdollState.current = controls.ragdoll;
  }, [controls.ragdoll, setIsRagdoll, saveState]);

  // Вращение камерой
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      const sensitivity = 0.002;
      rotationRef.current.yaw -= e.movementX * sensitivity;
      rotationRef.current.pitch += e.movementY * sensitivity;
      rotationRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.pitch));
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isLocked]);

  // Основной цикл движения
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const cameraYaw = rotationRef.current.yaw;
    const cameraPitch = rotationRef.current.pitch;
    const isMoving = controls.forward || controls.backward || controls.left || controls.right;
    const speed = controls.crouch ? WALK_SPEED : RUN_SPEED;

    const frontVector = new Vector3(0, 0, Number(controls.backward) - Number(controls.forward));
    const sideVector = new Vector3(Number(controls.left) - Number(controls.right), 0, 0);
    direction.subVectors(frontVector, sideVector).normalize();
    direction.applyAxisAngle(new Vector3(0, 1, 0), cameraYaw);
    direction.multiplyScalar(speed * delta);
    meshRef.current.position.add(direction);

    // Поворот тела
    if (isMoving) {
        const diff = normalizeAngle(cameraYaw - bodyYawRef.current);
        bodyYawRef.current += diff * 10 * delta; 
    } else {
        let diff = normalizeAngle(cameraYaw - bodyYawRef.current);
        if (diff > HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw - HEAD_YAW_LIMIT;
        else if (diff < -HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw + HEAD_YAW_LIMIT;
    }
    meshRef.current.rotation.y = bodyYawRef.current;

    // Поворот головы (кости)
    if (headBone) {
        headBone.rotation.y = normalizeAngle(cameraYaw - bodyYawRef.current);
        headBone.rotation.x = -cameraPitch; 
    }

    // Гравитация и прыжки (простая кинематика)
    let currentY = meshRef.current.position.y;
    let newVelocityY = velocity.y;
    if (controls.jump && !isJumping) {
      newVelocityY = JUMP_FORCE;
      setIsJumping(true);
    }
    newVelocityY -= GRAVITY * delta;
    currentY += newVelocityY * delta;
    if (currentY < 0) {
      currentY = 0;
      newVelocityY = 0;
      setIsJumping(false);
    }
    meshRef.current.position.y = currentY;
    velocity.y = newVelocityY;

    // Камера от 3-го лица
    const playerPos = meshRef.current.position;
    const targetCamHeight = controls.crouch ? 1.0 : 1.4; 
    const offsetX = Math.cos(cameraYaw) * CAMERA_RIGHT_OFFSET;
    const offsetZ = -Math.sin(cameraYaw) * CAMERA_RIGHT_OFFSET;
    
    camera.position.x = playerPos.x + offsetX + Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAMERA_DISTANCE;
    camera.position.y = playerPos.y + targetCamHeight + Math.sin(cameraPitch) * CAMERA_DISTANCE;
    camera.position.z = playerPos.z + offsetZ + Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAMERA_DISTANCE;
    camera.lookAt(playerPos.x + offsetX, playerPos.y + targetCamHeight, playerPos.z + offsetZ);
  });

  return (
    <group ref={meshRef} position={[0, 0, 0]}>
        <primitive object={scene} scale={0.66} castShadow />
        {rightArmBone && isEquipped && createPortal(<WeaponRenderer />, rightArmBone)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
             <circleGeometry args={[0.25, 32]} />
             <meshBasicMaterial color="black" transparent opacity={0.4} />
        </mesh>
    </group>
  );
};

export const Player: React.FC<PlayerProps> = ({ isLocked }) => {
    const [isRagdoll, setIsRagdoll] = useState(false);
    const [lastPos, setLastPos] = useState(new Vector3(0, 0, 0));
    const [lastRot, setLastRot] = useState(0);
    const controls = useKeyboardControls();
    const lastR = useRef(false);
    
    // Переключение обратно (опционально, на ту же кнопку R)
    useEffect(() => {
        if (controls.ragdoll && !lastR.current && isRagdoll) setIsRagdoll(false);
        lastR.current = controls.ragdoll;
    }, [controls.ragdoll, isRagdoll]);

    // Важно: Мы используем условие рендера, потому что переключение между 
    // кинематическим контроллером и динамическим Ragdoll требует разных RigidBody
    if (isRagdoll) return <Ragdoll position={lastPos} rotation={lastRot} />;

    return (
        <ActivePlayer 
            isLocked={isLocked} 
            setIsRagdoll={setIsRagdoll} 
            saveState={(p, r) => { setLastPos(p); setLastRot(r); }}
        />
    );
};

useGLTF.preload(PLAYER_MODEL_URL);
useGLTF.preload(PISTOL_URL);