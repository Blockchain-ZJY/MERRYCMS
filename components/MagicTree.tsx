import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useFont } from '@react-three/drei';
import { AppMode } from '../types';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

// Switch to Helvetiker Bold for better readability/thickness
const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json';

interface MagicTreeProps {
  mode: AppMode;
}

// Configuration
const COUNT = 5000; 
const SPHERE_COUNT = 2500; 
// Implicitly CUBE_COUNT = 2500

const COLORS = {
  GOLD: new THREE.Color('#FFD700'),
  RED: new THREE.Color('#D90429'),
  GREEN: new THREE.Color('#006400'),
  DEEP_GOLD: new THREE.Color('#B8860B'),
};

// --- Geometry Helpers ---
const getGeometryArea = (geo: THREE.BufferGeometry): number => {
    const posAttribute = geo.attributes.position;
    const indexAttribute = geo.index;
    const triangleCount = indexAttribute ? indexAttribute.count / 3 : posAttribute.count / 3;
    
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const triangle = new THREE.Triangle();
    let totalArea = 0;

    for (let i = 0; i < triangleCount; i++) {
      if (indexAttribute) {
        pA.fromBufferAttribute(posAttribute, indexAttribute.getX(i * 3));
        pB.fromBufferAttribute(posAttribute, indexAttribute.getX(i * 3 + 1));
        pC.fromBufferAttribute(posAttribute, indexAttribute.getX(i * 3 + 2));
      } else {
        pA.fromBufferAttribute(posAttribute, i * 3);
        pB.fromBufferAttribute(posAttribute, i * 3 + 1);
        pC.fromBufferAttribute(posAttribute, i * 3 + 2);
      }
      triangle.set(pA, pB, pC);
      totalArea += triangle.getArea();
    }
    return totalArea;
};

const sampleGeometryPoints = (geo: THREE.BufferGeometry, count: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    const posAttribute = geo.attributes.position;
    const indexAttribute = geo.index;
    const triangleCount = indexAttribute ? indexAttribute.count / 3 : posAttribute.count / 3;

    // Calculate areas of individual triangles for weighted sampling
    const areas: number[] = [];
    let totalArea = 0;
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const triangle = new THREE.Triangle();

    const getVerts = (triIdx: number) => {
      if (indexAttribute) {
        pA.fromBufferAttribute(posAttribute, indexAttribute.getX(triIdx * 3));
        pB.fromBufferAttribute(posAttribute, indexAttribute.getX(triIdx * 3 + 1));
        pC.fromBufferAttribute(posAttribute, indexAttribute.getX(triIdx * 3 + 2));
      } else {
        pA.fromBufferAttribute(posAttribute, triIdx * 3);
        pB.fromBufferAttribute(posAttribute, triIdx * 3 + 1);
        pC.fromBufferAttribute(posAttribute, triIdx * 3 + 2);
      }
    };

    for (let i = 0; i < triangleCount; i++) {
      getVerts(i);
      triangle.set(pA, pB, pC);
      const area = triangle.getArea();
      totalArea += area;
      areas.push(totalArea);
    }

    // Sample points
    const point = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const r = Math.random() * totalArea;
      let low = 0, high = triangleCount - 1;
      let triIndex = -1;
      
      while (low <= high) {
        const mid = (low + high) >>> 1;
        if (areas[mid] >= r) {
          triIndex = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      if (triIndex === -1) triIndex = triangleCount - 1;

      getVerts(triIndex);
      let r1 = Math.random();
      let r2 = Math.random();
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      
      point.set(0, 0, 0)
        .addScaledVector(pA, r1)
        .addScaledVector(pB, r2)
        .addScaledVector(pC, 1 - r1 - r2);
        
      points.push(point.clone());
    }
    return points;
};


const MagicTree: React.FC<MagicTreeProps> = ({ mode }) => {
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
  const cubeMeshRef = useRef<THREE.InstancedMesh>(null);
  const topStarRef = useRef<THREE.Mesh>(null);
  
  // Font loading
  const font = useFont(FONT_URL);

  // --- 1. Compute Targets ---
  
  const getExplosionPos = () => {
    const r = 15 + Math.random() * 15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  };

  const getTreePos = (i: number, total: number) => {
    const p = i / total; // 0 to 1
    const h = 22; 
    const y = -h/2 + p * h; 
    const radius = (1 - Math.pow(p, 0.8)) * 8; 
    const angle = i * 2.4; 
    const jitter = 0.6;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * jitter;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * jitter;
    return new THREE.Vector3(x, y, z);
  };

  const layoutData = useMemo(() => {
    const treePositions: THREE.Vector3[] = [];
    const explodePositions: THREE.Vector3[] = [];
    let textPositions: THREE.Vector3[] = [];
    
    // --- Tree & Explode Layout ---
    for (let i = 0; i < COUNT; i++) {
      treePositions.push(getTreePos(i, COUNT));
      explodePositions.push(getExplosionPos());
    }

    // --- Text Layout (Multi-part for specific control) ---
    if (font) {
      const geometries: THREE.BufferGeometry[] = [];
      const config = {
        font: font as any,
        size: 2.0,
        depth: 0.1,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 2,
      };

      // 1. MERRY (Top Line)
      const geo1 = new TextGeometry('MERRY', config);
      geo1.center();
      geo1.translate(0, 3.5, 0);
      geometries.push(geo1);

      // 2. CHRISTMAS (Middle Line)
      const geo2 = new TextGeometry('CHRISTMAS', config);
      geo2.center();
      geo2.translate(0, 0, 0);
      geometries.push(geo2);

      // 3. ZJY (Bottom Left)
      const geo3 = new TextGeometry('ZJY', config);
      geo3.center();
      geo3.translate(-4.5, -3.5, 0); 
      geometries.push(geo3);

      // 4. HEART SHAPE (Bottom Center)
      // Custom shape to ensure it is upright and clear
      const heartShape = new THREE.Shape();
      // Start at top center dip
      heartShape.moveTo(0, 0.5); 
      // Left lobe
      heartShape.bezierCurveTo(-0.6, 1.2, -1.2, 0.6, -1.2, 0); 
      // Left side to bottom tip
      heartShape.bezierCurveTo(-1.2, -0.6, -0.6, -1.2, 0, -1.6);
      // Right side from bottom tip
      heartShape.bezierCurveTo(0.6, -1.2, 1.2, -0.6, 1.2, 0);
      // Right lobe top
      heartShape.bezierCurveTo(1.2, 0.6, 0.6, 1.2, 0, 0.5);

      const heartGeo = new THREE.ExtrudeGeometry(heartShape, {
         depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.01, bevelSegments: 2
      });
      heartGeo.center();
      heartGeo.scale(1.8, 1.8, 1.0); // Adjust size to match text
      heartGeo.translate(0, -3.1, 0); // Position between names
      geometries.push(heartGeo);

      // 5. YJQ (Bottom Right)
      const geo5 = new TextGeometry('YJQ', config);
      geo5.center();
      geo5.translate(4.5, -3.5, 0); 
      geometries.push(geo5);

      // Distribution Calculation
      // We calculate the area of all shapes to distribute particles evenly across them
      const areas = geometries.map(getGeometryArea);
      const totalArea = areas.reduce((a,b) => a+b, 0);

      // Generate points for each geometry
      geometries.forEach((geo, idx) => {
         // Determine how many particles go to this shape
         const countForGeo = Math.floor((areas[idx] / totalArea) * COUNT);
         const points = sampleGeometryPoints(geo, countForGeo);
         textPositions.push(...points);
      });

      // Fill remainder (due to rounding) with points centered at origin (hidden)
      while (textPositions.length < COUNT) {
          textPositions.push(new THREE.Vector3(0,0,0)); 
      }
      
      // Trim if slightly over
      if (textPositions.length > COUNT) {
         textPositions = textPositions.slice(0, COUNT);
      }
      
      // Cleanup
      geometries.forEach(g => g.dispose());

    } else {
      for (let i = 0; i < COUNT; i++) textPositions.push(new THREE.Vector3(0,0,0));
    }

    return { treePositions, explodePositions, textPositions };
  }, [font]);


  // --- 2. State for Interpolation ---
  const currentPositions = useRef<THREE.Vector3[]>(new Array(COUNT).fill(0).map(() => new THREE.Vector3()));
  
  // --- 3. Animation Loop ---
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!sphereMeshRef.current || !cubeMeshRef.current || !topStarRef.current) return;

    const step = THREE.MathUtils.clamp(delta * 2.0, 0, 1); 
    
    topStarRef.current.rotation.y += delta;
    topStarRef.current.rotation.z = Math.sin(state.clock.elapsedTime) * 0.1;
    
    const targetStarScale = mode === AppMode.TREE ? 1 : 0;
    topStarRef.current.scale.lerp(new THREE.Vector3(targetStarScale, targetStarScale, targetStarScale), step);

    let targetArray: THREE.Vector3[] = layoutData.treePositions;
    if (mode === AppMode.EXPLODE) targetArray = layoutData.explodePositions;
    if (mode === AppMode.TEXT) targetArray = layoutData.textPositions;

    for (let i = 0; i < COUNT; i++) {
      currentPositions.current[i].lerp(targetArray[i], step);
      
      const pos = currentPositions.current[i];
      dummy.position.copy(pos);
      
      if (mode === AppMode.TEXT) {
        dummy.rotation.set(0, 0, 0); 
        // Smaller scale for text to look sharper and less clumpy
        dummy.scale.setScalar(0.12); 
      } else {
        dummy.rotation.set(
          state.clock.elapsedTime * 0.2 + i,
          state.clock.elapsedTime * 0.1 + i,
          state.clock.elapsedTime * 0.3 + i
        );

        const scaleBase = i % 2 === 0 ? 0.35 : 0.3; 
        const pulse = Math.sin(state.clock.elapsedTime * 2 + i) * 0.1 + 1;
        dummy.scale.setScalar(scaleBase * pulse);
      }

      dummy.updateMatrix();

      if (i < SPHERE_COUNT) {
         sphereMeshRef.current.setMatrixAt(i, dummy.matrix);
      } else {
         cubeMeshRef.current.setMatrixAt(i - SPHERE_COUNT, dummy.matrix);
      }
    }

    sphereMeshRef.current.instanceMatrix.needsUpdate = true;
    cubeMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  // --- 4. Initialization (Colors) ---
  useEffect(() => {
    if (!sphereMeshRef.current || !cubeMeshRef.current) return;
    
    const tempColor = new THREE.Color();
    
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const color = Math.random() > 0.4 ? COLORS.GOLD : COLORS.RED;
      tempColor.copy(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      sphereMeshRef.current.setColorAt(i, tempColor);
    }
    
    const CUBE_COUNT = COUNT - SPHERE_COUNT;
    for (let i = 0; i < CUBE_COUNT; i++) {
      const color = Math.random() > 0.5 ? COLORS.DEEP_GOLD : COLORS.GREEN;
      tempColor.copy(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
      cubeMeshRef.current.setColorAt(i, tempColor);
    }
    
    sphereMeshRef.current.instanceColor!.needsUpdate = true;
    cubeMeshRef.current.instanceColor!.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* Top Decoration */}
      <mesh ref={topStarRef} position={[0, 11, 0]}>
        <octahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial 
          color="#FFFF00" 
          emissive="#FFD700"
          emissiveIntensity={2}
          roughness={0.1}
          metalness={1}
        />
      </mesh>

      {/* Spheres Instance */}
      <instancedMesh
        ref={sphereMeshRef}
        args={[undefined, undefined, SPHERE_COUNT]}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          roughness={0.2} 
          metalness={0.9} 
          envMapIntensity={1.5}
        />
      </instancedMesh>

      {/* Cubes Instance */}
      <instancedMesh
        ref={cubeMeshRef}
        args={[undefined, undefined, COUNT - SPHERE_COUNT]}
      >
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial 
          roughness={0.1} 
          metalness={1.0} 
          envMapIntensity={2.0}
        />
      </instancedMesh>
    </group>
  );
};

export default MagicTree;