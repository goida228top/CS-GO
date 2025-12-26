
// Player.tsx - PHYSICS CONTROLLER UPDATE

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { Vector3, Group, Object3D, MathUtils, LoopRepeat, Raycaster, Vector2, PerspectiveCamera, Quaternion } from 'three';
import { useKeyboardControls } from './hooks';
import { useGLTF, useAnimations } from '@react-three/drei';
import { RigidBody, CuboidCollider, useSphericalJoint, RapierRigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';

// --- НАСТРОЙКИ ---
const RUN_SPEED = 6; 
const WALK_SPEED = 3;
const FLY_SPEED = 20;
const SUPER_SPEED = 80;

const JUMP_FORCE = 6; // Немного уменьшил, так как физика теперь честная
const CAMERA_DISTANCE = 3.5;
const CAMERA_RIGHT_OFFSET = 0.7; 
const HEAD_YAW_LIMIT = Math.PI / 2.5; 

export const PLAYER_MODEL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/model.gltf?v=3';
const PISTOL_URL = 'https://raw.githubusercontent.com/goida228top/textures/main/pistol.gltf';

interface PlayerProps { isLocked: boolean; }

const normalizeAngle = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

export const S = 0.66; 
export const BODY_HALF_SIZE = { x: 0.25 * S, y: 0.375 * S, z: 0.125 * S };
export const HEAD_HALF_SIZE = { x: 0.2 * S, y: 0.2 * S, z: 0.2 * S };
export const LIMB_HALF_SIZE = { x: 0.125 * S, y: 0.375 * S, z: 0.125 * S };

const WeaponRenderer = () => {
  const { scene } = useGLTF(PISTOL_URL);
  const clone = React.useMemo(() => scene.clone(), [scene]);
  return (
    <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 2 - 0.2, Math.PI, Math.PI]} scale={1.2}>
      <primitive object={clone} />
    </group>
  );
};

export const Ragdoll = ({ 
    position, 
    initialVelocity = new Vector3(0,0,0),
}: { 
    position: Vector3, 
    initialVelocity?: Vector3,
}) => {
  const { scene } = useGLTF(PLAYER_MODEL_URL);

  const modelParts = useMemo(() => {
    const clone = scene.clone(true); 
    const parts: { [key: string]: Object3D } = {};
    clone.traverse((child) => {
      if (child.type === 'Mesh') {
        const mesh = child.clone();
        mesh.position.set(0, 0, 0); 
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(S, S, S); 
        
        const name = child.name.toLowerCase();
        if (name.includes('head')) parts.head = mesh;
        else if (name.includes('body') || name.includes('torso')) parts.body = mesh;
        else if (name.includes('arm') && name.includes('left')) parts.armL = mesh;
        else if (name.includes('arm') && name.includes('right')) parts.armR = mesh;
        else if (name.includes('leg') && name.includes('left')) parts.legL = mesh;
        else if (name.includes('leg') && name.includes('right')) parts.legR = mesh;
      }
    });
    return parts;
  }, [scene]);

  const legHeight = LIMB_HALF_SIZE.y * 2;
  const bodyHeight = BODY_HALF_SIZE.y * 2;

  const relativePositions = {
    body: new Vector3(0, legHeight + BODY_HALF_SIZE.y, 0),
    head: new Vector3(0, legHeight + bodyHeight + HEAD_HALF_SIZE.y, 0),
    armL: new Vector3(-(BODY_HALF_SIZE.x + LIMB_HALF_SIZE.x), legHeight + bodyHeight - LIMB_HALF_SIZE.y, 0),
    armR: new Vector3(BODY_HALF_SIZE.x + LIMB_HALF_SIZE.x, legHeight + bodyHeight - LIMB_HALF_SIZE.y, 0),
    legL: new Vector3(-BODY_HALF_SIZE.x * 0.5, LIMB_HALF_SIZE.y, 0),
    legR: new Vector3(BODY_HALF_SIZE.x * 0.5, LIMB_HALF_SIZE.y, 0),
  };

  const bodyPos = position.clone().add(relativePositions.body);
  const headPos = position.clone().add(relativePositions.head);
  const armLPos = position.clone().add(relativePositions.armL);
  const armRPos = position.clone().add(relativePositions.armR);
  const legLPos = position.clone().add(relativePositions.legL);
  const legRPos = position.clone().add(relativePositions.legR);

  const bodyRef = useRef<RapierRigidBody>(null);
  const headRef = useRef<RapierRigidBody>(null);
  const armLRef = useRef<RapierRigidBody>(null);
  const armRRef = useRef<RapierRigidBody>(null);
  const legLRef = useRef<RapierRigidBody>(null);
  const legRRef = useRef<RapierRigidBody>(null);

  useSphericalJoint(bodyRef, headRef, [[0, BODY_HALF_SIZE.y, 0], [0, -HEAD_HALF_SIZE.y, 0]]);
  useSphericalJoint(bodyRef, armLRef, [[-BODY_HALF_SIZE.x, BODY_HALF_SIZE.y, 0], [LIMB_HALF_SIZE.x, LIMB_HALF_SIZE.y, 0]]);
  useSphericalJoint(bodyRef, armRRef, [[BODY_HALF_SIZE.x, BODY_HALF_SIZE.y, 0], [-LIMB_HALF_SIZE.x, LIMB_HALF_SIZE.y, 0]]);
  useSphericalJoint(bodyRef, legLRef, [[-BODY_HALF_SIZE.x * 0.5, -BODY_HALF_SIZE.y, 0], [0, LIMB_HALF_SIZE.y, 0]]);
  useSphericalJoint(bodyRef, legRRef, [[BODY_HALF_SIZE.x * 0.5, -BODY_HALF_SIZE.y, 0], [0, LIMB_HALF_SIZE.y, 0]]);

  useEffect(() => {
    if (initialVelocity.lengthSq() > 0.0001) {
        const refs = [bodyRef, headRef, armLRef, armRRef, legLRef, legRRef];
        refs.forEach(ref => {
            if(ref.current) ref.current.applyImpulse(initialVelocity, true);
        });
    }
  }, [initialVelocity]);

  const BodyPart = ({ partRef, position, halfSize, model, visualOffset }: any) => (
    <RigidBody 
        ref={partRef} 
        colliders={false} 
        position={position} 
        mass={2} 
        friction={0.5}
    >
        <CuboidCollider args={[halfSize.x * 0.9, halfSize.y * 0.9, halfSize.z * 0.9]} />
        <mesh>
            <boxGeometry args={[halfSize.x * 2, halfSize.y * 2, halfSize.z * 2]} />
            <meshBasicMaterial color="lime" wireframe visible={true} />
        </mesh>
        {model && (
            <group position={visualOffset}>
                <primitive object={model} />
            </group>
        )}
    </RigidBody>
  );

  return (
    <group>
        <BodyPart partRef={bodyRef} position={bodyPos} halfSize={BODY_HALF_SIZE} model={modelParts.body} visualOffset={relativePositions.body.clone().negate()} />
        <BodyPart partRef={headRef} position={headPos} halfSize={HEAD_HALF_SIZE} model={modelParts.head} visualOffset={relativePositions.head.clone().negate()} />
        <BodyPart partRef={armLRef} position={armLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armL} visualOffset={relativePositions.armL.clone().negate()} />
        <BodyPart partRef={armRRef} position={armRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armR} visualOffset={relativePositions.armR.clone().negate()} />
        <BodyPart partRef={legLRef} position={legLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legL} visualOffset={relativePositions.legL.clone().negate()} />
        <BodyPart partRef={legRRef} position={legRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legR} visualOffset={relativePositions.legR.clone().negate()} />
    </group>
  );
};

// --- ActivePlayer ---
const ActivePlayer = ({ isLocked }: { isLocked: boolean }) => {
  const rb = useRef<RapierRigidBody>(null);
  const meshRef = useRef<Group>(null);
  const { camera, scene } = useThree();
  const { rapier, world } = useRapier();
  const controls = useKeyboardControls();
  const { scene: modelScene, animations = [] } = useGLTF(PLAYER_MODEL_URL);
  const { actions } = useAnimations(animations, meshRef);
  
  const [headBone, setHeadBone] = useState<Object3D | null>(null);
  const [rightArmBone, setRightArmBone] = useState<Object3D | null>(null);
  
  const [isEquipped, setIsEquipped] = useState(false);
  const [modelOffset, setModelOffset] = useState(0); 
  const [isFlying, setIsFlying] = useState(false);
  
  const currentCamHeightRef = useRef(1.4); 
  const lastEquipState = useRef(false);
  const lastShootState = useRef(false);
  const lastFlyState = useRef(false);
  
  const rotationRef = useRef({ yaw: 0, pitch: 0 });
  const bodyYawRef = useRef(0);
  const raycaster = useMemo(() => new Raycaster(), []);

  useEffect(() => {
    let foundHead: Object3D | null = null;
    let foundRightArm: Object3D | null = null;
    modelScene.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name === 'head') foundHead = child;
        if (name.includes('right') && name.includes('arm')) foundRightArm = child;
    });
    if (foundHead) setHeadBone(foundHead);
    if (foundRightArm) setRightArmBone(foundRightArm);
  }, [modelScene]);

  // Логика стрельбы
  useFrame(() => {
    if (controls.shoot && !lastShootState.current && isEquipped && isLocked) {
        raycaster.setFromCamera(new Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const hit = intersects.find(i => {
            let obj: Object3D | null = i.object;
            while(obj) {
                if (obj.userData && obj.userData.isMannequin) return true;
                obj = obj.parent;
            }
            return false;
        });
        if (hit) {
            let target = hit.object;
            while(target && (!target.userData || !target.userData.isMannequin)) {
                if(target.parent) target = target.parent;
                else break;
            }
            if (target && target.userData.id) {
                const forceVal = window.GAME_SETTINGS?.gunForce ?? 0;
                const impulseDir = raycaster.ray.direction.clone().normalize().multiplyScalar(forceVal);
                const event = new CustomEvent('MANNEQUIN_HIT', { detail: { id: target.userData.id, force: impulseDir } });
                window.dispatchEvent(event);
            }
        }
    }
    lastShootState.current = controls.shoot;
  });

  // Логика переключения полета (F)
  useEffect(() => {
    if (controls.toggleFly && !lastFlyState.current) {
        setIsFlying(prev => !prev);
    }
    lastFlyState.current = controls.toggleFly;
  }, [controls.toggleFly]);

  // Анимации
  useEffect(() => {
    const isMoving = controls.forward || controls.backward || controls.left || controls.right;
    const isCrouching = controls.crouch;
    const isAiming = controls.aim && isEquipped;
    const getAction = (name: string) => actions[name] || Object.values(actions).find((a: any) => a?.getClip().name.toLowerCase() === name.toLowerCase()) || null;

    const legsAnim = getAction('walk');
    const idleAnim = getAction('idle'); 
    const armsWalkAnim = getAction('hand_walk'); 
    const pistolAnim = getAction('pistol'); 
    const pistolAimAnim = getAction('pistol_aim'); 
    const crouchIdleAnim = getAction('shift'); 
    const crouchWalkAnim = getAction('shift_walk'); 

    if (pistolAimAnim) pistolAimAnim.setLoop(LoopRepeat, Infinity);
    if (pistolAnim) pistolAnim.setLoop(LoopRepeat, Infinity);
    
    const play = (action: any, timeScale = 1.0) => { 
        if (action) {
            action.setEffectiveTimeScale(timeScale);
            action.setEffectiveWeight(1);
            if (!action.isRunning()) action.reset().fadeIn(0.1).play(); 
        }
    };
    const fade = (action: any) => action?.fadeOut(0.1);

    if (isFlying) {
        if (legsAnim) play(legsAnim, 2.0); 
        fade(crouchIdleAnim); fade(crouchWalkAnim);
        if (isEquipped && pistolAnim) play(pistolAnim);
        else fade(pistolAnim);
        fade(idleAnim);
    } else if (isCrouching) {
        if (isMoving) { if (crouchWalkAnim) play(crouchWalkAnim); fade(crouchIdleAnim); } else { if (crouchIdleAnim) play(crouchIdleAnim); fade(crouchWalkAnim); }
        if (isEquipped) { if (isAiming && pistolAimAnim) { play(pistolAimAnim); fade(pistolAnim); } else if ( pistolAnim) { play(pistolAnim); fade(pistolAimAnim); } fade(armsWalkAnim); } else { fade(pistolAnim); fade(pistolAimAnim); }
        fade(legsAnim); fade(idleAnim); if (!isEquipped) fade(armsWalkAnim);
    } else {
        fade(crouchIdleAnim); fade(crouchWalkAnim);
        if (isMoving) {
            if (legsAnim) play(legsAnim, 1.5);
            if (isEquipped) { if (isAiming && pistolAimAnim) { play(pistolAimAnim); fade(pistolAnim); } else if (pistolAnim) { play(pistolAnim); fade(pistolAimAnim); } fade(armsWalkAnim); fade(idleAnim); } else { fade(pistolAnim); fade(pistolAimAnim); if (armsWalkAnim) play(armsWalkAnim, 1.5); }
            if (!isEquipped) fade(idleAnim); 
        } else {
            fade(legsAnim); fade(armsWalkAnim);
            if (isEquipped) { if (isAiming && pistolAimAnim) { play(pistolAimAnim); fade(pistolAnim); } else if (pistolAnim) { play(pistolAnim); fade(pistolAimAnim); } fade(idleAnim); } else { fade(pistolAnim); fade(pistolAimAnim); if (idleAnim) play(idleAnim); }
        }
    }
  }, [controls, actions, isEquipped, isFlying]);

  useEffect(() => { if (controls.equip && !lastEquipState.current) setIsEquipped(prev => !prev); lastEquipState.current = controls.equip; }, [controls.equip]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      const isAiming = controls.aim && isEquipped;
      const sensitivity = isAiming ? 0.0005 : 0.002;
      rotationRef.current.yaw -= e.movementX * sensitivity;
      rotationRef.current.pitch += e.movementY * sensitivity;
      rotationRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.pitch));
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isLocked, controls.aim, isEquipped]);

  // --- MAIN LOOP ---
  useFrame((state, delta) => {
    if (!rb.current) return;

    const cameraYaw = rotationRef.current.yaw;
    const cameraPitch = rotationRef.current.pitch;
    
    // 1. POSITION SYNC FOR UI/LOGIC
    const playerPos = rb.current.translation();
    const vecPos = new Vector3(playerPos.x, playerPos.y, playerPos.z);
    
    const angleToCenter = Math.atan2(0 - vecPos.x, 0 - vecPos.z);
    const compassRotation = angleToCenter - cameraYaw;
    window.dispatchEvent(new CustomEvent('COMPASS_UPDATE', { detail: compassRotation }));

    // 2. MOVEMENT CALC
    const isMoving = controls.forward || controls.backward || controls.left || controls.right;
    const isAiming = controls.aim && isEquipped;
    
    let speed = controls.crouch ? WALK_SPEED : RUN_SPEED;
    if (isFlying) {
        speed = controls.boost ? SUPER_SPEED : FLY_SPEED;
    }

    const targetFov = isAiming ? 25 : (controls.boost && isFlying ? 80 : 50);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.lerp(camera.fov, targetFov, delta * 12);
      camera.updateProjectionMatrix();
    }

    const frontVector = new Vector3(0, 0, Number(controls.backward) - Number(controls.forward));
    const sideVector = new Vector3(Number(controls.left) - Number(controls.right), 0, 0);
    const direction = new Vector3().subVectors(frontVector, sideVector).normalize();
    
    if (isFlying) {
        direction.applyQuaternion(camera.quaternion);
    } else {
        direction.applyAxisAngle(new Vector3(0, 1, 0), cameraYaw);
    }
    
    const moveVel = direction.multiplyScalar(speed);

    // 3. PHYSICS APPLY
    const currentVel = rb.current.linvel();
    
    // Ground Check Raycast (from center downwards)
    // Capsule height ~1.8m (0.9 half height). Center is at ~0.9m.
    // Cast from center downwards.
    
    const rayOrigin = { x: vecPos.x, y: vecPos.y, z: vecPos.z }; 
    const rayDir = { x: 0, y: -1, z: 0 };
    const ray = new rapier.Ray(rayOrigin, rayDir);
    // castRay(ray, maxToi, solid)
    // We expect ground around 0.9 distance (half height)
    const hit = world.castRay(ray, 2.0, true); 
    
    // A primitive ground check: if hit distance is approx half height (+ tolerance)
    // We assume capsule half-height is 0.6 + radius 0.3 = 0.9 total extent from center.
    // If distance < 0.95, we are grounded.
    let isGrounded = false;
    if (hit && hit.toi < 1.0) {
        isGrounded = true;
    }

    let nextVelY = currentVel.y;

    if (isFlying) {
        nextVelY = 0;
        if (controls.jump) nextVelY = speed;
        if (controls.crouch) nextVelY = -speed;
        rb.current.setGravityScale(0, true);
    } else {
        rb.current.setGravityScale(1, true);
        if (controls.jump && isGrounded) {
             nextVelY = JUMP_FORCE;
        }
    }

    rb.current.setLinvel({ x: moveVel.x, y: nextVelY, z: moveVel.z }, true);

    // 4. MODEL ANIMATION & ROTATION
    const targetOffset = (controls.crouch && !isFlying) ? -0.15 : 0;
    const newOffset = MathUtils.lerp(modelOffset, targetOffset, 0.1);
    setModelOffset(newOffset);

    if (isEquipped) {
        const diff = normalizeAngle(cameraYaw - bodyYawRef.current);
        const turnSpeed = isAiming ? 25 : 15;
        bodyYawRef.current += diff * turnSpeed * delta; 
    } else {
        if (isMoving) {
            const diff = normalizeAngle(cameraYaw - bodyYawRef.current);
            bodyYawRef.current += diff * 10 * delta; 
        } else {
            let diff = normalizeAngle(cameraYaw - bodyYawRef.current);
            if (diff > HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw - HEAD_YAW_LIMIT;
            else if (diff < -HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw + HEAD_YAW_LIMIT;
        }
    }

    // Apply rotation to mesh group, NOT rigid body
    if (meshRef.current) {
        meshRef.current.rotation.y = bodyYawRef.current;
    }
    if (headBone) {
        headBone.rotation.y = normalizeAngle(cameraYaw - bodyYawRef.current);
        headBone.rotation.x = -cameraPitch; 
    }

    // 5. CAMERA SYNC
    const targetHeight = (controls.crouch && !isFlying) ? 1.0 : 1.4; 
    currentCamHeightRef.current = MathUtils.lerp(currentCamHeightRef.current, targetHeight, delta * 5);
    const camHeight = currentCamHeightRef.current;
    const offsetX = Math.cos(cameraYaw) * CAMERA_RIGHT_OFFSET;
    const offsetZ = -Math.sin(cameraYaw) * CAMERA_RIGHT_OFFSET;
    
    camera.position.x = vecPos.x + offsetX + Math.sin(cameraYaw) * Math.cos(cameraPitch) * CAMERA_DISTANCE;
    camera.position.y = vecPos.y + camHeight + Math.sin(cameraPitch) * CAMERA_DISTANCE;
    camera.position.z = vecPos.z + offsetZ + Math.cos(cameraYaw) * Math.cos(cameraPitch) * CAMERA_DISTANCE;
    camera.lookAt(vecPos.x + offsetX, vecPos.y + camHeight, vecPos.z + offsetZ);
  });

  return (
    // Capsule: half-height 0.6, radius 0.3 -> Total height 1.8m.
    <RigidBody 
        ref={rb} 
        colliders={false} 
        mass={80} 
        type="dynamic" 
        position={[0, 10, 0]} 
        enabledRotations={[false, false, false]} // Lock rotation so player doesn't tip over
        friction={0} // Zero friction for walls so we don't stick
    >
        <CapsuleCollider args={[0.6, 0.3]} />
        
        {/* Visual Mesh Group inside RigidBody, so it moves with physics */}
        {/* We need to offset the model so feet align with bottom of capsule */}
        {/* Capsule total height 1.8, center at 0. Bottom is -0.9. Model origin is usually at feet. */}
        {/* So we shift model down by 0.9 */}
        <group ref={meshRef} position={[0, -0.9 + modelOffset, 0]}>
            <primitive object={modelScene} scale={0.66} castShadow />
            {rightArmBone && isEquipped && createPortal(<WeaponRenderer />, rightArmBone)}
        </group>
        
        {/* Shadow blob at feet */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
             <circleGeometry args={[0.25, 32]} />
             <meshBasicMaterial color="black" transparent opacity={0.4} />
        </mesh>
    </RigidBody>
  );
};

export const Player: React.FC<PlayerProps> = ({ isLocked }) => {
    return (
        <ActivePlayer isLocked={isLocked} />
    );
};

useGLTF.preload(PLAYER_MODEL_URL);
useGLTF.preload(PISTOL_URL);
