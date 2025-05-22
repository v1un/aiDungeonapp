// src/components/screens/QuestLogScreen.tsx
"use client";

import type { ClientGameState, Quest } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollText, Target, Star, Info } from 'lucide-react'; // Added Info for status

interface QuestLogScreenProps {
  gameState: ClientGameState;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestLogScreen({ gameState, isOpen, onClose }: QuestLogScreenProps) {
  if (!isOpen) {
    return null;
  }

  const activeQuests = gameState.activeQuests;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-background border border-border rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Quest Log</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:bg-muted/50">Close</Button>
        </div>
        
        <div className="flex-grow overflow-y-auto styled-scrollbar pr-2"> {/* Added pr-2 for scrollbar spacing */}
          {!activeQuests || activeQuests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <ScrollText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-xl text-muted-foreground">No active quests.</p>
              <p className="text-sm text-muted-foreground/80">Embark on a new adventure to find quests!</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3">
              {activeQuests.map((quest: Quest, index: number) => ( // Added explicit types for quest and index
                <AccordionItem 
                  value={quest.id || `quest-${index}`} // Ensure quest.id exists or use index as fallback
                  key={quest.id || `quest-${index}`} 
                  className="bg-muted/30 rounded-lg border border-border/70 shadow-sm transition-all hover:border-primary/50"
                >
                  <AccordionTrigger className="text-lg hover:no-underline p-4 rounded-t-lg group">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <ScrollText className="h-5 w-5 text-primary group-hover:text-primary-focus transition-colors" />
                        <span className="font-semibold text-foreground text-left">{quest.title}</span>
                      </div>
                      {quest.status && (
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                          quest.status.toLowerCase() === 'active' ? 'bg-green-500/20 text-green-400' :
                          quest.status.toLowerCase() === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400' // Default for other statuses
                        }`}>
                          {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0 space-y-4 text-sm bg-background/30 rounded-b-lg">
                    {quest.description && (
                      <p className="italic text-muted-foreground">{quest.description}</p>
                    )}
                    
                    {quest.objectives && quest.objectives.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base mb-1.5 flex items-center gap-2 text-foreground/90"><Target size={16} className="text-primary/80"/> Objectives</h4>
                        <ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground">
                          {quest.objectives.map((obj, idx) => <li key={idx}>{obj}</li>)}
                        </ul>
                      </div>
                    )}

                    {quest.rewards && quest.rewards.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-base mb-1.5 flex items-center gap-2 text-foreground/90"><Star size={16} className="text-yellow-400/80"/> Rewards</h4>
                        <ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground">
                          {quest.rewards.map((rew, idx) => <li key={idx}>{rew}</li>)}
                        </ul>
                      </div>
                    )}

                    {!quest.description && (!quest.objectives || quest.objectives.length === 0) && (!quest.rewards || quest.rewards.length === 0) && (
                       <p className="text-muted-foreground text-center py-2">No further details available for this quest.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
