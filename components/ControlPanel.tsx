
import React from 'react';
import { SplatTransform, Vector3 } from '../types';
import { Rotate3d, Move, Maximize2, FileText } from 'lucide-react';

interface ControlPanelProps {
  transform: SplatTransform;
  onTransformChange: (category: keyof SplatTransform, axis: keyof Vector3 | 'all', value: number) => void;
  onReset: () => void;
  splatName: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  transform, 
  onTransformChange, 
  onReset,
  splatName 
}) => {
  return (
    <div className="space-y-10 pb-20">
      {/* File Info */}
      <div className="group">
        <div className="flex items-center gap-2 mb-3">
           <FileText className="w-3 h-3 text-slate-500" />
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Object</span>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg group-hover:border-indigo-500/50 transition-colors">
          <p className="text-xs font-mono text-indigo-300 truncate">{splatName || "No file loaded"}</p>
        </div>
      </div>

      {/* Position Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Move className="w-3 h-3 text-indigo-400" />
            Translation (World)
          </label>
        </div>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={`pos-${axis}`} className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{axis}-Axis Offset</span>
              <input 
                type="number"
                step="0.01"
                value={transform.position[axis]}
                onChange={(e) => onTransformChange('position', axis, Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-1 text-[10px] font-mono text-indigo-400 text-right focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
            <input 
              type="range" min="-50" max="50" step="0.01"
              value={transform.position[axis]}
              onChange={(e) => onTransformChange('position', axis, Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
          </div>
        ))}
      </section>

      {/* Rotation Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Rotate3d className="w-3 h-3 text-indigo-400" />
            Rotation (Deg)
          </label>
          <button onClick={onReset} className="text-[9px] font-bold text-indigo-400 hover:text-white transition-colors uppercase tracking-widest">Reset</button>
        </div>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={`rot-${axis}`} className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{axis}-Axis Rotation</span>
              <input 
                type="number"
                step="1"
                value={Math.round(transform.rotation[axis])}
                onChange={(e) => onTransformChange('rotation', axis, Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-800 rounded px-1 text-[10px] font-mono text-indigo-400 text-right focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
            <input 
              type="range" min="-180" max="180" step="1"
              value={transform.rotation[axis]}
              onChange={(e) => onTransformChange('rotation', axis, Number(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
          </div>
        ))}
      </section>

      {/* Scale Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Maximize2 className="w-3 h-3 text-indigo-400" />
            Global Multiplier
          </label>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Uniform Scale</span>
            <input 
              type="number"
              step="0.01"
              min="0.01"
              value={transform.scale}
              onChange={(e) => onTransformChange('scale', 'all', Number(e.target.value))}
              className="w-16 bg-slate-950 border border-slate-800 rounded px-1 text-[10px] font-mono text-indigo-400 text-right focus:border-indigo-500 outline-none transition-colors"
            />
          </div>
          <input 
            type="range" min="0.01" max="10" step="0.01"
            value={transform.scale}
            onChange={(e) => onTransformChange('scale', 'all', Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
          />
        </div>
      </section>
    </div>
  );
};

export default ControlPanel;
