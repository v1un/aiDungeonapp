"use client";

import { ClientGameState, Relationship } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Heart,
  Swords,
  Users,
  User,
  UserCheck,
  UserX,
  Clock,
  Star,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import React, { useState } from 'react';

interface RelationshipsScreenProps {
  gameState: ClientGameState;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get icon for relationship type
const getRelationshipIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'lover':
      return <Heart className="text-rose-500" />;
    case 'enemy':
      return <Swords className="text-red-500" />;
    case 'ally':
      return <UserCheck className="text-green-500" />;
    case 'friend':
      return <UserCheck className="text-blue-500" />;
    case 'rival':
      return <UserX className="text-amber-500" />;
    case 'family':
      return <Users className="text-purple-500" />;
    case 'acquaintance':
    default:
      return <User className="text-gray-500" />;
  }
};

// Helper to display intensity as stars
const IntensityStars: React.FC<{ intensity: number }> = ({ intensity }) => {
  const maxStars = 5; // Display max 5 stars
  const normalizedIntensity = Math.ceil((intensity / 10) * maxStars);
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < normalizedIntensity ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}
        />
      ))}
    </div>
  );
};

// Define the Memory type if not already imported
type Memory = {
  content: string;
  importance: number;
  relativeTime?: string;
};

const MemoryItem: React.FC<{ memory: Memory }> = ({ memory }) => {
  // Helper to display importance visually
  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return "text-red-500";
    if (importance >= 6) return "text-amber-500";
    if (importance >= 4) return "text-blue-500";
    return "text-gray-500";
  };

  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1">
          <AlertTriangle size={14} className={getImportanceColor(memory.importance)} />
          <span className="text-xs text-muted-foreground">
            Importance: {memory.importance}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{memory.relativeTime || "recent"}</span>
        </div>
      </div>
      <p className="text-sm">{memory.content}</p>
    </div>
  );
};

const RelationshipCard: React.FC<{
  relationship: Relationship;
  onClick: () => void;
  isSelected: boolean;
}> = ({ relationship, onClick, isSelected }) => {
  return (
    <Card 
      className={`p-3 mb-2 cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-accent/30" : "hover:bg-accent/10"
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {getRelationshipIcon(relationship.type)}
          <div>
            <h3 className="text-sm font-medium">{relationship.characterName}</h3>
            <Badge variant="outline" className="text-xs px-1 py-0 h-auto font-normal">
              {relationship.type}
            </Badge>
          </div>
        </div>
        <IntensityStars intensity={relationship.intensity} />
      </div>
      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
        {relationship.description}
      </p>
    </Card>
  );
};

export function RelationshipsScreen({ gameState, isOpen, onClose }: RelationshipsScreenProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  
  if (!isOpen) {
    return null;
  }

  // Get relationships for the main character
  const relationships = gameState.seriesDetails?.relationships?.main || [];
  
  // Selected character's memories
  const selectedCharacter = relationships.find(r => r.characterId === selectedCharacterId);
  
  // Get the main character's memories related to the selected character
  const mainCharacter = gameState.seriesDetails?.mainCharacter;
  const mainCharacterMemories = mainCharacter?.memoryEntries?.filter(
    memory => selectedCharacterId && memory.content.toLowerCase().includes(selectedCharacter?.characterName.toLowerCase() || '')
  ) || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <h2 className="text-xl font-bold">Character Relationships</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Relationships list panel */}
            <div className="w-1/3 border-r border-border p-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Your Relationships</h3>
              
              <ScrollArea className="h-[calc(90vh-120px)]">
                <div className="pr-4">
                  {relationships.length > 0 ? (
                    relationships.map((relationship) => (
                      <RelationshipCard
                        key={relationship.characterId}
                        relationship={relationship}
                        onClick={() => setSelectedCharacterId(relationship.characterId)}
                        isSelected={selectedCharacterId === relationship.characterId}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No relationships established yet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
            
            {/* Details panel */}
            <div className="flex-1 p-4">
              {selectedCharacterId ? (
                <Tabs defaultValue="relationship" className="h-full flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-1">
                      {selectedCharacter?.characterName}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      {getRelationshipIcon(selectedCharacter?.type || "")}
                      <Badge>{selectedCharacter?.type}</Badge>
                      <IntensityStars intensity={selectedCharacter?.intensity || 0} />
                    </div>
                    <TabsList>
                      <TabsTrigger value="relationship">Relationship</TabsTrigger>
                      <TabsTrigger value="memories">Memories</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <TabsContent value="relationship" className="mt-0">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Description</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedCharacter?.description || "No details available."}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="memories" className="mt-0">
                      <div className="space-y-1">
                        {mainCharacterMemories.length > 0 ? (
                          mainCharacterMemories.map((memory, index) => (
                            <MemoryItem key={index} memory={memory} />
                          ))
                        ) : (
                          <div className="py-8 text-center">
                            <MessageCircle className="mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No memories with this character yet.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-0">
                      <div className="space-y-3">
                        {selectedCharacter?.history?.length ? (
                          selectedCharacter.history.map((event, i) => (
                            <div key={i} className="border-b border-border pb-3">
                              <div className="flex justify-between items-center mb-1">
                                <Badge variant={event.impact > 0 ? "default" : event.impact < 0 ? "destructive" : "outline"}>
                                  {event.impact > 0 ? "Positive" : event.impact < 0 ? "Negative" : "Neutral"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm">{event.event}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No relationship history recorded.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <User className="mx-auto text-muted-foreground mb-2" size={32} />
                    <p className="text-muted-foreground">Select a character to view relationship details.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
