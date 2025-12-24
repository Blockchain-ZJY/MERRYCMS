import React, { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import MagicTree from './MagicTree';
import { AppMode } from '../types';

const Scene: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);

  const handleClick = useCallback(() => {
    setMode((prev) => {
      if (prev === AppMode.TREE) return AppMode.EXPLODE;
      if (prev === AppMode.EXPLODE) return AppMode.TEXT;
      return AppMode.TREE;
    });
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 25], fov: 45 }}
      gl={{ antialias: false, toneMappingExposure: 1.5 }}
      onClick={handleClick}
    >
      <color attach="background" args={['#050505']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={2} color="#ffcc77" />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#ff0044" />
      <spotLight 
        position={[0, 20, 0]} 
        angle={0.5} 
        penumbra={1} 
        intensity={3} 
        color="#ffd700" 
        castShadow 
      />

      {/* Environment for PBR reflections */}
      <Environment preset="city" />

      {/* Stars Background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Content */}
      <Suspense fallback={null}>
        <MagicTree mode={mode} />
      </Suspense>

      {/* Controls */}
      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={10}
        maxDistance={50}
        autoRotate={mode === AppMode.TREE} // Only auto rotate when in tree mode
        autoRotateSpeed={0.5}
      />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
};

export default Scene;