
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SplatMesh, OldSparkRenderer } from '@sparkjsdev/spark';
import { SplatTransform } from '../types';

interface SparkViewerProps {
  buffer: ArrayBuffer | null;
  transform: SplatTransform;
}

const SparkViewer: React.FC<SparkViewerProps> = ({ buffer, transform }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const splatMeshRef = useRef<SplatMesh | null>(null);

  useEffect(() => {
    if (!containerRef.current || !buffer) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050607);

    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 1, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // OldSparkRenderer is the stable 0.1.x API — synchronous updates, no LOD complexity
    const sparkRenderer = new OldSparkRenderer({ renderer });
    scene.add(sparkRenderer);

    const splatMesh = new SplatMesh({
      fileBytes: new Uint8Array(buffer),
      onLoad: (mesh) => {
        console.log("Spark: Splat loaded, splats:", mesh.packedSplats?.numSplats);
      },
    });
    splatMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
    splatMesh.rotation.set(
      transform.rotation.x * (Math.PI / 180),
      transform.rotation.y * (Math.PI / 180),
      transform.rotation.z * (Math.PI / 180)
    );
    splatMesh.scale.set(transform.scale, transform.scale, transform.scale);
    scene.add(splatMesh);
    splatMeshRef.current = splatMesh;

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // SparkRenderer handles itself via onBeforeRender (autoUpdate: true by default)
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      splatMesh.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [buffer]);

  // Update Transform
  useEffect(() => {
    const splatMesh = splatMeshRef.current;
    if (splatMesh) {
      splatMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
      splatMesh.rotation.set(
        transform.rotation.x * (Math.PI / 180),
        transform.rotation.y * (Math.PI / 180),
        transform.rotation.z * (Math.PI / 180)
      );
      splatMesh.scale.set(transform.scale, transform.scale, transform.scale);
    }
  }, [transform]);

  return <div ref={containerRef} className="w-full h-full" id="spark-viewer-container" />;
};

export default SparkViewer;
