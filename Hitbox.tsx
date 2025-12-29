import React, { useState, useEffect } from 'react';
import { ThreeElements } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';

export const Hitbox = ({ position, args, name }: { position: [number, number, number], args: { x: number, y: number, z: number }, name?: string }) => {
    const [visible, setVisible] = useState(() => 
        typeof window !== 'undefined' && window.GAME_SETTINGS ? window.GAME_SETTINGS.showHitboxes : false
    );

    useEffect(() => {
        const checkSettings = () => {
             if (window.GAME_SETTINGS) setVisible(window.GAME_SETTINGS.showHitboxes);
        };
        window.addEventListener('SETTINGS_CHANGED', checkSettings);
        return () => window.removeEventListener('SETTINGS_CHANGED', checkSettings);
    }, []);

    return (
        <>
          <CuboidCollider position={position} args={[args.x, args.y, args.z]} />
          <mesh name={name} position={position} renderOrder={1} visible={visible}>
            <boxGeometry args={[args.x * 2, args.y * 2, args.z * 2]} />
            <meshBasicMaterial {...({ 
                color: "lime", 
                wireframe: true, 
                depthTest: false, 
                depthWrite: false, 
                toneMapped: false 
            } as any)} />
          </mesh>
        </>
    );
};