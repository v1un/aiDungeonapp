"use client";

import { Quest } from '@/types';
import { Target, CheckCircle2 } from 'lucide-react';

interface ActiveQuestTrackerProps {
  quest: Quest;
}

export function ActiveQuestTracker({ quest }: ActiveQuestTrackerProps) {
  // Display first objective as current goal
  const currentObjective = quest.objectives[0];
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-stone-800/80 rounded-md px-2.5 py-1.5 border border-amber-800/40 max-w-[300px] md:max-w-md">
        <Target className="h-4 w-4 min-w-4 mr-2 text-amber-400" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs opacity-70 truncate">Current Quest: {quest.title}</span>
          <span className="text-sm font-medium text-amber-100 truncate">{currentObjective}</span>
        </div>
      </div>
      
      {/* Objectives counter badge */}
      <div className="h-6 min-w-6 flex items-center justify-center rounded-full bg-amber-900/40 text-xs border border-amber-700/40">
        <CheckCircle2 className="h-3 w-3 mr-1" /> 
        <span>{quest.objectives.length}</span>
      </div>
    </div>
  );
}
