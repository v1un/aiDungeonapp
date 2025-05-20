
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { SeriesDetails, Quest } from '@/types';
import { Shield, Swords, Brain, Zap, Clover, Star, MapPin, Package, ScrollText, Target } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface GameSidebarProps {
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
}

export function GameSidebar({ seriesDetails, inventory, currentLocation, activeQuests }: GameSidebarProps) {
  const mc = seriesDetails?.mainCharacter;
  const stats = mc?.stats;

  return (
    <ScrollArea className="h-full p-4 bg-card text-card-foreground rounded-lg shadow-lg">
      <div className="space-y-6">
        {mc && (
          <Card className="bg-background/50 border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Star className="mr-2 h-5 w-5 text-primary" /> {mc.name} - Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {stats?.strength && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Shield className="mr-2 h-4 w-4 text-muted-foreground" /> Strength</span>
                  <span>{stats.strength}</span>
                </div>
              )}
              {stats?.dexterity && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Swords className="mr-2 h-4 w-4 text-muted-foreground" /> Dexterity</span>
                  <span>{stats.dexterity}</span>
                </div>
              )}
              {stats?.intelligence && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Brain className="mr-2 h-4 w-4 text-muted-foreground" /> Intelligence</span>
                  <span>{stats.intelligence}</span>
                </div>
              )}
              {stats?.magicPower && stats.magicPower !== 'N/A' && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Zap className="mr-2 h-4 w-4 text-muted-foreground" /> Magic Power</span>
                  <span>{stats.magicPower}</span>
                </div>
              )}
              {stats?.luck && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center"><Clover className="mr-2 h-4 w-4 text-muted-foreground" /> Luck</span>
                  <span>{stats.luck}</span>
                </div>
              )}
              {stats?.specialAbility && (
                <div className="mt-1 pt-1 border-t border-border/50">
                  <span className="flex items-center font-semibold"><Star className="mr-2 h-4 w-4 text-yellow-400" /> Special</span>
                  <p className="text-xs text-muted-foreground pl-6">{stats.specialAbility}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        <div>
          <h3 className="text-md font-semibold mb-2 flex items-center">
            <MapPin className="mr-2 h-5 w-5 text-primary" /> Current Location
          </h3>
          <p className="text-sm text-muted-foreground p-2 bg-background/50 rounded-md">{currentLocation || 'Unknown'}</p>
        </div>

        <Separator />

        <div>
          <h3 className="text-md font-semibold mb-2 flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" /> Inventory
          </h3>
          {inventory.length > 0 ? (
            <ul className="space-y-1 text-sm list-disc list-inside pl-2">
              {inventory.map((item, index) => (
                <li key={index} className="text-muted-foreground">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">Your inventory is empty.</p>
          )}
        </div>

        <Separator />
        
        <div>
          <h3 className="text-md font-semibold mb-2 flex items-center">
            <ScrollText className="mr-2 h-5 w-5 text-primary" /> Active Quests
          </h3>
          {activeQuests.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {activeQuests.map((quest) => (
                <AccordionItem value={quest.id} key={quest.id} className="border-border/50">
                  <AccordionTrigger className="text-sm hover:no-underline py-2">
                    {quest.title}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs space-y-1 text-muted-foreground">
                    <p>{quest.description}</p>
                    <h4 className="font-medium text-foreground/80 pt-1">Objectives:</h4>
                    <ul className="list-disc list-inside pl-2">
                      {quest.objectives.map((obj, idx) => (
                        <li key={idx} className="flex items-center">
                          <Target size={12} className="mr-2 text-primary/70" /> {obj}
                        </li>
                      ))}
                    </ul>
                     <h4 className="font-medium text-foreground/80 pt-1">Rewards:</h4>
                    <ul className="list-disc list-inside pl-2">
                      {quest.rewards.map((rew, idx) => (
                        <li key={idx}>{rew}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-sm text-muted-foreground italic">No active quests.</p>
          )}
        </div>

      </div>
    </ScrollArea>
  );
}
