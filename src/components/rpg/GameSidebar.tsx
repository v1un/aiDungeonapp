
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { SeriesDetails, Quest } from '@/types';
import { Shield, Swords, Brain, Zap, Clover, Star, MapPin, Package, ScrollText, Target, User, Info, BookOpen } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SidebarTrigger } from '@/components/ui/sidebar'; 
import { Button } from '@/components/ui/button';


interface GameSidebarProps {
  seriesDetails?: SeriesDetails;
  inventory: string[];
  currentLocation: string;
  activeQuests: Quest[];
  userDisplayName?: string;
}

export function GameSidebar({ seriesDetails, inventory, currentLocation, activeQuests, userDisplayName }: GameSidebarProps) {
  const mc = seriesDetails?.mainCharacter;
  const stats = mc?.stats;

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground rounded-lg shadow-lg">
      <div className="p-2 border-b border-border/60 flex items-center justify-between">
        <h2 className="text-md font-semibold group-data-[state=collapsed]:hidden flex items-center">
          <Info size={18} className="mr-2 text-primary" /> Game Info
        </h2>
        <SidebarTrigger /> {/* Moved trigger here */}
      </div>
      <ScrollArea className="flex-grow p-4 group-data-[state=collapsed]:p-2">
        <div className="space-y-6">

          {(userDisplayName || mc?.name) && (
            <div className="text-sm text-muted-foreground group-data-[state=collapsed]:hidden">
              {userDisplayName ? (
                <p><span className="font-semibold text-foreground">Player Alias:</span> {userDisplayName}</p>
              ) : (
                mc?.name && <p>Playing as: <span className="font-semibold text-foreground">{mc.name}</span></p>
              )}
            </div>
          )}
          { (userDisplayName || mc?.name) && <Separator className="group-data-[state=collapsed]:hidden" />}

          {seriesDetails && mc && ( 
            <Card className="bg-background/50 border-border">
              <CardHeader className="group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:py-3">
                <CardTitle className="text-lg flex items-center group-data-[state=collapsed]:justify-center">
                  <User className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0" /> 
                  <span className="group-data-[state=collapsed]:hidden">{mc.name}'s Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm group-data-[state=collapsed]:hidden">
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

          <Separator className="group-data-[state=collapsed]:hidden" />
          
          {seriesDetails && (
            <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
               <Link href="/lorebook" passHref legacyBehavior>
                <Button variant="outline" className="w-full group-data-[state=collapsed]:w-auto group-data-[state=collapsed]:p-2">
                  <BookOpen className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0" />
                  <span className="group-data-[state=collapsed]:hidden">View Lorebook</span>
                </Button>
              </Link>
            </div>
          )}
          {seriesDetails && <Separator className="group-data-[state=collapsed]:hidden" />}


          <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
            <h3 className="text-md font-semibold mb-2 flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
              <MapPin className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0 group-data-[state=collapsed]:mb-1 group-data-[state=collapsed]:h-6 group-data-[state=collapsed]:w-6" /> 
              <span className="group-data-[state=collapsed]:hidden">Current Location</span>
            </h3>
            <p className="text-sm text-muted-foreground p-2 bg-background/50 rounded-md group-data-[state=collapsed]:hidden">{currentLocation || 'Unknown'}</p>
          </div>

          <Separator className="group-data-[state=collapsed]:hidden"/>

          <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
            <h3 className="text-md font-semibold mb-2 flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
              <Package className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0 group-data-[state=collapsed]:mb-1 group-data-[state=collapsed]:h-6 group-data-[state=collapsed]:w-6" />
               <span className="group-data-[state=collapsed]:hidden">Inventory</span>
            </h3>
            {inventory && inventory.length > 0 ? (
              <ul className="space-y-1 text-sm list-disc list-inside pl-2 group-data-[state=collapsed]:hidden">
                {inventory.map((item, index) => (
                  <li key={index} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic group-data-[state=collapsed]:hidden">Inventory is empty.</p>
            )}
          </div>

          <Separator className="group-data-[state=collapsed]:hidden"/>
          
          <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
            <h3 className="text-md font-semibold mb-2 flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
              <ScrollText className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0 group-data-[state=collapsed]:mb-1 group-data-[state=collapsed]:h-6 group-data-[state=collapsed]:w-6" /> 
              <span className="group-data-[state=collapsed]:hidden">Active Quests</span>
            </h3>
            {activeQuests.length > 0 ? (
              <Accordion type="single" collapsible className="w-full group-data-[state=collapsed]:hidden">
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
              <p className="text-sm text-muted-foreground italic group-data-[state=collapsed]:hidden">No active quests.</p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

