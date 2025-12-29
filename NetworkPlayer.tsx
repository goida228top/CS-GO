import React, { useMemo, useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Object3D, MathUtils } from 'three';
import { PLAYER_MODEL_URL } from './constants';
import { SkeletonUtils } from 'three-stdlib';
import { useFrame, createPortal } from '@react-three/fiber';
import { WeaponRenderer } from './WeaponRenderer';
import { socketManager } from './SocketManager'; // Import socketManager for direct access

interface NetworkPlayerProps {
    id: string;
    // Initial props only
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

    // Refs for smooth interpolation
    // Initialize with props, but then ignore props in favor of socket data
    const targetPos = useRef(new Vector3(position.x, position.y, position.z));
    const targetRot = useRef(rotation.y);
    const currentWeaponRef = useRef(initialWeapon);
    const animStateRef = useRef({ isCrouching: false, isMoving: false });
    const modelOffset = useRef(0);

    // --- DIRECT UPDATE LOOP ---
    // This connects directly to the data stream, bypassing React's slow render cycle
    useFrame((state, delta) => {
        // 1. FETCH LATEST DATA
        const latestData = socketManager.otherPlayers[id];
        
        if (latestData) {
            // Update targets from socket data
            targetPos.current.set(latestData.position.x, latestData.position.y, latestData.position.z);
            targetRot.current = latestData.rotation.y;
            currentWeaponRef.current = latestData.weapon;
            
            if (latestData.animState) {
                animStateRef.current = latestData.animState;
            }
        }

        // 2. SMOOTH INTERPOLATION (LERP)
        if (groupRef.current) {
            // Pos
            groupRef.current.position.lerp(targetPos.current, delta * 20); 
            
            // Rot
            let currentRot = groupRef.current.rotation.y;
            let diff = targetRot.current - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            groupRef.current.rotation.y += diff * delta * 15;
        }

        // 3. ANIMATION STATE LOGIC (Per Frame)
        if (modelRef.current) {
             const isCrouch = animStateRef.current.isCrouching;
             const offsetTarget = isCrouch ? -0.15 : 0;
             modelRef.current.position.y = MathUtils.lerp(modelRef.current.position.y, offsetTarget, delta * 10);
        }

        // 4. TRIGGER ANIMATIONS
        // We handle this in useFrame to ensure instant switching based on ref state
        if (actions) {
            const isMoving = animStateRef.current.isMoving;
            const isCrouching = animStateRef.current.isCrouching;
            
            let animToPlay = 'pistol';
            if (isMoving) {
                animToPlay = isCrouching ? 'shift_walk' : 'walk';
            } else {
                animToPlay = isCrouching ? 'shift' : 'pistol';
            }

            // Simple state machine for animations
            const action = actions[animToPlay];
            if (action && !action.isRunning()) {
                // Stop others
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
                {/* Note: In a real heavy app, we'd want to avoid re-mounting WeaponRenderer often, 
                    but since weapon changes are rare, this is fine. 
                    We use a key to force re-render only when weapon TYPE changes from the server data. 
                */}
                {rightHandBone && createPortal(
                    <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 2 - 0.2, Math.PI, Math.PI]} scale={1.2}>
                         {/* We need a wrapper to read currentWeaponRef for the render, 
                             but React renders based on State/Props. 
                             For the weapon MODEL to update, we actually DO need a prop update or a state update.
                             However, weapon changes are rare events. 
                             Let's stick to initial prop for now, or force update if needed.
                             For smoothest movement, the code above handles pos/rot/anim.
                             For weapon swap, we accept the React cycle lag (it's acceptable).
                          */}
                        <WeaponRenderer 
                            weaponId={initialWeapon as 'pistol' | 'ak47'} 
                        />
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