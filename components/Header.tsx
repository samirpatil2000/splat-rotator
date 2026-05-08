
import React from 'react';
import { Box, Share2, Github, Info } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Box className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-tight">SplatRotate</h1>
          <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Spark2 Engine</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Workspace</a>
          <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Docs</a>
          <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Examples</a>
        </nav>
        <div className="h-6 w-[1px] bg-slate-800 mx-2" />
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Github className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
