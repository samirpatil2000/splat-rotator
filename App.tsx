
import React, { useState, useCallback, useEffect } from 'react';
import { Download, Upload, RotateCcw, Settings2, Box, Move, Layers, Cpu, Terminal, FileCode, Loader2, FileUp, Eye, Wrench } from 'lucide-react';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import SparkViewer from './components/SparkViewer';
import { SplatTransform, Vector3 } from './types';

const App: React.FC = () => {
  const [transform, setTransform] = useState<SplatTransform>({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1,
  });
  
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'processor' | 'viewer'>('processor');

  const handleTransformChange = useCallback((category: keyof SplatTransform, axis: keyof Vector3 | 'all', value: number) => {
    setTransform(prev => {
      if (category === 'scale') {
        return { ...prev, scale: value };
      }
      return {
        ...prev,
        [category]: {
          ...(prev[category] as Vector3),
          [axis as keyof Vector3]: value
        }
      };
    });
  }, []);

  const handleReset = () => {
    setTransform({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      setFileName(file.name);
      handleReset();
    }
  };

  // Quaternion Helpers for Baking
  const eulerToQuat = (x: number, y: number, z: number) => {
    const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
    const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
    const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
    return [
      c1 * c2 * c3 - s1 * s2 * s3, // w
      s1 * c2 * c3 + c1 * s2 * s3, // x
      c1 * s2 * c3 - s1 * c2 * s3, // y
      c1 * c2 * s3 + s1 * s2 * c3  // z
    ];
  };

  const quatMul = (q1: number[], q2: number[]) => [
    q1[0] * q2[0] - q1[1] * q2[1] - q1[2] * q2[2] - q1[3] * q2[3], // w
    q1[0] * q2[1] + q1[1] * q2[0] + q1[2] * q2[3] - q1[3] * q2[2], // x
    q1[0] * q2[2] - q1[1] * q2[3] + q1[2] * q2[0] + q1[3] * q2[1], // y
    q1[0] * q2[3] + q1[1] * q2[2] - q1[2] * q2[1] + q1[3] * q2[0]  // z
  ];

  const bakePly = (buffer: ArrayBuffer, tx: SplatTransform): ArrayBuffer => {
    const headerLimit = 8192;
    const fullText = new TextDecoder().decode(buffer.slice(0, headerLimit));
    const headerEndIndex = fullText.indexOf('end_header\n');
    if (headerEndIndex === -1) throw new Error("Invalid PLY file");

    const header = fullText.slice(0, headerEndIndex + 11);
    const dataOffset = headerEndIndex + 11;
    
    const lines = header.split('\n');
    let vertexCount = 0;
    const properties: string[] = [];
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'element' && parts[1] === 'vertex') {
        vertexCount = parseInt(parts[2]);
      } else if (parts[0] === 'property') {
        properties.push(parts[parts.length - 1]);
      }
    });

    const vertexSize = properties.length * 4;
    const dataView = new DataView(buffer, dataOffset);
    const outputBuffer = buffer.slice(0);
    const outputView = new DataView(outputBuffer, dataOffset);

    // Global Rotation Quat (Euler in radians)
    const gQuat = eulerToQuat(
      tx.rotation.x * (Math.PI / 180),
      tx.rotation.y * (Math.PI / 180),
      tx.rotation.z * (Math.PI / 180)
    );

    // Rotation Matrices for Position
    const rx = tx.rotation.x * (Math.PI / 180);
    const ry = tx.rotation.y * (Math.PI / 180);
    const rz = tx.rotation.z * (Math.PI / 180);
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);

    // Property indices
    const xIdx = properties.indexOf('x');
    const yIdx = properties.indexOf('y');
    const zIdx = properties.indexOf('z');
    const scaleIdxs = [properties.indexOf('scale_0'), properties.indexOf('scale_1'), properties.indexOf('scale_2')];
    const rotIdxs = [
      properties.indexOf('rot_0'), // w
      properties.indexOf('rot_1'), // x
      properties.indexOf('rot_2'), // y
      properties.indexOf('rot_3')  // z
    ];

    for (let i = 0; i < vertexCount; i++) {
      const offset = i * vertexSize;

      // 1. Position Transformation
      let px = dataView.getFloat32(offset + xIdx * 4, true);
      let py = dataView.getFloat32(offset + yIdx * 4, true);
      let pz = dataView.getFloat32(offset + zIdx * 4, true);

      // Scale
      px *= tx.scale; py *= tx.scale; pz *= tx.scale;

      // Rotate Cloud Points
      let ty = py * cosX - pz * sinX;
      let tz = py * sinX + pz * cosX;
      py = ty; pz = tz;
      let tx_ = px * cosY + pz * sinY;
      tz = -px * sinY + pz * cosY;
      px = tx_; pz = tz;
      tx_ = px * cosZ - py * sinZ;
      ty = px * sinZ + py * cosZ;
      px = tx_; py = ty;

      // Translate
      px += tx.position.x; py += tx.position.y; pz += tx.position.z;

      outputView.setFloat32(offset + xIdx * 4, px, true);
      outputView.setFloat32(offset + yIdx * 4, py, true);
      outputView.setFloat32(offset + zIdx * 4, pz, true);

      // 2. Splat Orientation Transformation (FIXES SPIKES)
      if (rotIdxs[0] !== -1) {
        const lQuat = [
          dataView.getFloat32(offset + rotIdxs[0] * 4, true),
          dataView.getFloat32(offset + rotIdxs[1] * 4, true),
          dataView.getFloat32(offset + rotIdxs[2] * 4, true),
          dataView.getFloat32(offset + rotIdxs[3] * 4, true)
        ];
        
        // New orientation = Global Rotation * Local Orientation
        const nQuat = quatMul(gQuat, lQuat);
        
        outputView.setFloat32(offset + rotIdxs[0] * 4, nQuat[0], true);
        outputView.setFloat32(offset + rotIdxs[1] * 4, nQuat[1], true);
        outputView.setFloat32(offset + rotIdxs[2] * 4, nQuat[2], true);
        outputView.setFloat32(offset + rotIdxs[3] * 4, nQuat[3], true);
      }

      // 3. Splat Scale Transformation (Log Space)
      if (tx.scale !== 1) {
        scaleIdxs.forEach(idx => {
          if (idx !== -1) {
            const s = dataView.getFloat32(offset + idx * 4, true);
            outputView.setFloat32(offset + idx * 4, s + Math.log(tx.scale), true);
          }
        });
      }
    }

    return outputBuffer;
  };

  const handleExport = async () => {
    if (!fileBuffer) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const modified = bakePly(fileBuffer, transform);
        const blob = new Blob([modified], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const nameBase = fileName.split('.')[0];
        link.download = `${nameBase}_transformed.ply`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("PLY Baking failed", e);
        alert("Baking failed. Ensure the file is a binary PLY Gaussian Splat.");
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050607]">
      <Header />

      <main className="relative flex-1 flex flex-col md:flex-row h-full pt-16">
        <div className="flex-1 relative group overflow-hidden bg-[radial-gradient(circle_at_center,_#0a0b10_0%,_#050607_100%)]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          {fileBuffer ? (
            <div className="w-full h-full relative flex flex-col">
              {/* Mode Toggle */}
              <div className="absolute top-6 left-6 z-30 flex bg-slate-900/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 shadow-2xl">
                <button 
                  onClick={() => setViewMode('processor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'processor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Processor
                </button>
                <button 
                  onClick={() => setViewMode('viewer')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'viewer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Spark2 View
                </button>
              </div>

              {viewMode === 'processor' ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-12">
                  <div className="w-full max-w-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <FileCode className="w-40 h-40" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-10 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                          <Cpu className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white tracking-tight uppercase">Spark 2 Processor</h2>
                          <p className="text-[10px] text-indigo-400/60 font-mono uppercase tracking-[0.3em] font-bold">Orientation-Aware Baking</p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Buffer</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                      <div className="p-6 bg-white/[0.03] border border-white/[0.05] rounded-3xl group">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Source Dataset</span>
                         <p className="text-sm font-mono text-white truncate mb-1">{fileName}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{(fileBuffer.byteLength / 1024 / 1024).toFixed(2)} MB • Binary PLY</p>
                      </div>
                      <div className="p-6 bg-white/[0.03] border border-white/[0.05] rounded-3xl">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Target Rotation</span>
                         <div className="flex gap-4">
                            {(['x', 'y', 'z'] as const).map((axis) => (
                               <div key={axis} className="flex-1 text-center">
                                  <p className="text-[10px] font-bold text-slate-600 mb-1">{axis.toUpperCase()}</p>
                                  <p className="text-lg font-mono text-white">{Math.round(transform.rotation[axis])}°</p>
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="p-6 bg-white/[0.03] border border-white/[0.05] rounded-3xl">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-3">Translation</span>
                         <p className="text-xl font-mono text-white tracking-tighter">
                           {transform.position.x.toFixed(2)}, {transform.position.y.toFixed(2)}, {transform.position.z.toFixed(2)}
                         </p>
                      </div>
                      <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl">
                         <span className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em] block mb-3">Global Scalar</span>
                         <p className="text-2xl font-mono text-indigo-400 font-black tracking-tighter">×{transform.scale.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px] font-bold uppercase tracking-widest">
                        <Terminal className="w-4 h-4 text-indigo-500" />
                        Bake logic: Quaternion Cloud-Splat Sync
                      </div>
                      <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset Params
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-black relative">
                  {fileBuffer && (
                    <SparkViewer buffer={fileBuffer} transform={transform} />
                  )}
                  {/* Overlay for Viewer */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                    <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-2xl pointer-events-auto">
                      <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1 italic">Spark2 Engine Powering Preview</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Real-time GPU Rasterization</p>
                    </div>
                    <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-2xl pointer-events-auto flex gap-4">
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">FPS</p>
                        <p className="text-xs font-mono text-emerald-400">Locked</p>
                      </div>
                      <div className="w-[1px] bg-white/10" />
                      <div className="text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Points</p>
                        <p className="text-xs font-mono text-white text-right">Adaptive</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-32 h-32 mb-8 relative">
                 <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] blur-3xl opacity-10 animate-pulse"></div>
                 <div className="relative w-32 h-32 bg-slate-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                    <Box className="w-14 h-14 text-slate-800" />
                 </div>
              </div>
              <h2 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase italic">Splat<span className="text-indigo-500">Bake</span></h2>
              <p className="text-slate-500 max-w-sm mb-12 text-sm leading-relaxed font-bold uppercase tracking-widest opacity-80">
                Fix spikes with orientation-aware baking.<br/>Powered by Spark 2.0 Binary Engine.
              </p>
              <label className="group relative flex items-center gap-5 py-6 px-20 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] text-white font-black transition-all shadow-[0_20px_50px_rgba(79,70,229,0.3)] cursor-pointer overflow-hidden uppercase tracking-[0.3em] text-xs">
                <FileUp className="w-5 h-5" />
                <span>Upload .PLY Cloud</span>
                <input type="file" className="hidden" accept=".ply" onChange={handleFileUpload} />
              </label>
              <p className="mt-10 text-[10px] text-slate-700 font-black tracking-[0.4em] uppercase">Built with @sparkjsdev/spark 0.1.10</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'w-full md:w-80' : 'w-0 overflow-hidden'} transition-all duration-500 bg-[#08090b] border-l border-white/[0.03] flex flex-col z-10 shadow-[-20px_0_100px_rgba(0,0,0,0.9)]`}>
          <div className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-10 border-b border-white/[0.03] pb-6">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <Settings2 className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Inspector</h2>
            </div>

            {fileBuffer ? (
              <ControlPanel 
                transform={transform} 
                onTransformChange={handleTransformChange}
                onReset={handleReset}
                splatName={fileName}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 px-6 bg-white/[0.01] rounded-[2rem] border border-white/[0.03] border-dashed">
                <Layers className="w-10 h-10 text-slate-800 mb-6" />
                <p className="text-[10px] text-slate-700 text-center font-black uppercase tracking-[0.3em] leading-relaxed opacity-50 italic">Waiting for Dataset...</p>
              </div>
            )}

            <div className="mt-auto pt-10 space-y-5">
              <button 
                onClick={handleExport}
                disabled={!fileBuffer || isExporting}
                className={`w-full flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl ${
                  fileBuffer && !isExporting
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20' 
                    : 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/[0.03]'
                }`}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mb-1" />
                    Correcting Quats...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mb-1" />
                    Bake & Export .PLY
                  </>
                )}
              </button>
              
              <div className="flex justify-between items-center px-2">
                <p className="text-[9px] text-slate-800 font-black uppercase tracking-widest">Spark Headless</p>
                <p className="text-[9px] text-slate-800 font-black uppercase tracking-widest">v0.1.10-CORE</p>
              </div>
            </div>
          </div>
        </aside>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden absolute top-4 right-4 z-20 p-4 bg-indigo-600 rounded-2xl text-white shadow-2xl"
        >
          <Settings2 className="w-6 h-6" />
        </button>
      </main>
    </div>
  );
};

export default App;
