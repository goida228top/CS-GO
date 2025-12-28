import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CapsuleCollider, useSphericalJoint, RapierRigidBody } from '@react-three/rapier';
import { Vector3, Object3D } from 'three';
import { SkeletonUtils } from 'three-stdlib'; 
import { PLAYER_MODEL_URL, S, BODY_HALF_SIZE, HEAD_HALF_SIZE, LIMB_HALF_SIZE } from './constants';

// FIX: Wrap in React.memo to prevent re-renders when UI changes (pause/buy menu).
export const Ragdoll = React.memo(({ 
    id,
    position, 
    initialVelocity = new Vector3(0,0,0),
}: { 
    id: string,
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

  // Initial velocity from killing blow
  useEffect(() => {
    if (initialVelocity.lengthSq() > 0.0001) {
        const timeout = setTimeout(() => {
            // Apply mainly to body for better flight
            if(bodyRef.current) bodyRef.current.applyImpulse(initialVelocity, true);
            // And a bit to head for rotation
            if(headRef.current) headRef.current.applyImpulse(initialVelocity.clone().multiplyScalar(0.2), true);
        }, 50);
        return () => clearTimeout(timeout);
    }
  }, [initialVelocity]);

  // --- INTERACTIVE RAGDOLL LOGIC ---
  useEffect(() => {
      const handleRagdollHit = (e: any) => {
          if (!e.detail || e.detail.ragdollId !== id) return;
          
          const { partName, force, point } = e.detail;
          const impulse = new Vector3(force[0], force[1], force[2]);
          
          // Map part name to ref
          let targetRef = bodyRef; // default
          if (partName.includes('head')) targetRef = headRef;
          else if (partName.includes('arml')) targetRef = armLRef;
          else if (partName.includes('armr')) targetRef = armRRef;
          else if (partName.includes('legl')) targetRef = legLRef;
          else if (partName.includes('legr')) targetRef = legRRef;

          if (targetRef.current) {
              // Apply impulse at specific point to create rotation/spin
              const impulsePoint = new Vector3(point[0], point[1], point[2]);
              targetRef.current.applyImpulseAtPoint(impulse, impulsePoint, true);
          }
      };

      window.addEventListener('RAGDOLL_HIT', handleRagdollHit);
      return () => window.removeEventListener('RAGDOLL_HIT', handleRagdollHit);
  }, [id]);

  const BodyPart = ({ partName, partRef, position, halfSize, model, visualOffset, visibleDebug }: any) => {
    // Determine capsule dimensions to fit inside the visual box
    // Use the smallest dimension as radius to ensure it fits
    const radius = Math.min(halfSize.x, halfSize.z) * 0.95; 
    // Height of the capsule cylinder part. 
    const capsuleHeight = Math.max(0.01, (halfSize.y * 2) - (radius * 2)); 
    // In Rapier, Capsule args are [halfHeight, radius] usually, 
    // but React-Three-Rapier CapsuleCollider takes [halfLength, radius] where halfLength is half the vertical straight section.
    // Actually, documentation says args=[halfHeight, radius]. Let's try fitting it tightly.
    const segmentHalfHeight = Math.max(0.05, halfSize.y - radius);

    return (
        <RigidBody 
            ref={partRef} 
            colliders={false} // Custom colliders below
            position={[position.x, position.y, position.z]} 
            mass={1.5} 
            friction={0.3} // Lower friction to slide off walls
            restitution={0.2}
            linearDamping={0.5} // High damping helps stop jittering when stuck
            angularDamping={0.5}
            ccd={true} // CONTINUOUS COLLISION DETECTION: The magic fix for clipping
            // UserData allows raycaster to identify this as a ragdoll part
            userData={{ isRagdoll: true, ragdollId: id, partName: partName }}
        >
            {/* PHYSICS SHAPE: Capsule (Smooth, prevents corner snagging) */}
            <CapsuleCollider args={[segmentHalfHeight, radius]} />
            
            {/* VISUAL/HITBOX SHAPE: Box (Matches Minecraft look) */}
            {/* Helper Mesh for Raycasting (Invisible but targetable) */}
            <mesh 
                visible={visibleDebug} 
                name={partName} // Important for World.tsx to find name
                userData={{ isRagdoll: true, ragdollId: id, partName: partName }}
            >
                <boxGeometry args={[halfSize.x * 2, halfSize.y * 2, halfSize.z * 2]} />
                <meshBasicMaterial {...({ color: "red", wireframe: true, visible: true } as any)} />
            </mesh>
    
            {model && (
                <group position={visualOffset}>
                    <primitive object={model} />
                </group>
            )}
        </RigidBody>
    );
  };

  return (
    <group>
        <BodyPart partName="body" partRef={bodyRef} position={bodyPos} halfSize={BODY_HALF_SIZE} model={modelParts.body} visualOffset={relativePositions.body.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partName="head" partRef={headRef} position={headPos} halfSize={HEAD_HALF_SIZE} model={modelParts.head} visualOffset={relativePositions.head.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partName="arml" partRef={armLRef} position={armLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armL} visualOffset={relativePositions.armL.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partName="armr" partRef={armRRef} position={armRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.armR} visualOffset={relativePositions.armR.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partName="legl" partRef={legLRef} position={legLPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legL} visualOffset={relativePositions.legL.clone().negate()} visibleDebug={debugVisible} />
        <BodyPart partName="legr" partRef={legRRef} position={legRPos} halfSize={LIMB_HALF_SIZE} model={modelParts.legR} visualOffset={relativePositions.legR.clone().negate()} visibleDebug={debugVisible} />
    </group>
  );
});