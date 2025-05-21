
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
    <div className="flex flex-col h-full w-full bg-background/95 backdrop-blur-sm text-foreground overflow-hidden relative border-r border-border/10 transition-all duration-300">
      {/* Enhanced background elements with subtle animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl group-data-[state=collapsed]:opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-accent/5 rounded-full blur-3xl group-data-[state=collapsed]:opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 left-1/4 w-[150px] h-[150px] bg-secondary/5 rounded-full blur-3xl group-data-[state=collapsed]:opacity-0 animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      </div>
      
      {/* Improved Header with better responsive design */}
      <div className="px-4 py-3 border-b border-border/10 bg-background/90 backdrop-blur-sm flex items-center justify-between relative z-10 sticky top-0">
        <h2 className="text-sm font-semibold tracking-wide group-data-[state=collapsed]:hidden flex items-center text-foreground/90">
          <Info size={16} className="mr-2 text-primary animate-pulse-slow" /> 
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Adventure Panel</span>
        </h2>
        <SidebarTrigger className="h-8 w-8 p-0 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all rounded-full flex items-center justify-center" />
      </div>
      
      <ScrollArea className="flex-grow w-full px-4 py-3 styled-scrollbar relative z-10 pb-4">
        <div className="space-y-5 animate-fade-in">
          {/* Player info section */}
          {(userDisplayName || mc?.name) && (
            <div className="text-sm text-muted-foreground group-data-[state=collapsed]:hidden">
              {userDisplayName ? (
                <p className="truncate"><span className="font-semibold text-foreground">Player:</span> {userDisplayName}</p>
              ) : (
                mc?.name && <p className="truncate">Playing as: <span className="font-semibold text-foreground">{mc.name}</span></p>
              )}
            </div>
          )}
          {(userDisplayName || mc?.name) && <Separator className="group-data-[state=collapsed]:hidden" />}

          {/* Character Stats */}
          {seriesDetails && mc && (
            <Card className="bg-background/80 border border-border/10 shadow-sm overflow-hidden hover:border-border/20 transition-all duration-200">
              <CardHeader className="p-3 group-data-[state=collapsed]:p-2">
                <CardTitle className="flex items-center group-data-[state=collapsed]:justify-center">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center group-data-[state=collapsed]:mx-auto">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="ml-2 text-base group-data-[state=collapsed]:hidden">Stats</span>
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
          {/* Enhanced Location */}
          <Card className="bg-gradient-to-br from-background/70 to-background/90 border border-primary/10 shadow-md overflow-hidden hover:border-primary/30 transition-all duration-200">
            <CardHeader className="p-3 group-data-[state=collapsed]:p-2">
              <CardTitle className="flex items-center group-data-[state=collapsed]:justify-center">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center group-data-[state=collapsed]:mx-auto animate-pulse-slow">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span className="ml-2 text-base group-data-[state=collapsed]:hidden bg-clip-text text-transparent bg-gradient-to-r from-primary/90 to-primary">Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4 text-sm group-data-[state=collapsed]:hidden">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-foreground/90">{currentLocation || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Inventory */}
          <Card className="bg-gradient-to-br from-background/70 to-background/90 border border-primary/10 shadow-md overflow-hidden hover:border-primary/30 transition-all duration-200">
            <CardHeader className="p-3 group-data-[state=collapsed]:p-2">
              <CardTitle className="flex items-center group-data-[state=collapsed]:justify-center">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center group-data-[state=collapsed]:mx-auto animate-pulse-slow" style={{ animationDelay: '1s' }}>
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="ml-2 text-base group-data-[state=collapsed]:hidden bg-clip-text text-transparent bg-gradient-to-r from-primary/90 to-primary">Inventory</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="px-4 pb-4 group-data-[state=collapsed]:hidden">
              <div className="rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
                {inventory && inventory.length > 0 ? (
                  <ul className="divide-y divide-border/20">
                    {inventory.map((item, index) => (
                      <li key={index} className="p-3 hover:bg-primary/10 transition-colors flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/70 flex-shrink-0"></div>
                        <span className="text-sm truncate text-foreground/90">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Inventory is empty</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Active Quests */}
          <Card className="bg-gradient-to-br from-background/70 to-background/90 border border-primary/10 shadow-md overflow-hidden hover:border-primary/30 transition-all duration-200">
            <CardHeader className="p-3 group-data-[state=collapsed]:p-2">
              <CardTitle className="flex items-center group-data-[state=collapsed]:justify-center">
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center group-data-[state=collapsed]:mx-auto animate-pulse-slow" style={{ animationDelay: '2s' }}>
                  <ScrollText className="h-4 w-4 text-primary" />
                </div>
                <span className="ml-2 text-base group-data-[state=collapsed]:hidden bg-clip-text text-transparent bg-gradient-to-r from-primary/90 to-primary">Quests</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 group-data-[state=collapsed]:hidden">
              <div className="rounded-lg bg-primary/5 border border-primary/10 overflow-hidden">
                {activeQuests.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {activeQuests.map((quest) => (
                      <AccordionItem 
                        value={quest.id} 
                        key={quest.id} 
                        className="border-b border-primary/10 last:border-b-0"
                      >
                        <AccordionTrigger className="text-sm hover:no-underline py-2.5 px-3 hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-2.5 w-full">
                            <div className="w-2 h-2 rounded-full bg-primary/70 flex-shrink-0"></div>
                            <span className="truncate font-medium text-foreground/90">{quest.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm space-y-3 p-3 bg-background/30">
                          <div className="p-3 rounded-lg bg-primary/5 text-foreground/80 italic border border-primary/10">
                            {quest.description}
                          </div>
                          
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                              <Target size={14} className="flex-shrink-0" /> Objectives
                            </h4>
                            <ul className="bg-background/50 rounded-lg overflow-hidden border border-primary/10 divide-y divide-primary/5">
                              {quest.objectives.map((obj, idx) => (
                                <li key={idx} className="p-2 flex items-center gap-2.5 hover:bg-primary/5 transition-colors">
                                  <div className="w-2 h-2 rounded-full bg-primary/70 flex-shrink-0"></div>
                                  <span className="text-sm text-foreground/80">{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="space-y-2">  
                            <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                              <Star size={14} className="flex-shrink-0" /> Rewards
                            </h4>
                            <ul className="bg-background/50 rounded-lg overflow-hidden border border-primary/10 divide-y divide-primary/5">
                              {quest.rewards.map((rew, idx) => (
                                <li key={idx} className="p-2 flex items-center gap-2.5 hover:bg-primary/5 transition-colors">
                                  <div className="w-2 h-2 rounded-full bg-primary/70 flex-shrink-0"></div>
                                  <span className="text-sm text-foreground/80">{rew}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No active quests</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Enhanced Link to Lorebook */}
          <div className="mt-6 mb-4 group-data-[state=collapsed]:hidden">
            <Link href="/lorebook" passHref>
              <Button 
                variant="default" 
                className="w-full bg-gradient-to-r from-primary/80 to-primary hover:from-primary hover:to-primary/90 text-primary-foreground border-none transition-all duration-300 shadow-lg"
              >
                <BookOpen className="mr-2 h-5 w-5 animate-pulse-slow" /> Explore Lorebook
              </Button>
            </Link>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
