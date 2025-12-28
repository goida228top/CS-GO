import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Vector3 } from 'three';
import { PLAYER_MODEL_URL } from './constants';
import { SkeletonUtils } from 'three-stdlib';
import { useFrame } from '@react-three/fiber';

interface NetworkPlayerProps {
    id: string;
    position: { x: number, y: number, z: number };
    rotation: { y: number };
    color: string;
    nickname: string;
    weapon: string;
    team: string;
}

export const NetworkPlayer: React.FC<NetworkPlayerProps> = ({ position, rotation, color, nickname, team }) => {
    const { scene } = useGLTF(PLAYER_MODEL_URL);
    // Клонируем модель, чтобы у каждого врага была своя
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    
    const groupRef = useRef<any>(null);
    const targetPos = useRef(new Vector3(position.x, position.y, position.z));
    const targetRot = useRef(rotation.y);

    // Update refs when props change
    useEffect(() => {
        targetPos.current.set(position.x, position.y, position.z);
        targetRot.current = rotation.y;
    }, [position, rotation]);

    useFrame((state, delta) => {
        if (groupRef.current) {
            // Простая интерполяция (Lerp) для плавности
            groupRef.current.position.lerp(targetPos.current, delta * 10);
            
            // Интерполяция вращения (простой вариант)
            let currentRot = groupRef.current.rotation.y;
            let diff = targetRot.current - currentRot;
            // Normalize angle
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            
            groupRef.current.rotation.y += diff * delta * 10;
        }
    });

    return (
        <group ref={groupRef} position={[position.x, position.y, position.z]}>
            {/* Nickname Tag */}
            <mesh position={[0, 2.2, 0]}>
                <planeGeometry args={[1, 0.25]} />
                <meshBasicMaterial color="black" transparent opacity={0.5} />
                <group position={[0, 0, 0.01]}>
                     {/* Text would be better with 'Text' from drei, but keeping it simple geometry for now or simple marker */}
                </group>
            </mesh>
            
            {/* Visual Model */}
            <primitive object={clone} scale={0.66} rotation={[0, Math.PI, 0]} />
            
            {/* Team/Color Indicator */}
            <mesh position={[0, 2.4, 0]}>
                 <sphereGeometry args={[0.1]} />
                 <meshBasicMaterial color={color} />
            </mesh>
        </group>
    );
};