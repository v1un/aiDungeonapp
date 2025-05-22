// src/components/hud/MinimapPlaceholder.tsx
"use client";

import { Compass } from 'lucide-react';

export function MinimapPlaceholder() {
  return (
    <div className="w-24 h-24 rounded-full border border-amber-800/60 bg-stone-800/80 
                  flex items-center justify-center overflow-hidden relative">
      {/* Fantasy map gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-stone-700/70 to-stone-950/90 opacity-60"></div>
      
      {/* Fictional compass rose pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 border-2 border-amber-700/20 rounded-full"></div>
        <div className="w-16 h-16 border border-amber-700/30 rounded-full absolute"></div>
        <div className="absolute h-full w-[1px] bg-amber-600/20"></div>
        <div className="absolute w-full h-[1px] bg-amber-600/20"></div>
      </div>
      
      {/* Center "you are here" marker */}
      <div className="w-2 h-2 bg-amber-400 rounded-full z-10 shadow-[0_0_5px_2px_rgba(217,119,6,0.4)]"></div>
      
      <Compass className="absolute bottom-1 right-1 h-4 w-4 text-amber-500/80" />
    </div>
  );
}
