
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
    <div className="flex flex-col h-full bg-background/80 backdrop-blur-sm text-card-foreground rounded-xl shadow-xl border border-border/30 overflow-hidden relative">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-accent/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Header */}
      <div className="p-3 border-b border-border/20 bg-card/30 backdrop-blur-sm flex items-center justify-between relative z-10">
        <h2 className="text-md font-semibold group-data-[state=collapsed]:hidden flex items-center">
          <Info size={18} className="mr-2 text-gradient" /> 
          <span className="text-gradient">Adventure Panel</span>
        </h2>
        <SidebarTrigger className="hover:bg-primary/10 text-primary transition-colors" />
      </div>
      
      <ScrollArea className="flex-grow p-4 group-data-[state=collapsed]:p-2 styled-scrollbar relative z-10">
        <div className="space-y-6 animate-fade-in">

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
            <Card className="bg-gradient-to-br from-background/70 to-background/90 border-white/10 shadow-xl overflow-hidden group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="group-data-[state=collapsed]:p-2 group-data-[state=collapsed]:py-3 pb-2">
                <CardTitle className="text-lg flex items-center group-data-[state=collapsed]:justify-center">
                  <div className="mr-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center group-data-[state=collapsed]:mr-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="group-data-[state=collapsed]:hidden">{mc.name}'s Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm group-data-[state=collapsed]:hidden pt-0">
                {stats?.strength && (
                  <div className="flex items-center gap-2">
                    <div className="flex-none w-7 h-7 rounded-full bg-background/50 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-xs text-muted-foreground mb-1">Strength</div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full" 
                          style={{ width: `${Math.min(parseInt(stats.strength.toString()) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-none font-mono text-xs">{stats.strength}</div>
                  </div>
                )}
                {stats?.dexterity && (
                  <div className="flex items-center gap-2">
                    <div className="flex-none w-7 h-7 rounded-full bg-background/50 flex items-center justify-center">
                      <Swords className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-xs text-muted-foreground mb-1">Dexterity</div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full" 
                          style={{ width: `${Math.min(parseInt(stats.dexterity.toString()) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-none font-mono text-xs">{stats.dexterity}</div>
                  </div>
                )}
                {stats?.intelligence && (
                  <div className="flex items-center gap-2">
                    <div className="flex-none w-7 h-7 rounded-full bg-background/50 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-xs text-muted-foreground mb-1">Intelligence</div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full" 
                          style={{ width: `${Math.min(parseInt(stats.intelligence.toString()) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-none font-mono text-xs">{stats.intelligence}</div>
                  </div>
                )}
                {stats?.magicPower && stats.magicPower !== 'N/A' && (
                  <div className="flex items-center gap-2">
                    <div className="flex-none w-7 h-7 rounded-full bg-background/50 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-xs text-muted-foreground mb-1">Magic Power</div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full" 
                          style={{ width: `${Math.min(parseInt(stats.magicPower.toString()) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-none font-mono text-xs">{stats.magicPower}</div>
                  </div>
                )}
                {stats?.luck && (
                  <div className="flex items-center gap-2">
                    <div className="flex-none w-7 h-7 rounded-full bg-background/50 flex items-center justify-center">
                      <Clover className="h-4 w-4 text-primary/80" />
                    </div>
                    <div className="flex-grow">
                      <div className="text-xs text-muted-foreground mb-1">Luck</div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full" 
                          style={{ width: `${Math.min(parseInt(stats.luck.toString()) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-none font-mono text-xs">{stats.luck}</div>
                  </div>
                )}
                {stats?.specialAbility && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-none w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <Star className="h-4 w-4 text-accent" />
                      </div>
                      <div className="text-sm font-medium">Special Ability</div>
                    </div>
                    <div className="ml-9 text-xs text-muted-foreground italic">
                      "{stats.specialAbility}"
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Conditional rendering for the Lorebook button */}
          {seriesDetails && (
            <>
              <Separator className="group-data-[state=collapsed]:hidden" />
              <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
                 <Link href="/lorebook" passHref legacyBehavior>
                  <Button variant="outline" className="w-full group-data-[state=collapsed]:w-auto group-data-[state=collapsed]:p-2">
                    <BookOpen className="mr-2 h-5 w-5 text-primary group-data-[state=collapsed]:mr-0" />
                    <span className="group-data-[state=collapsed]:hidden">View Lorebook</span>
                  </Button>
                </Link>
              </div>
            </>
          )}
          {seriesDetails && (
            <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-semibold flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
                  <div className="mr-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center group-data-[state=collapsed]:mr-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="group-data-[state=collapsed]:hidden">Current Location</span>
                </h3>
              </div>
              <div className="glass-effect p-3 rounded-lg border border-white/5 group-data-[state=collapsed]:hidden animate-pulse-light shadow-lg">
                <p className="text-sm">{currentLocation || 'Unknown'}</p>
              </div>
            </div>
          )}
          <Separator className="group-data-[state=collapsed]:hidden border-white/10"/>

          <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
                <div className="mr-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center group-data-[state=collapsed]:mr-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="group-data-[state=collapsed]:hidden">Inventory</span>
              </h3>
            </div>
            
            <div className="glass-effect rounded-lg border border-white/5 group-data-[state=collapsed]:hidden shadow-lg overflow-hidden">
              {inventory && inventory.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {inventory.map((item, index) => (
                    <li key={index} className="p-2 hover:bg-primary/5 transition-colors flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent/50"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-center">
                  <p className="text-sm text-muted-foreground italic">Inventory is empty</p>
                </div>
              )}
            </div>
          </div>

          <Separator className="group-data-[state=collapsed]:hidden border-white/10"/>

          <div className="group-data-[state=collapsed]:flex group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:items-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold flex items-center group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:text-xs">
                <div className="mr-2 h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center group-data-[state=collapsed]:mr-0">
                  <ScrollText className="h-4 w-4 text-primary" />
                </div>
                <span className="group-data-[state=collapsed]:hidden">Active Quests</span>
              </h3>
            </div>
            
            <div className="group-data-[state=collapsed]:hidden space-y-2">
              {activeQuests.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {activeQuests.map((quest) => (
                    <AccordionItem 
                      value={quest.id} 
                      key={quest.id} 
                      className="glass-effect mb-2 rounded-lg overflow-hidden border border-white/5 shadow-md"
                    >
                      <AccordionTrigger className="text-sm hover:no-underline p-3 bg-background/50 hover:bg-background/70 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-accent"></div>
                          <span>{quest.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm space-y-3 p-3 animate-slide-up">
                        <div className="bg-background/30 p-3 rounded-md text-foreground/90 italic border border-white/5">
                          {quest.description}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-primary/90 flex items-center gap-1">
                            <Target size={14} /> Objectives
                          </h4>
                          <ul className="bg-background/30 rounded-md overflow-hidden border border-white/5 divide-y divide-white/5">
                            {quest.objectives.map((obj, idx) => (
                              <li key={idx} className="p-2 flex items-center gap-2 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/70"></div>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="space-y-2">  
                          <h4 className="font-semibold text-sm text-accent/90 flex items-center gap-1">
                            <Star size={14} /> Rewards
                          </h4>
                          <ul className="bg-background/30 rounded-md overflow-hidden border border-white/5 divide-y divide-white/5">
                            {quest.rewards.map((rew, idx) => (
                              <li key={idx} className="p-2 flex items-center gap-2 text-xs">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent/70"></div>
                                {rew}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="glass-effect p-3 rounded-lg border border-white/5 text-center shadow-lg">
                  <p className="text-sm text-muted-foreground italic">No active quests</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Link to Lorebook */}
          <div className="mt-6 group-data-[state=collapsed]:hidden">
            <Link href="/lorebook" passHref>
              <Button variant="outline" className="w-full glass-effect border-white/10 hover:bg-primary/20 transition-colors shadow-md">
                <BookOpen className="mr-2 h-4 w-4" /> Open Lorebook
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
