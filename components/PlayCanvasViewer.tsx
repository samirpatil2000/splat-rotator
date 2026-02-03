
import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';
import { SplatTransform } from '../types';

interface PlayCanvasViewerProps {
  url: string;
  transform: SplatTransform;
}

const PlayCanvasViewer: React.FC<PlayCanvasViewerProps> = ({ url, transform }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<pc.Application | null>(null);
  const splatEntityRef = useRef<pc.Entity | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize PlayCanvas Application
    const app = new pc.Application(canvasRef.current, {
      mouse: new pc.Mouse(canvasRef.current),
      touch: new pc.TouchDevice(canvasRef.current),
      graphicsDeviceOptions: { antialias: true, alpha: false }
    });

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.start();
    appRef.current = app;

    // Camera Setup
    const camera = new pc.Entity('Camera');
    camera.addComponent('camera', {
      clearColor: new pc.Color(0.04, 0.04, 0.05)
    });
    camera.setPosition(0, 1, 5);
    app.root.addChild(camera);

    // Basic Orbit Control Logic (simplified)
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let yaw = 0;
    let pitch = 0;
    let distance = 5;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      yaw -= dx * 0.5;
      pitch -= dy * 0.5;
      pitch = Math.max(-89, Math.min(89, pitch));
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handleMouseUp = () => { isDragging = false; };
    const handleWheel = (e: WheelEvent) => {
      distance += e.deltaY * 0.01;
      distance = Math.max(0.5, Math.min(50, distance));
    };

    canvasRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasRef.current.addEventListener('wheel', handleWheel);

    app.on('update', (dt) => {
      const rot = new pc.Quat().setFromEulerAngles(pitch, yaw, 0);
      const pos = rot.transformVector(new pc.Vec3(0, 0, distance));
      camera.setRotation(rot);
      camera.setPosition(pos);
    });

    // Splat Entity
    const splatEntity = new pc.Entity('GSplat');
    app.root.addChild(splatEntity);
    splatEntityRef.current = splatEntity;

    // Load GSplat Asset
    const asset = new pc.Asset('splat', 'gsplat', { url: url });
    app.assets.add(asset);
    app.assets.load(asset);

    asset.ready(() => {
      splatEntity.addComponent('gsplat', {
        asset: asset
      });
    });

    // Cleanup
    return () => {
      canvasRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasRef.current?.removeEventListener('wheel', handleWheel);
      app.destroy();
    };
  }, [url]);

  // Update Transform in PlayCanvas when React state changes
  useEffect(() => {
    const entity = splatEntityRef.current;
    if (!entity) return;

    entity.setPosition(transform.position.x, transform.position.y, transform.position.z);
    entity.setEulerAngles(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    entity.setLocalScale(transform.scale, transform.scale, transform.scale);
  }, [transform]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default PlayCanvasViewer;
