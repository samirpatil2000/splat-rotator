
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SplatTransform {
  position: Vector3;
  rotation: Vector3;
  scale: number;
}

export interface SplatConfig extends SplatTransform {
  url: string;
  name: string;
}
