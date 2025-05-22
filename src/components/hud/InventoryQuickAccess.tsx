"use client";

import { Backpack } from 'lucide-react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface InventoryQuickAccessProps {
  inventory: string[];
}

export function InventoryQuickAccess({ inventory }: InventoryQuickAccessProps) {
  // Display at most 3 items in the quick inventory
  const displayItems = inventory.slice(0, 3);
  const additionalCount = Math.max(0, inventory.length - 3);
  
  return (
    <TooltipProvider>
      <div className="flex items-center bg-stone-800/80 rounded-md px-3 py-1.5 border border-amber-800/40">
        <Backpack className="h-4 w-4 mr-2 text-amber-500" />
        
        {inventory.length === 0 ? (
          <span className="text-sm text-gray-400">Empty</span>
        ) : (
          <div className="flex gap-2">
            {displayItems.map((item, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div className="w-7 h-7 flex items-center justify-center border border-amber-700/40 
                                rounded-md bg-stone-700/70 cursor-pointer hover:bg-amber-900/30 transition-colors">
                    {item.charAt(0)}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{item}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            
            {additionalCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-7 h-7 flex items-center justify-center border border-amber-700/40 
                                rounded-md bg-stone-700/70 cursor-pointer text-xs">
                    +{additionalCount}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{additionalCount} more items</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
