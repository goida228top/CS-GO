import React, { useMemo, useRef, useState } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Object3D, MathUtils } from 'three';
import { PLAYER_MODEL_URL } from './constants';
import { SkeletonUtils } from 'three-stdlib';
import { useFrame, createPortal } from '@react-three/fiber';
import { WeaponRenderer } from './WeaponRenderer';
import { socketManager } from './SocketManager'; 

interface NetworkPlayerProps {
    id: string;
    // Initial props 
    position: { x: number, y: number, z: number };
    rotation: { y: number };
    color: string;
    nickname: string;
    weapon: string; 
    team: string;
    animState?: { isCrouching: boolean, isMoving: boolean }; 
}

export const NetworkPlayer: React.FC<NetworkPlayerProps> = ({ 
    id,
    position, 
    rotation, 
    color, 
    nickname, 
    team, 
    weapon: initialWeapon,
}) => {
    // 1. Load Model & Animations
    const { scene, animations } = useGLTF(PLAYER_MODEL_URL);
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const groupRef = useRef<any>(null);
    const modelRef = useRef<any>(null);
    
    // 2. Setup Animation Mixer
    const { actions } = useAnimations(animations, modelRef);
    
    // 3. Find Right Hand Bone
    const rightHandBone = useMemo(() => {
        let bone: Object3D | null = null;
        clone.traverse((child) => {
             if (child.name.toLowerCase().includes('right') && (child.name.toLowerCase().includes('arm') || child.name.toLowerCase().includes('hand'))) {
                 bone = child;
             }
        });
        return bone;
    }, [clone]);

    const targetPos = useRef(new Vector3(position.x, position.y, position.z));
    const targetRot = useRef(rotation.y);
    const animStateRef = useRef({ isCrouching: false, isMoving: false });

    // Local state for Weapon to trigger re-render of portal
    const [activeWeapon, setActiveWeapon] = useState<string>(initialWeapon);
    // Local state for Shoot trigger
    const [shootTrigger, setShootTrigger] = useState(0);

    // Track previous trigger to detect change
    const lastShootTriggerRef = useRef(0);

    // --- DIRECT UPDATE LOOP ---
    useFrame((state, delta) => {
        // 1. FETCH LATEST DATA
        const latestData = socketManager.otherPlayers[id];
        
        if (latestData) {
            targetPos.current.set(latestData.position.x, latestData.position.y, latestData.position.z);
            targetRot.current = latestData.rotation.y;
            
            // Sync Weapon Type
            if (latestData.weapon !== activeWeapon) {
                setActiveWeapon(latestData.weapon);
            }

            // Sync Shooting
            if (latestData.shootTrigger && latestData.shootTrigger > lastShootTriggerRef.current) {
                setShootTrigger(prev => prev + 1);
                lastShootTriggerRef.current = latestData.shootTrigger;
            }

            if (latestData.animState) {
                animStateRef.current = latestData.animState;
            }
        }

        // 2. SMOOTH INTERPOLATION (LERP)
        if (groupRef.current) {
            groupRef.current.position.lerp(targetPos.current, delta * 20); 
            
            let currentRot = groupRef.current.rotation.y;
            let diff = targetRot.current - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            groupRef.current.rotation.y += diff * delta * 15;
        }

        // 3. ANIMATION STATE LOGIC
        if (modelRef.current) {
             const isCrouch = animStateRef.current.isCrouching;
             const offsetTarget = isCrouch ? -0.15 : 0;
             modelRef.current.position.y = MathUtils.lerp(modelRef.current.position.y, offsetTarget, delta * 10);
        }

        // 4. TRIGGER BODY ANIMATIONS
        if (actions) {
            const isMoving = animStateRef.current.isMoving;
            const isCrouching = animStateRef.current.isCrouching;
            
            let animToPlay = 'pistol'; // default idle
            
            // Check if we have a weapon
            if (activeWeapon === 'none') {
                // If no weapon, ideally play 'idle' or 'walk' without pistol pose
                // For now, reusing pistol anims or specific if available
                animToPlay = isMoving ? 'walk' : 'idle';
            } else {
                if (isMoving) {
                    animToPlay = isCrouching ? 'shift_walk' : 'walk';
                } else {
                    animToPlay = isCrouching ? 'shift' : 'pistol';
                }
            }

            const action = actions[animToPlay];
            if (action && !action.isRunning()) {
                Object.keys(actions).forEach(key => {
                    if (key !== animToPlay && actions[key]?.isRunning()) {
                         actions[key]?.fadeOut(0.2);
                    }
                });
                action.reset().fadeIn(0.2).play();
            }
        }
    });

    return (
        <group ref={groupRef} position={[position.x, position.y, position.z]}>
            {/* Nickname Tag */}
            <mesh position={[0, 2.3, 0]}>
                <planeGeometry args={[1, 0.25]} />
                <meshBasicMaterial color="black" transparent opacity={0.5} />
            </mesh>
            
            {/* Visual Model Container */}
            <group ref={modelRef}>
                <primitive object={clone} scale={0.66} rotation={[0, Math.PI, 0]} />
                
                {/* WEAPON ATTACHMENT */}
                {rightHandBone && activeWeapon !== 'none' && createPortal(
                    <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 2 - 0.2, Math.PI, Math.PI]} scale={1.2}>
                        <WeaponRenderer 
                            key={activeWeapon} // Remount on weapon swap
                            weaponId={activeWeapon as 'pistol' | 'ak47'} 
                            shootTrigger={shootTrigger} // Pass trigger to renderer
                        />
                        {/* Muzzle Flash for remote players */}
                        <MuzzleFlash trigger={shootTrigger} />
                    </group>,
                    rightHandBone
                )}
            </group>
            
            {/* Team/Color Indicator */}
            <mesh position={[0, 2.5, 0]}>
                 <sphereGeometry args={[0.1]} />
                 <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
};

// Simple Muzzle Flash Component
const MuzzleFlash = ({ trigger }: { trigger: number }) => {
    const [visible, setVisible] = useState(false);
    
    // On trigger change, flash on then off
    React.useEffect(() => {
        if (trigger > 0) {
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 50);
            return () => clearTimeout(t);
        }
    }, [trigger]);

    if (!visible) return null;

    return (
         <group position={[0, 0.1, 0.5]}>
            <pointLight distance={3} intensity={5} color="orange" decay={2} />
            <mesh rotation={[0, 0, Math.random() * Math.PI]}>
                <planeGeometry args={[0.4, 0.4]} />
                <meshBasicMaterial color={0xffaa00} transparent opacity={0.8} depthTest={false} />
            </mesh>
         </group>
    );
};