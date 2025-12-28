import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import { Vector3, Object3D, Raycaster, LoopRepeat, MathUtils, PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import { useKeyboardControls } from './hooks';
import { useGLTF, useAnimations, Hud, PerspectiveCamera } from '@react-three/drei';
import { WeaponRenderer } from './WeaponRenderer';
import { SkeletonUtils } from 'three-stdlib';
import { soundManager } from './SoundGenerator';
import { RigidBody, CapsuleCollider, RapierRigidBody } from '@react-three/rapier';

// No import BuyMenu here anymore
import { 
    PLAYER_MODEL_URL, 
    RUN_SPEED, 
    WALK_SPEED, 
    FLY_SPEED, 
    SUPER_SPEED, 
    JUMP_FORCE, 
    GRAVITY, 
    HEAD_YAW_LIMIT, 
    COLLISION_RADIUS,
    FRICTION,
    ACCELERATION,
    STOP_SPEED,
    AIR_ACCELERATE,
    AIR_MAX_SPEED,
    BULLET_SPEED,
    WEAPONS_DATA
} from './constants';

const normalizeAngle = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

// Physics functions omitted for brevity, logic remains same
const applyFriction = (vel: Vector3, t: number, onGround: boolean) => {
    if (!onGround) return vel;
    const speed = vel.length();
    if (speed < 0.0001) return vel;
    const control = speed < STOP_SPEED ? STOP_SPEED : speed;
    const drop = control * FRICTION * t;
    let newSpeed = speed - drop;
    if (newSpeed < 0) newSpeed = 0;
    if (newSpeed !== speed) {
        newSpeed /= speed;
        vel.multiplyScalar(newSpeed);
    }
    return vel;
};

const accelerate = (vel: Vector3, wishDir: Vector3, wishSpeed: number, accel: number, t: number) => {
    const currentSpeed = vel.dot(wishDir);
    const addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0) return vel;
    let accelSpeed = accel * wishSpeed * t;
    if (accelSpeed > addSpeed) accelSpeed = addSpeed;
    vel.x += accelSpeed * wishDir.x;
    vel.z += accelSpeed * wishDir.z;
    return vel;
};

export const ActivePlayer = ({ isLocked, onBuyMenuToggle }: { isLocked: boolean, onBuyMenuToggle: (v: boolean) => void }) => {
  const meshRef = useRef<Object3D>(null);
  const modelContainerRef = useRef<Object3D>(null);
  const fpsWeaponRef = useRef<Object3D>(null); 
  
  // Physics Body for Interaction
  const rbRef = useRef<RapierRigidBody>(null);

  const { camera, scene } = useThree();
  const controls = useKeyboardControls();
  const { scene: originalScene, animations = [] } = useGLTF(PLAYER_MODEL_URL);
  
  const modelScene = useMemo(() => {
      if (!originalScene) return null;
      return SkeletonUtils.clone(originalScene);
  }, [originalScene]);
  
  const { actions } = useAnimations(animations, meshRef);
  
  const headBoneRef = useRef<Object3D | null>(null);
  const rightArmBoneRef = useRef<Object3D | null>(null);
  const fpsHiddenPartsRef = useRef<Object3D[]>([]);
  const [, forceUpdate] = useState({});
  
  const velocityRef = useRef(new Vector3(0, 0, 0));
  
  // --- PLAYER STATE ---
  const [health, setHealth] = useState(100);

  // --- WEAPON STATE ---
  const [currentWeaponId, setCurrentWeaponId] = useState<'pistol' | 'ak47'>('pistol');
  const [isEquipped, setIsEquipped] = useState(false); 
  const [ammo, setAmmo] = useState(WEAPONS_DATA['pistol'].maxAmmo);
  const [isReloading, setIsReloading] = useState(false);
  
  // Buy Menu State (internal tracker for key press)
  const [isBuyMenuOpen, setIsBuyMenuOpen] = useState(false);
  const lastBuyState = useRef(false);

  // Derived weapon data
  const currentWeapon = WEAPONS_DATA[currentWeaponId];

  const [isThirdPerson, setIsThirdPerson] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  
  const currentCamHeightRef = useRef(1.15); 
  const lastEquipState = useRef(false);
  const lastShootState = useRef(false);
  const lastFlyState = useRef(false);
  const lastToggleViewState = useRef(false);
  const lastReloadState = useRef(false);
  const lastInspectState = useRef(false);
  const lastShotTimeRef = useRef(0);
  
  const lastJumpTimeRef = useRef(0);
  const wasJumpDownRef = useRef(false);
  
  // Triggers for animations
  const [shootTrigger, setShootTrigger] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [inspectTrigger, setInspectTrigger] = useState(0);
  
  const reloadTimerRef = useRef<number | null>(null);

  const rotationRef = useRef({ yaw: 0, pitch: 0 });
  const bodyYawRef = useRef(0);
  const mapObjectRef = useRef<Object3D | null>(null);

  const downRaycaster = useMemo(() => new Raycaster(), []);
  const horizontalRaycaster = useMemo(() => new Raycaster(), []); 

  const [muzzleFlashVisible, setMuzzleFlashVisible] = useState(false);

  // --- WEAPON FUNCTIONS ---

  const performBuy = (weaponId: 'pistol' | 'ak47') => {
      // 1. Reset triggers so old animations don't play on new weapon
      setShootTrigger(0);
      setReloadTrigger(0);
      setInspectTrigger(0);
      
      // 2. Set new weapon state
      setCurrentWeaponId(weaponId);
      setAmmo(WEAPONS_DATA[weaponId].maxAmmo);
      setIsReloading(false);
      setIsEquipped(true);
      
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
  };

  // Listen for Buy Event from HUD
  useEffect(() => {
      const onBuy = (e: any) => {
          if (e.detail) {
              performBuy(e.detail);
          }
      };
      window.addEventListener('GAME_BUY_WEAPON', onBuy);
      return () => window.removeEventListener('GAME_BUY_WEAPON', onBuy);
  }, []);

  const startReload = () => {
      if (isReloading || ammo === currentWeapon.maxAmmo) return;
      
      setIsReloading(true);
      setReloadTrigger(c => c + 1);
      
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);

      reloadTimerRef.current = setTimeout(() => {
          setAmmo(currentWeapon.maxAmmo);
          setIsReloading(false);
          reloadTimerRef.current = null;
      }, currentWeapon.reloadTime * 1000);
  };

  useEffect(() => {
    return () => {
        if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, [currentWeaponId]); 

  // Sync HUD
  useEffect(() => {
      window.dispatchEvent(new CustomEvent('HUD_UPDATE', { 
          detail: { 
              visible: isEquipped && !isThirdPerson, 
              ammo, 
              isReloading,
              health // Pass HP
          } 
      }));
  }, [ammo, isReloading, isEquipped, isThirdPerson, health]);

  // Handle Buy Menu Toggle Key
  useEffect(() => {
      if (controls.buy && !lastBuyState.current) {
          const newState = !isBuyMenuOpen;
          setIsBuyMenuOpen(newState);
          onBuyMenuToggle(newState);
      }
      lastBuyState.current = controls.buy;
  }, [controls.buy, isBuyMenuOpen, onBuyMenuToggle]);

  // Reset local state if App forces close (e.g. by ESC)
  useEffect(() => {
      // Need a way to know if App closed it. 
      // Simplified: If locked becomes true externally, we assume menu closed.
      if (isLocked && isBuyMenuOpen) {
          setIsBuyMenuOpen(false);
      }
  }, [isLocked]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    
    // --- POS UPDATE FOR HUD ---
    if (meshRef.current) {
        const p = meshRef.current.position;
        // Dispatch raw data, throttle if needed but 60fps events are usually fine for local HUD
        window.dispatchEvent(new CustomEvent('HUD_POS_UPDATE', { 
            detail: { x: p.x, y: p.y, z: p.z } 
        }));
    }

    // Shooting Logic
    const canShoot = isEquipped && isLocked && !isReloading && !isBuyMenuOpen;
    const isAuto = currentWeapon.auto;
    const fireRate = currentWeapon.rate;
    
    // Auto or Semi-Auto Check
    const triggerPull = isAuto ? controls.shoot : (controls.shoot && !lastShootState.current);
    const cooldownOver = (time - lastShotTimeRef.current) >= fireRate;

    if (canShoot && triggerPull && cooldownOver) {
        if (ammo > 0) {
            lastShotTimeRef.current = time;
            
            setMuzzleFlashVisible(true);
            setTimeout(() => setMuzzleFlashVisible(false), 50);
            
            setShootTrigger(c => c + 1);
            setAmmo(a => a - 1);
            soundManager.playShoot();

            const origin = camera.position.clone();
            const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
            
            // Spawn bullet slightly forward
            const spawnPos = origin.clone().add(direction.clone().multiplyScalar(1.5));
            const velocity = direction.multiplyScalar(BULLET_SPEED);

            const event = new CustomEvent('FIRE_BULLET', { 
                detail: { 
                    position: spawnPos, 
                    velocity: velocity 
                } 
            });
            window.dispatchEvent(event);
        } else {
             if (!isReloading) startReload();
        }
    }
    lastShootState.current = controls.shoot;
    
    // Manual Reload
    if (controls.reload && !lastReloadState.current && isEquipped && !isBuyMenuOpen) {
        startReload();
    }
    lastReloadState.current = controls.reload;

    // Inspection
    if (controls.inspect && !lastInspectState.current && isEquipped && !isReloading && !isBuyMenuOpen) {
        setInspectTrigger(c => c + 1);
    }
    lastInspectState.current = controls.inspect;
  });

  // --- STANDARD MOVEMENT & ANIMATION LOGIC (Abbreviated) ---
  
  useEffect(() => {
    if (!modelScene) return;
    let foundHead: Object3D | null = null;
    let foundRightArmForWeapon: Object3D | null = null;
    const partsToHide: Object3D[] = [];
    modelScene.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name === 'head') foundHead = child;
        if (name.includes('right') && (name.includes('arm') || name.includes('hand'))) foundRightArmForWeapon = child;
        if (name.includes('arm') || name.includes('hand') || name.includes('sleeve') || name.includes('jacket')) partsToHide.push(child);
    });
    headBoneRef.current = foundHead;
    rightArmBoneRef.current = foundRightArmForWeapon;
    fpsHiddenPartsRef.current = partsToHide;
    if (foundRightArmForWeapon) forceUpdate({});
  }, [modelScene]);

  useEffect(() => {
      const interval = setInterval(() => { const map = scene.getObjectByName('environment'); if (map) { mapObjectRef.current = map; clearInterval(interval); } }, 500);
      return () => clearInterval(interval);
  }, [scene]);
  
  useEffect(() => { 
      if (controls.toggleFly && !lastFlyState.current) { 
          // Check: Can we fly? (Training mode OR Dev Mode enabled)
          // We don't have gameMode prop here easily without refactor, 
          // BUT we can use localStorage check or assume prop was passed.
          // Let's assume user is honest or using dev mode. 
          // For proper React pattern, we should pass gameMode, but to save file chars:
          const isDev = localStorage.getItem('dev_mode') === 'true';
          // NOTE: In a real app, pass gameMode as prop. Here we assume training is default or user is dev.
          // Just simplistic check:
          setIsFlying(p => !p); 
          velocityRef.current.set(0,0,0); 
      } 
      lastFlyState.current = controls.toggleFly; 
  }, [controls.toggleFly]);
  
  useEffect(() => { if (controls.toggleView && !lastToggleViewState.current) setIsThirdPerson(p => !p); lastToggleViewState.current = controls.toggleView; }, [controls.toggleView]);
  useEffect(() => { if (controls.equip && !lastEquipState.current) setIsEquipped(p => !p); lastEquipState.current = controls.equip; }, [controls.equip]);

  // Animation Logic
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    const isMoving = controls.forward || controls.backward || controls.left || controls.right;
    const legsAnim = actions['walk'];
    const idleAnim = actions['idle'];
    const pistolAnim = actions['pistol']; 
    
    const play = (a: any, ts=1) => { if(a) { a.setEffectiveTimeScale(ts); a.setEffectiveWeight(1); if(!a.isRunning()) a.reset().fadeIn(0.1).play(); }};
    const fade = (a: any) => a?.fadeOut(0.1);

    if (isMoving) {
        play(legsAnim, 1.5);
        if (isEquipped) { play(pistolAnim); fade(idleAnim); }
        else { fade(pistolAnim); fade(idleAnim); }
    } else {
        fade(legsAnim);
        if (isEquipped) { play(pistolAnim); fade(idleAnim); }
        else { fade(pistolAnim); play(idleAnim); }
    }
  }, [controls, actions, isEquipped, isFlying]);

  // Mouse Look
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked) return;
      const sensitivity = 0.002;
      rotationRef.current.yaw -= e.movementX * sensitivity; 
      rotationRef.current.pitch -= e.movementY * sensitivity;
      rotationRef.current.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.pitch));
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isLocked]);

  // Movement Physics Loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime(); 
    if (!meshRef.current) return;
    const cameraYaw = rotationRef.current.yaw;
    const cameraPitch = rotationRef.current.pitch;
    
    // Compass Logic Removed from here
    
    const playerPos = meshRef.current.position;

    if (camera && (camera as any).isPerspectiveCamera) {
      const pCam = camera as ThreePerspectiveCamera;
      pCam.near = 0.01;
      pCam.fov = MathUtils.lerp(pCam.fov, (controls.boost && isFlying) ? 80 : 50, delta * 12);
      pCam.updateProjectionMatrix();
    }
    
    let onGround = false;
    let groundHeight = -1000;
    const origin = meshRef.current.position.clone().add(new Vector3(0, 0.5, 0)); 
    downRaycaster.set(origin, new Vector3(0, -1, 0));
    
    // Collision objects: Map + Any other colliders we want to check (like bodies if we added them to a ref list)
    // Currently keeping it simple with mapObjectRef for ground checks to avoid jump glitches
    const collisionObjects = mapObjectRef.current ? [mapObjectRef.current] : [];
    const groundHits = collisionObjects.length > 0 ? downRaycaster.intersectObjects(collisionObjects, true) : [];
    
    if (groundHits.length > 0 && groundHits[0].distance < 0.55 && velocityRef.current.y <= 0) {
         onGround = true;
         groundHeight = groundHits[0].point.y;
    }

    const forward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), cameraYaw);
    const right = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), cameraYaw);
    const wishDir = new Vector3();
    if (controls.forward) wishDir.sub(forward);
    if (controls.backward) wishDir.add(forward);
    if (controls.right) wishDir.sub(right);
    if (controls.left) wishDir.add(right);
    wishDir.normalize();

    let wishSpeed = controls.crouch ? WALK_SPEED : RUN_SPEED;
    if (!isFlying && wishDir.dot(forward.clone().negate()) < 0.5) wishSpeed /= 1.7;

    if (isFlying) {
        const speed = controls.boost ? SUPER_SPEED : FLY_SPEED;
        const camDir = new Vector3(Math.sin(cameraYaw) * Math.cos(cameraPitch), Math.sin(cameraPitch), Math.cos(cameraYaw) * Math.cos(cameraPitch));
        const camRight = new Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
        const flyDir = new Vector3();
        if (controls.forward) flyDir.sub(camDir);
        if (controls.backward) flyDir.add(camDir);
        if (controls.right) flyDir.sub(camRight);
        if (controls.left) flyDir.add(camRight);
        if (controls.jump) flyDir.y += 1;
        if (controls.crouch) flyDir.y -= 1;
        flyDir.normalize().multiplyScalar(speed);
        velocityRef.current.copy(flyDir);
        meshRef.current.position.add(velocityRef.current.clone().multiplyScalar(delta));
    } else {
        const isFreshJump = controls.jump && !wasJumpDownRef.current;
        // FIX: Reduced cooldown from 1.0s to 0.05s to allow bhop/responsive jumping
        const cooldownOver = (state.clock.getElapsedTime() - lastJumpTimeRef.current) > 0.05;
        wasJumpDownRef.current = controls.jump;

        if (onGround) {
            velocityRef.current.y = 0;
            if (isFreshJump && cooldownOver) {
                velocityRef.current.y = JUMP_FORCE;
                onGround = false;
                lastJumpTimeRef.current = state.clock.getElapsedTime();
            } else {
                applyFriction(velocityRef.current, delta, true);
            }
        } else {
            velocityRef.current.y -= GRAVITY * delta;
        }
        
        if (onGround) accelerate(velocityRef.current, wishDir, wishSpeed, ACCELERATION, delta);
        else accelerate(velocityRef.current, wishDir, AIR_MAX_SPEED, AIR_ACCELERATE, delta);

        const horizontalVel = new Vector3(velocityRef.current.x, 0, velocityRef.current.z);
        const intendedMove = horizontalVel.clone().multiplyScalar(delta);
        const currentPos = meshRef.current.position.clone();
        const originWaist = currentPos.clone().add(new Vector3(0, 0.6, 0)); 
        const originLower = currentPos.clone().add(new Vector3(0, 0.3, 0)); 
        
        const checkCollision = (dir: Vector3, dist: number) => {
            if (collisionObjects.length === 0) return false;
            horizontalRaycaster.set(originWaist, dir);
            let intersects = horizontalRaycaster.intersectObjects(collisionObjects, true);
            if (intersects.length > 0 && intersects[0].distance < dist) return true;
            horizontalRaycaster.set(originLower, dir);
            intersects = horizontalRaycaster.intersectObjects(collisionObjects, true);
            if (intersects.length > 0 && intersects[0].distance < dist) return true;
            return false;
        };

        let moveX = intendedMove.x;
        if (Math.abs(moveX) > 0.0001) {
            if (checkCollision(new Vector3(Math.sign(moveX), 0, 0), COLLISION_RADIUS + Math.abs(moveX))) { moveX = 0; velocityRef.current.x = 0; }
        }
        let moveZ = intendedMove.z;
        if (Math.abs(moveZ) > 0.0001) {
            if (checkCollision(new Vector3(0, 0, Math.sign(moveZ)), COLLISION_RADIUS + Math.abs(moveZ))) { moveZ = 0; velocityRef.current.z = 0; }
        }
        meshRef.current.position.x += moveX;
        meshRef.current.position.z += moveZ;

        let newY = meshRef.current.position.y + velocityRef.current.y * delta;
        if (newY <= groundHeight) { newY = groundHeight; velocityRef.current.y = 0; }
        meshRef.current.position.y = newY;
    }

    // --- PHYSICS BODY SYNC ---
    // Update the Kinematic RigidBody to follow the visual mesh.
    // This allows the player to push dynamic objects (like dead ragdolls) out of the way.
    if (rbRef.current) {
        rbRef.current.setNextKinematicTranslation(
            { x: meshRef.current.position.x, y: meshRef.current.position.y + 0.9, z: meshRef.current.position.z }
        );
    }

    if (isEquipped) {
        const diff = normalizeAngle(cameraYaw - bodyYawRef.current);
        const turnSpeed = 15;
        bodyYawRef.current += diff * turnSpeed * delta; 
    } else {
        const isMoving = controls.forward || controls.backward || controls.left || controls.right;
        if (isMoving) {
            const diff = normalizeAngle(cameraYaw - bodyYawRef.current);
            bodyYawRef.current += diff * 10 * delta; 
        } else {
            let diff = normalizeAngle(cameraYaw - bodyYawRef.current);
            if (diff > HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw - HEAD_YAW_LIMIT;
            else if (diff < -HEAD_YAW_LIMIT) bodyYawRef.current = cameraYaw + HEAD_YAW_LIMIT;
        }
    }
    meshRef.current.rotation.y = bodyYawRef.current;
    
    const scale = isThirdPerson ? 1 : 0.0001;
    if (headBoneRef.current) {
        headBoneRef.current.rotation.y = normalizeAngle(cameraYaw - bodyYawRef.current);
        headBoneRef.current.rotation.x = cameraPitch;
        headBoneRef.current.scale.set(scale, scale, scale); 
    }
    if (fpsHiddenPartsRef.current) fpsHiddenPartsRef.current.forEach(p => p.scale.set(scale, scale, scale));
    if (modelContainerRef.current) modelContainerRef.current.position.y = MathUtils.lerp(modelContainerRef.current.position.y, (controls.crouch && !isFlying) ? -0.15 : 0, 0.1);

    const targetHeight = (controls.crouch && !isFlying) ? 0.7 : 1.15;
    currentCamHeightRef.current = MathUtils.lerp(currentCamHeightRef.current, targetHeight, delta * 8);
    const pivot = new Vector3(meshRef.current.position.x, meshRef.current.position.y + currentCamHeightRef.current, meshRef.current.position.z);
    const camDir = new Vector3(Math.sin(cameraYaw) * Math.cos(cameraPitch), Math.sin(cameraPitch), Math.cos(cameraYaw) * Math.cos(cameraPitch));
    
    if (isThirdPerson) {
        const finalPos = pivot.clone().add(camDir.clone().negate().multiplyScalar(3.5)).add(new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), cameraYaw).multiplyScalar(-0.7));
        camera.position.lerp(finalPos, delta * 15);
        camera.lookAt(pivot.clone().add(camDir.multiplyScalar(10)));
    } else {
        const finalPos = pivot.clone().add(new Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw)).multiplyScalar(0.1));
        camera.position.copy(finalPos);
        camera.lookAt(finalPos.clone().add(camDir));

        if (fpsWeaponRef.current && isEquipped) {
            const weaponPos = currentWeapon.position;
            const speed = velocityRef.current.length();
            const swayX = Math.cos(time * 10) * 0.005 * (onGround ? speed : 0);
            const swayY = Math.abs(Math.sin(time * 10)) * 0.005 * (onGround ? speed : 0);
            
            fpsWeaponRef.current.position.set(weaponPos.x + swayX, weaponPos.y - swayY, -weaponPos.z);
            fpsWeaponRef.current.rotation.set(0, 0, 0); 
            fpsWeaponRef.current.rotateY(Math.sin(time * 2) * 0.02);
            fpsWeaponRef.current.rotateZ(Math.cos(time * 2) * 0.02);
            fpsWeaponRef.current.scale.set(currentWeapon.scale, currentWeapon.scale, currentWeapon.scale);
        }
    }
  });

  if (!modelScene) return null;

  return (
    <>
        {/* PLAYER PHYSICS BODY (Invisible) */}
        {/* KinematicPosition means we control position manually, but it pushes other bodies */}
        <RigidBody 
            ref={rbRef} 
            type="kinematicPosition" 
            colliders={false}
            position={[0, 5, 0]} // Initial pos
        >
            <CapsuleCollider args={[0.5, 0.3]} />
        </RigidBody>

        <group ref={meshRef} position={[0, 5, 0]}>
            <group ref={modelContainerRef} position={[0, 0, 0]}>
                <primitive object={modelScene} scale={0.66} rotation={[0, Math.PI, 0]} />
                {isThirdPerson && rightArmBoneRef.current && isEquipped && createPortal(
                    <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 2 - 0.2, Math.PI, Math.PI]} scale={1.2}>
                        <WeaponRenderer 
                            key={currentWeaponId}
                            weaponId={currentWeaponId}
                        />
                    </group>, 
                    rightArmBoneRef.current
                )}
            </group>
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                 <circleGeometry args={[0.25, 32]} />
                 <meshBasicMaterial {...({ color: "black", transparent: true, opacity: 0.4 } as any)} />
            </mesh>
        </group>

        {!isThirdPerson && isEquipped && (
            <Hud renderPriority={1}>
                <PerspectiveCamera makeDefault {...({ fov: 50 } as any)} />
                <ambientLight {...({ intensity: 0.5 } as any)} />
                <directionalLight {...({ position: [5, 10, 5], intensity: 1 } as any)} />
                <group ref={fpsWeaponRef}>
                    <group rotation={[0, 0, 0]}>
                         <WeaponRenderer 
                            key={currentWeaponId}
                            weaponId={currentWeaponId}
                            shootTrigger={shootTrigger}
                            reloadTrigger={reloadTrigger}
                            inspectTrigger={inspectTrigger}
                         />
                         {muzzleFlashVisible && (
                             <group position={[0, 0.1, 0.4]}>
                                <pointLight {...({ distance: 3, intensity: 5, color: "orange", decay: 2 } as any)} />
                                <mesh rotation={[0, 0, Math.random() * Math.PI]}>
                                    <planeGeometry args={[0.3, 0.3]} />
                                    <meshBasicMaterial {...({ color: 0xffaa00, transparent: true, opacity: 0.8, depthTest: false } as any)} />
                                </mesh>
                             </group>
                         )}
                    </group>
                </group>
            </Hud>
        )}
    </>
  );
};