import React, { useState, useLayoutEffect } from 'react';
import { useGLTF, Bvh } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { WireframeOverlay } from './WireframeOverlay';
import { MAP_URL } from './constants';

export const MapModel = () => {
  const { scene } = useGLTF(MAP_URL);
  const [processedScene, setProcessedScene] = useState<THREE.Object3D | null>(null);

  useLayoutEffect(() => {
    if (!scene) return;

    const clonedScene = scene.clone();
    clonedScene.name = 'environment';

    // 1. Calculate original size
    const originalBox = new THREE.Box3().setFromObject(clonedScene);
    const originalSize = new THREE.Vector3();
    originalBox.getSize(originalSize);

    // 2. Calculate scale factor (~80 meters target)
    const targetSize = 80;
    const maxDim = Math.max(originalSize.x, originalSize.y, originalSize.z);
    let scaleFactor = 1;
    if (maxDim > 0) {
        scaleFactor = targetSize / maxDim;
    }

    // 3. Apply Scale
    clonedScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
            obj.matrixAutoUpdate = false;
            obj.updateMatrix();

            if (obj.material) {
                const mat = obj.material as any;
                if (!Array.isArray(mat)) {
                    mat.envMapIntensity = 0.5;
                    if (mat.map) mat.map.anisotropy = 4; 
                    mat.needsUpdate = true;
                }
            }
            obj.geometry.scale(scaleFactor, scaleFactor, scaleFactor);
            obj.position.multiplyScalar(scaleFactor);
            obj.updateMatrix();
        }
    });
    
    clonedScene.updateMatrixWorld(true);

    // 4. Center
    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    const offsetX = -scaledCenter.x;
    const offsetY = -scaledBox.min.y; 
    const offsetZ = -scaledCenter.z;

    clonedScene.position.set(offsetX, offsetY, offsetZ);
    clonedScene.updateMatrixWorld(true);

    setProcessedScene(clonedScene);

  }, [scene]);

  if (!processedScene) return null;

  return (
    <group>
      <RigidBody type="fixed" colliders="trimesh" friction={1} restitution={0}>
        <Bvh firstHitOnly>
             <primitive object={processedScene} />
        </Bvh>
      </RigidBody>
      <WireframeOverlay originalScene={processedScene} />
    </group>
  );
};