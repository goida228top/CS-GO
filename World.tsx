import React from 'react';
import { Grid, Stars, Environment } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export const World: React.FC = () => {
  return (
    <group>
      {/* Простое освещение без SoftShadows */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]} 
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
      </directionalLight>

      {/* Простая карта окружения */}
      <Environment preset="night" blur={0.8} background={false} />

      {/* Пол - Физический */}
      <RigidBody type="fixed" colliders="cuboid" friction={1}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial 
                color="#1a1a1a" 
                roughness={0.8} 
                metalness={0.2} 
            />
        </mesh>
      </RigidBody>

      {/* Grid - Визуальный */}
      <Grid
        position={[0, 0.02, 0]}
        args={[200, 200]}
        cellColor="#444"
        sectionColor="#666"
        sectionThickness={1}
        cellThickness={0.5}
        fadeDistance={50}
        fadeStrength={1}
      />

      {/* Декорации (упрощенные материалы) - Физические */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-5, 1, -5]} castShadow receiveShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#333" />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed" colliders="hull">
        <mesh position={[8, 4, -12]} castShadow receiveShadow>
            <cylinderGeometry args={[0.5, 0.5, 8, 32]} />
            <meshStandardMaterial color="#444" />
        </mesh>
      </RigidBody>

      {/* Звезды и туман */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      <fog attach="fog" args={['#111', 10, 60]} />
    </group>
  );
};