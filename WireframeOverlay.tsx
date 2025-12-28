import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';

export const WireframeOverlay = ({ originalScene }: { originalScene: THREE.Object3D }) => {
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

    const wireframeGroup = useMemo(() => {
        if (!visible) return null;

        const clone = originalScene.clone();
        const limeMaterial = new THREE.MeshBasicMaterial({ 
            color: 'lime', 
            wireframe: true, 
            transparent: true, 
            opacity: 0.3, 
            depthTest: false, 
            depthWrite: false
        });

        clone.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                // Cast to Mesh to access material property safely
                (obj as THREE.Mesh).material = limeMaterial;
                obj.castShadow = false;
                obj.receiveShadow = false;
            }
        });
        return clone;
    }, [originalScene, visible]);

    if (!visible || !wireframeGroup) return null;

    return <primitive object={wireframeGroup} />;
};