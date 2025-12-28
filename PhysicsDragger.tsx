
import { useState, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useRapier, RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';

export const PhysicsDragger = () => {
    const { camera, scene } = useThree();
    const { rapier, world } = useRapier();
    const draggedObject = useRef<RapierRigidBody | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (!window.GAME_SETTINGS.dragMode || e.button !== 0) return;
            setIsDragging(true);
        };

        const onMouseUp = () => {
            setIsDragging(false);
            draggedObject.current = null;
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }, [camera, scene]);

    useFrame(() => {
        if (!isDragging || !window.GAME_SETTINGS.dragMode) return;

        const origin = camera.position;
        const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        const ray = new rapier.Ray(origin, direction);
        const hit = world.castRay(ray, 100, true);

        if (hit && hit.collider) {
            const collider = hit.collider;
            const body = collider.parent();
            if (body && !body.isFixed()) {
                const targetPoint = origin.clone().add(direction.clone().multiplyScalar(3));
                const bodyPos = body.translation();
                const currentPos = new Vector3(bodyPos.x, bodyPos.y, bodyPos.z);
                
                const force = targetPoint.sub(currentPos).multiplyScalar(20);
                const linVel = body.linvel();
                force.sub(new Vector3(linVel.x, linVel.y, linVel.z).multiplyScalar(5));

                body.applyImpulse(force, true);
                body.setAngvel({x:0, y:0, z:0}, true);
            }
        }
    });

    return null;
}
