
"use client";

import React, { useState, useEffect } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent as UISidebarContent, SidebarInset } from '@/components/ui/sidebar'; // Note: SidebarContent is aliased
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { PanelLeftOpen } from 'lucide-react';

const initialAiMessage: Message = {
  id: 'ai-start-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore.",
  timestamp: Date.now(),
};

const initialGameState: ClientGameState = {
  inventory: [],
  currentLocation: "Not yet initialized",
};

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState>(initialGameState);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: 'player-' + Date.now(),
      sender: 'player',
      text: inputValue,
      timestamp: Date.now(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      const result: ProcessedPlayerInput = await processPlayerInput(userMessage.text, currentMessages);
      
      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: result.responseText,
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

      if (result.gameStateUpdate) {
        setGameState(prev => ({
          ...prev,
          seriesDetails: result.gameStateUpdate?.seriesDetails || prev.seriesDetails,
          inventory: result.gameStateUpdate?.inventory || prev.inventory,
          currentLocation: result.gameStateUpdate?.currentLocation || prev.currentLocation,
        }));
      }

    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        sender: 'ai',
        text: "Sorry, I'm having trouble connecting. Please try again in a moment.",
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar side="left" className="w-80 border-r border-border">
          <UISidebarContent> {/* Using aliased SidebarContent from ui/sidebar */}
             <GameSidebar 
                seriesDetails={gameState.seriesDetails}
                inventory={gameState.inventory}
                currentLocation={gameState.currentLocation}
              />
          </UISidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
          <div className="p-2 border-b border-border">
             <SidebarTrigger className="md:hidden"> {/* Only show trigger on mobile to open/close */}
                <PanelLeftOpen size={20}/>
             </SidebarTrigger>
          </div>
          <ChatLayout
            messages={messages}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
