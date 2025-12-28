import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider, useSphericalJoint, RapierRigidBody } from '@react-three/rapier';
import { Vector3, Object3D } from 'three';
import { SkeletonUtils } from 'three-stdlib'; 
import { PLAYER_MODEL_URL, S, BODY_HALF_SIZE, HEAD_HALF_SIZE, LIMB_HALF_SIZE } from './constants';

// FIX: Wrap in React.memo to prevent re-renders when UI changes (pause/buy menu).
// This ensures dead bodies stay where they fell.
export const Ragdoll = React.memo(({ 
    position, 
    initialVelocity = new Vector3(0,0,0),
}: { 
    position: Vector3, 
    initialVelocity?: Vector3,
}) => {
  const { scene } = useGLTF(PLAYER_MODEL_URL);

  const [debugVisible, setDebugVisible] = useState(() => 
      typeof window !== 'undefined' && window.GAME_SETTINGS ? window.GAME_SETTINGS.showHitboxes : false
  );

  useEffect(() => {
      const checkSettings = () => {
          if (window.GAME_SETTINGS) setDebugVisible(window.GAME_SETTINGS.showHitboxes);
      };
      window.addEventListener('SETTINGS_CHANGED', checkSettings);
      return () => window.removeEventListener('SETTINGS_CHANGED', checkSettings);
  }, []);

  const modelParts = useMemo(() => {
    if (!scene) return {};
    const clone = SkeletonUtils.clone(scene); 
    const parts: { [key: string]: Object3D } = {};
    
    clone.traverse((child) => {
      if (child.type === 'Mesh') {
        child.position.set(0, 0, 0); 
        child.rotation.set(0, 0, 0);
        child.scale.set(S, S, S); 
        
        const name = child.name.toLowerCase();
        if (name.includes('head')) parts.head = child;
        else if (name.includes('body') || name.includes('torso')) parts.body = child;
        else if (name.includes('arm') && name.includes('left')) parts.armL = child;
        else if (name.includes('arm') && name.includes('right')) parts.armR = child;
        else if (name.includes('leg') && name.includes('left')) parts.legL = child;
        else if (name.includes('leg') && name.includes('right')) parts.legR = child;
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
        const timeout = setTimeout(() => {
            const refs = [bodyRef, headRef, armLRef, armRRef, legLRef, legRRef];
            refs.forEach(ref => {
                if(ref.current) {
                    try {
                        ref.current.applyImpulse(initialVelocity, true);
                    } catch (e) {
                        console.warn("Could not apply impulse to ragdoll part", e);
                    }
                }
            });
        }, 50);
        return () => clearTimeout(timeout);
    }
  }, [initialVelocity]);

  const BodyPart = ({ partRef, position, halfSize, model, visualOffset, visibleDebug }: any) => (
    <RigidBody 
        ref={partRef} 
        colliders={false} 
        position={[position.x, position.y, position.z]} 
        mass={2} 
        friction={0.5}
    >
        <CuboidCollider args={[halfSize.x * 0.9, halfSize.y * 0.9, halfSize.z * 0.9]} />
        <mesh visible={visibleDebug}>
            <boxGeometry args={[halfSize.x * 2, halfSize.y * 2, halfSize.z * 2]} />
            <meshBasicMaterial {...({ color: "lime", wireframe: true, visible: true } as any)} />
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
        <BodyPart partRef={bodyRef} position={bodyPos} halfSize={BODY_HALF_SIZE} model={modelParts.body} visualOffset={relativePositions.body.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partRef={headRef} position={headPos} halfSize={HEAD_HALF_SIZE} model={modelParts.head} visualOffset={relativePositions.head.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partRef={armLRef} position={armLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armL} visualOffset={relativePositions.armL.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partRef={armRRef} position={armRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armR} visualOffset={relativePositions.armR.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partRef={legLRef} position={legLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legL} visualOffset={relativePositions.legL.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partRef={legRRef} position={legRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legR} visualOffset={relativePositions.legR.clone().negate()} visibleDebug={debugVisible} />
    </group>
  );
});