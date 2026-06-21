import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Radio, 
  RotateCcw, 
  Expand, 
  Shrink, 
  Check, 
  Cpu, 
  Bell, 
  ExternalLink 
} from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  safLinked: boolean;
  numTabs: number;
}

export default function AndroidFrame({
  children,
  isFullscreen,
  onToggleFullscreen,
  safLinked,
  numTabs
}: AndroidFrameProps) {
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState(87);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 30000); // 30s update
    return () => clearInterval(interval);
  }, []);

  // Soft random bounce for battery level to look lived-in and real
  useEffect(() => {
    const bInterval = setInterval(() => {
      setBatteryLevel(prev => {
        if (prev <= 5) return 99;
        return prev - 1;
      });
    }, 180000);
    return () => clearInterval(bInterval);
  }, []);

  if (isFullscreen) {
    return (
      <div className="flex-grow flex flex-col h-full bg-neutral-950">
        {/* Fullscreen header strip */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center justify-between font-sans shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-green-400 animate-spin" />
            <span className="text-xs text-white font-mono font-bold tracking-wider">MICRO EDITOR STANDALONE CORE</span>
            <span className="bg-green-950 border border-green-800 text-green-400 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
              Pro Screen State
            </span>
          </div>

          <div className="flex items-center gap-3">
            {safLinked && (
              <span className="text-[10px] text-blue-400 font-mono hidden md:inline-flex items-center gap-1 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30">
                <Check className="w-3 h-3 text-green-400" /> SAF activeURI
              </span>
            )}
            <button
              onClick={onToggleFullscreen}
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded transition border border-neutral-700 cursor-pointer"
            >
              <Shrink className="w-3.5 h-3.5" /> Return to Android Wrap
            </button>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0a0a0a] overflow-y-auto min-h-screen">
      {/* Upper desktop header tools */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between mb-4 gap-2 font-sans shrink-0 px-1">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2 font-mono">
            <div className="w-1.5 h-5 bg-[#00ADD8] rounded-full"></div>
            <span className="text-[#00ADD8]">micro.go</span>
            <span className="text-gray-400 text-sm font-light">editor simulator</span>
          </h1>
          <p className="text-[11px] text-gray-500">
            A premium standalone simulator of Golang's micro editor for Termux and Storage Access Framework (SAF).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleFullscreen}
            className="inline-flex items-center gap-1 bg-[#121212] hover:bg-[#1a1a1a] text-[#00ADD8] text-xs py-1.5 px-3 rounded-lg border border-[#2a2a2a] transition cursor-pointer font-mono font-medium shadow-lg"
            title="Switch to full-screen monospace container"
          >
            <Expand className="w-3.5 h-3.5 text-[#00ADD8]" /> Standalone Desktop Mode
          </button>
        </div>
      </div>

      {/* Main interactive mock phone canvas */}
      <div className="w-full max-w-[960px] aspect-[16/10] md:h-[680px] bg-[#0a0a0a] rounded-3xl border-[10px] border-[#121212] shadow-[0_0_50px_rgba(0,173,216,0.15)] relative flex flex-col overflow-hidden ring-1 ring-neutral-800/85">
        
        {/* Android top hardware bezel camera notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-4 bg-[#121212] rounded-b-xl z-50 flex items-center justify-center">
          <div className="w-8 h-1 bg-black/60 rounded-full mb-1 mr-4" />
          <div className="w-2.5 h-2.5 bg-black/80 rounded-full mb-1" />
        </div>

        {/* Live system status bar */}
        <div className="bg-[#0a0a0a] text-gray-400 text-[10px] font-sans px-6 py-1.5 flex items-center justify-between select-none z-40 shrink-0 border-b border-[#222]">
          <div className="flex items-center gap-1 font-mono">
            <span>{currentTime}</span>
          </div>

          <div className="flex items-center gap-2">
            {safLinked && (
              <span className="text-[9px] bg-[#162125] text-[#00ADD8] px-1.5 py-0.5 rounded border border-[#00ADD8]/30 font-medium font-mono">
                SAF Active
              </span>
            )}
            <Wifi className="w-3 h-3 text-[#00ADD8]" />
            <div className="flex items-center gap-0.5">
              <span className="font-mono text-[9px] text-[#00ADD8]">{batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 text-[#00ADD8] fill-[#00ADD8]/30" />
            </div>
          </div>
        </div>

        {/* Android floating app notification banner simulation (e.g. Termux persistence alert) */}
        <div className="bg-[#121212] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between text-xs text-gray-300 select-none z-40 relative shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-black/40 p-1 rounded">
              <Radio className="w-3.5 h-3.5 text-[#00ADD8] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[10px] text-white">Termux daemon active</span>
              <span className="text-[9px] text-gray-500">Buffers: {numTabs} files loaded</span>
            </div>
          </div>
          <span className="text-[9px] text-[#00ADD8] font-mono font-semibold">PID: 9021</span>
        </div>

        {/* Inner device container: Embed child application interface */}
        <div className="flex-1 flex overflow-hidden bg-[#0a0a0a] relative">
          {children}
        </div>

        {/* Android soft navigation action bar at extremely bottom */}
        <div className="bg-[#0a0a0a] py-1.5 flex justify-around items-center select-none border-t border-[#1a1a1a] shrink-0">
          <div className="w-3.5 h-3.5 border-2 border-gray-600 rounded-sm hover:border-[#00ADD8] transition cursor-pointer" title="Switch Recent Apps" />
          <div className="w-4 h-4 border-2 border-gray-600 rounded-full hover:border-[#00ADD8] transition cursor-pointer" title="Go Home Screen" />
          <div className="w-3 h-3 border-l-2 border-b-2 border-gray-600 hover:border-[#00ADD8] -rotate-45 transition cursor-pointer transform -translate-y-0.5" title="Go Back" />
        </div>
      </div>
    </div>
  );
}
