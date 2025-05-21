
"use client";

import React, { useState, useEffect } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails } from '@/types';
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
  seriesDetails: undefined, // Initialize seriesDetails
};

const SERIES_DETAILS_STORAGE_KEY = 'mysticChatways_seriesDetails';

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState>(initialGameState);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    const storedName = localStorage.getItem('mysticChatways_userDisplayName');
    const storedSeriesDetails = localStorage.getItem(SERIES_DETAILS_STORAGE_KEY);

    let newGameState = { ...initialGameState };
    if (storedName) {
      newGameState.userDisplayName = storedName;
    }
    if (storedSeriesDetails) {
      try {
        const parsedSeriesDetails: SeriesDetails = JSON.parse(storedSeriesDetails);
        newGameState = {
          ...newGameState,
          seriesDetails: parsedSeriesDetails,
          inventory: parsedSeriesDetails.initialInventory || [],
          currentLocation: parsedSeriesDetails.startingLocation || "Unknown",
          activeQuests: parsedSeriesDetails.initialQuest ? [parsedSeriesDetails.initialQuest] : [],
        };
         // If series details are loaded, skip the initial AI prompt and show a welcome back
        setMessages([{
          id: 'ai-welcome-back-' + Date.now(),
          sender: 'ai',
          text: `Welcome back to your adventure in **${parsedSeriesDetails.seriesTitle}**! What would you like to do?`,
          timestamp: Date.now(),
        }]);

      } catch (error) {
        console.error("Failed to parse series details from localStorage", error);
        localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY); // Clear corrupted data
      }
    }
    setGameState(newGameState);
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
        const updatedGameState = {
          ...gameState,
          seriesDetails: result.gameStateUpdate?.seriesDetails || gameState.seriesDetails,
          inventory: result.gameStateUpdate?.inventory || gameState.inventory,
          currentLocation: result.gameStateUpdate?.currentLocation || gameState.currentLocation,
          activeQuests: result.gameStateUpdate?.activeQuests || gameState.activeQuests,
        };
        setGameState(updatedGameState);
        // Save seriesDetails to localStorage if it was updated (typically on first generation)
        if (result.gameStateUpdate?.seriesDetails) {
          localStorage.setItem(SERIES_DETAILS_STORAGE_KEY, JSON.stringify(result.gameStateUpdate.seriesDetails));
        }
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
       // If series setup failed, clear stored series details
      if (!gameState.seriesDetails) {
        localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY);
      }
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
              {/* SidebarTrigger is now part of GameSidebar */}
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
