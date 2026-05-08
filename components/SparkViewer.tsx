
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SplatLoader, SparkRenderer } from '@sparkjsdev/spark';
import { SplatTransform } from '../types';

interface SparkViewerProps {
  buffer: ArrayBuffer | null;
  transform: SplatTransform;
}

const SparkViewer: React.FC<SparkViewerProps> = ({ buffer, transform }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sparkRendererRef = useRef<SparkRenderer | null>(null);
  const splatMeshRef = useRef<any>(null); // SplatMesh type

  useEffect(() => {
    if (!containerRef.current || !buffer) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050607);

    // Debug Cube
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x4f46e5, wireframe: true })
    );
    cube.position.set(0, 0, 0);
    scene.add(cube);

    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 1, 5);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Recommended for Spark
      alpha: true 
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Spark Renderer Setup
    const sparkRenderer = new SparkRenderer({
      renderer: renderer,
      onDirty: () => {
        // Spark will call this when it needs a re-render
      }
    });
    scene.add(sparkRenderer);
    sparkRendererRef.current = sparkRenderer;

    // Load GSplat
    const loader = new SplatLoader();
    console.log("Spark: Loading buffer, size:", buffer.byteLength);
    try {
      loader.loadInternal({ 
        fileBytes: new Uint8Array(buffer),
        onLoad: (packed) => {
          console.log("Spark: Splat loaded successfully", packed);
          const splatMesh = loader.parse(packed as any);
          scene.add(splatMesh);
          splatMeshRef.current = splatMesh;
          
          // Remove debug cube once loaded
          scene.remove(cube);

          // Apply initial transform
          if (splatMesh) {
            splatMesh.position.set(transform.position.x, transform.position.y, transform.position.z);
            splatMesh.rotation.set(
              transform.rotation.x * (Math.PI / 180),
              transform.rotation.y * (Math.PI / 180),
              transform.rotation.z * (Math.PI / 180)
            );
            splatMesh.scale.set(transform.scale, transform.scale, transform.scale);
          }
        },
        onError: (err) => {
          console.error("Spark Load Error:", err);
        }
      });
    } catch (e) {
      console.error("Spark Load Exception:", e);
    }

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      controls.update();
      
      // Spark update
      sparkRenderer.update({ scene, camera });
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      sparkRenderer.dispose();
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
