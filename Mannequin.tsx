
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Vector3, LoopRepeat } from 'three';
import { ThreeElements } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Ragdoll } from './Ragdoll';
import { Hitbox } from './Hitbox';
import { PLAYER_MODEL_URL, BODY_HALF_SIZE, HEAD_HALF_SIZE, LIMB_HALF_SIZE } from './constants';

// Храним простые массивы
const deadMannequins = new Map<string, [number, number, number]>();

export const Mannequin = ({ id, position }: { id: string, position: [number, number, number] }) => {
    const [isDead, setIsDead] = useState(() => deadMannequins.has(id));
    // Стейт силы удара - массив
    const [hitForce, setHitForce] = useState<[number, number, number]>(() => deadMannequins.get(id) || [0,0,0]);
    const groupRef = useRef<any>(null);

    const { scene, animations = [] } = useGLTF(PLAYER_MODEL_URL);
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    const { actions } = useAnimations(animations, groupRef);

    // Cheat State
    const [showEsp, setShowEsp] = useState(window.CHEATS?.esp || false);

    useEffect(() => {
        const updateCheats = () => {
            setShowEsp(window.CHEATS.esp);
        };
        window.addEventListener('CHEAT_UPDATE', updateCheats);
        return () => window.removeEventListener('CHEAT_UPDATE', updateCheats);
    }, []);

    useEffect(() => {
        if (!isDead && actions && actions['idle']) {
            actions['idle'].reset().play();
            actions['idle'].setLoop(LoopRepeat, Infinity);
        }
    }, [actions, isDead]);

    useEffect(() => {
        const onHit = (e: any) => {
            if (e.detail.id === id && !isDead) {
                // Получаем массив [x, y, z] из события
                const forceArr = e.detail.force as [number, number, number];
                setHitForce(forceArr);
                setIsDead(true);
                deadMannequins.set(id, forceArr);
            }
        };

        const onRespawn = () => {
            setIsDead(false);
            deadMannequins.delete(id);
            setHitForce([0,0,0]);
        };

        window.addEventListener('MANNEQUIN_HIT', onHit);
        window.addEventListener('RESPAWN_ALL', onRespawn);
        return () => {
            window.removeEventListener('MANNEQUIN_HIT', onHit);
            window.removeEventListener('RESPAWN_ALL', onRespawn);
        };
    }, [id, isDead]);

    // FIX: Memoize vectors so they stay referentially stable even if App re-renders.
    const velocityVec = useMemo(() => new Vector3(hitForce[0], hitForce[1], hitForce[2]), [hitForce]);
    const posVec = useMemo(() => new Vector3(position[0], position[1], position[2]), [position[0], position[1], position[2]]);

    if (isDead) {
        return (
            <Ragdoll 
                id={id} // Pass ID for bullet interaction
                position={posVec} 
                initialVelocity={velocityVec} 
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

    const boxColor = "#ffaa00"; // Terrorist color for dummy

    return (
        <group ref={groupRef} position={position} userData={{ isMannequin: true, id: id }}>
            
            {/* ESP OVERLAY */}
            {showEsp && (
                <Html position={[0, 0.9, 0]} center occlude={false} distanceFactor={15} zIndexRange={[100, 0]}>
                    <div className="relative w-14 h-32 pointer-events-none select-none">
                        <div 
                            className="absolute inset-0 border-2"
                            style={{ 
                                borderColor: boxColor,
                                boxShadow: `0 0 10px ${boxColor}, inset 0 0 5px ${boxColor}20`
                            }}
                        ></div>
                        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gray-800">
                             <div className="absolute bottom-0 left-0 w-full bg-green-500" style={{ height: '100%' }}></div>
                        </div>
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white whitespace-nowrap drop-shadow-md">
                            DUMMY
                        </div>
                    </div>
                </Html>
            )}

            <RigidBody type="fixed" colliders={false}>
                 <Hitbox name="body" position={bodyPos} args={BODY_HALF_SIZE} />
                 <Hitbox name="head" position={headPos} args={HEAD_HALF_SIZE} />
                 <Hitbox name="legLeft" position={legLeftPos} args={LIMB_HALF_SIZE} />
                 <Hitbox name="legRight" position={legRightPos} args={LIMB_HALF_SIZE} />
                 <Hitbox name="armLeft" position={armLeftPos} args={LIMB_HALF_SIZE} />
                 <Hitbox name="armRight" position={armRightPos} args={LIMB_HALF_SIZE} />
            </RigidBody>
            <primitive object={clonedScene} scale={0.66} />
        </group>
    );
};