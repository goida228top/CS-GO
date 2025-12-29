import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Vector3, Object3D, MathUtils } from 'three';
import { PLAYER_MODEL_URL, WEAPONS_DATA } from './constants';
import { SkeletonUtils } from 'three-stdlib';
import { useFrame, createPortal } from '@react-three/fiber';
import { WeaponRenderer } from './WeaponRenderer';

interface NetworkPlayerProps {
    id: string;
    position: { x: number, y: number, z: number };
    rotation: { y: number };
    color: string;
    nickname: string;
    weapon: string; // 'pistol' | 'ak47'
    team: string;
    animState?: { isCrouching: boolean, isMoving: boolean }; // New Prop
}

export const NetworkPlayer: React.FC<NetworkPlayerProps> = ({ 
    position, 
    rotation, 
    color, 
    nickname, 
    team, 
    weapon,
    animState = { isCrouching: false, isMoving: false }
}) => {
    // 1. Load Model & Animations
    const { scene, animations } = useGLTF(PLAYER_MODEL_URL);
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const groupRef = useRef<any>(null);
    const modelRef = useRef<any>(null); // Inner ref for model animations
    
    // 2. Setup Animation Mixer on the CLONED model
    const { actions } = useAnimations(animations, modelRef);
    
    // 3. Find Right Hand Bone for Weapon Attachment
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
    const targetPos = useRef(new Vector3(position.x, position.y, position.z));
    const targetRot = useRef(rotation.y);
    const modelOffset = useRef(0);

    // Update targets on prop change
    useEffect(() => {
        targetPos.current.set(position.x, position.y, position.z);
        targetRot.current = rotation.y;
    }, [position, rotation]);

    // --- ANIMATION LOGIC ---
    useEffect(() => {
        if (!actions) return;
        
        // Define animation names based on user screenshot:
        // walk, hand_walk, pistol, pistol_aim, shift, shift_walk
        
        const isCrouching = animState.isCrouching;
        const isMoving = animState.isMoving;

        // Determine which animation to play
        let animToPlay = 'pistol'; // Default Idle
        
        if (isMoving) {
            if (isCrouching) animToPlay = 'shift_walk';
            else animToPlay = 'walk';
        } else {
            if (isCrouching) animToPlay = 'shift';
            else animToPlay = 'pistol'; // Or pistol_aim
        }

        // Helper to fade in/out
        const play = (name: string) => {
            if (!actions[name]) {
                // Fallback if specific anim missing
                // console.warn("Missing anim:", name);
                return;
            }
            
            // Fade out all others
            Object.keys(actions).forEach(key => {
                if (key !== name && actions[key]?.isRunning()) {
                    actions[key]?.fadeOut(0.2);
                }
            });

            const action = actions[name];
            if (!action.isRunning()) {
                action.reset().fadeIn(0.2).play();
            }
        };

        play(animToPlay);
        
        // Crouch Height Adjustment (Visual only)
        modelOffset.current = isCrouching ? -0.15 : 0;

    }, [animState, actions]);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Smooth Position
            groupRef.current.position.lerp(targetPos.current, delta * 20); // Fast lerp for responsiveness (30hz updates)
            
            // Smooth Rotation
            let currentRot = groupRef.current.rotation.y;
            let diff = targetRot.current - currentRot;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            groupRef.current.rotation.y += diff * delta * 15;
        }

        if (modelRef.current) {
             // Smooth crouch height
             modelRef.current.position.y = MathUtils.lerp(modelRef.current.position.y, modelOffset.current, delta * 10);
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
                {rightHandBone && createPortal(
                    <group position={[0, -0.65, 0.15]} rotation={[Math.PI / 2 - 0.2, Math.PI, Math.PI]} scale={1.2}>
                        <WeaponRenderer 
                            key={weapon} // Re-mount if weapon changes
                            weaponId={weapon as 'pistol' | 'ak47'} 
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