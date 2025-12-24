import * as THREE from 'three';

export enum AppMode {
  TREE = 0,
  EXPLODE = 1,
  TEXT = 2,
}

export interface ParticleData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  color: THREE.Color;
  type: 'sphere' | 'cube';
}
