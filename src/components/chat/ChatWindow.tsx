
"use client";

import React, { useState, useEffect } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent as UISidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const initialAiMessage: Message = {
  id: 'ai-start-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore.",
  timestamp: Date.now(),
};

const initialGameState: ClientGameState = {
  inventory: [],
  currentLocation: "Not yet initialized",
  activeQuests: [],
  userDisplayName: undefined,
};

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState>(initialGameState);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const storedName = localStorage.getItem('mysticChatways_userDisplayName');
    if (storedName) {
      setGameState(prev => ({ ...prev, userDisplayName: storedName }));
    }
  }, []);


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

    if (!gameState.seriesDetails) {
      setCurrentLoadingMessage("Crafting your series, this might take a moment...");
    } else {
      setCurrentLoadingMessage(undefined); 
    }

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
          activeQuests: result.gameStateUpdate?.activeQuests || prev.activeQuests,
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
      setCurrentLoadingMessage(undefined);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar side="left" className="w-80 border-r border-border" collapsible="icon">
          <UISidebarContent>
             <GameSidebar 
                seriesDetails={gameState.seriesDetails}
                inventory={gameState.inventory}
                currentLocation={gameState.currentLocation}
                activeQuests={gameState.activeQuests}
                userDisplayName={gameState.userDisplayName}
              />
          </UISidebarContent>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold ml-2">Mystic Chatways</h1>
            </div>
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings size={20} />
              </Button>
            </Link>
          </div>
          <ChatLayout
            messages={messages}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            customLoadingMessage={currentLoadingMessage}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
