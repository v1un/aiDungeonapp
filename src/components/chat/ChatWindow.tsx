
"use client";

import React, { useState, useEffect } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails, Quest } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent as UISidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const SERIES_DETAILS_STORAGE_KEY = 'mysticChatways_seriesDetails'; // Kept for potential direct access/debugging but game state now primary
const CHAT_MESSAGES_STORAGE_KEY = 'mysticChatways_chatMessages';
const GAME_STATE_STORAGE_KEY = 'mysticChatways_gameState';

const initialAiWelcomeMessage: Message = {
  id: 'ai-initial-welcome-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore.",
  timestamp: Date.now(),
};

const initialLocalGameState: ClientGameState = {
  inventory: [],
  currentLocation: "Not yet initialized",
  activeQuests: [],
  userDisplayName: undefined,
  seriesDetails: undefined,
};

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState>(initialLocalGameState);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Effect for initial loading from localStorage
  useEffect(() => {
    try {
      const storedGameStateString = localStorage.getItem(GAME_STATE_STORAGE_KEY);
      const storedMessagesString = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);

      let loadedGameState: ClientGameState = initialLocalGameState;
      let loadedMessages: Message[] = [initialAiWelcomeMessage];

      if (storedGameStateString) {
        const parsedGameState: ClientGameState = JSON.parse(storedGameStateString);
        // Perform basic validation if needed
        if (parsedGameState && typeof parsedGameState === 'object') {
          loadedGameState = parsedGameState;
        }
      }
      
      // If seriesDetails existed under old key, try to merge it if no full game state
      if (!storedGameStateString && localStorage.getItem(SERIES_DETAILS_STORAGE_KEY)) {
          const oldSeriesDetailsString = localStorage.getItem(SERIES_DETAILS_STORAGE_KEY);
          if (oldSeriesDetailsString) {
              try {
                const parsedOldSeriesDetails: SeriesDetails = JSON.parse(oldSeriesDetailsString);
                loadedGameState = {
                    ...initialLocalGameState,
                    seriesDetails: parsedOldSeriesDetails,
                    inventory: parsedOldSeriesDetails.initialInventory || [],
                    currentLocation: parsedOldSeriesDetails.startingLocation || "Unknown",
                    activeQuests: parsedOldSeriesDetails.initialQuest ? [parsedOldSeriesDetails.initialQuest] : [],
                    userDisplayName: localStorage.getItem('mysticChatways_userDisplayName') || undefined,
                };
                // If series details are loaded from old key, show welcome back
                 loadedMessages = [{
                    id: 'ai-welcome-back-old-format-' + Date.now(),
                    sender: 'ai',
                    text: `Welcome back to your adventure in **${parsedOldSeriesDetails.seriesTitle}**! What would you like to do?`,
                    timestamp: Date.now(),
                }];
              } catch (e) {
                  console.warn("Could not parse old series details format, starting fresh.", e);
                  localStorage.removeItem(SERIES_DETAILS_STORAGE_KEY); // Clear corrupted old data
              }
          }
      }


      if (loadedGameState.seriesDetails) { // Game was in progress
        if (storedMessagesString) {
          const parsedMessages: Message[] = JSON.parse(storedMessagesString);
          if (parsedMessages && parsedMessages.length > 0) {
            loadedMessages = parsedMessages;
          } else { // Game state exists, but no messages - offer welcome back
            loadedMessages = [{
              id: 'ai-welcome-back-' + Date.now(),
              sender: 'ai',
              text: `Welcome back to your adventure in **${loadedGameState.seriesDetails.seriesTitle}**! What would you like to do?`,
              timestamp: Date.now(),
            }];
          }
        } else { // Game state exists, but no messages - offer welcome back
           loadedMessages = [{
              id: 'ai-welcome-back-no-messages-' + Date.now(),
              sender: 'ai',
              text: `Welcome back to your adventure in **${loadedGameState.seriesDetails.seriesTitle}**! What would you like to do?`,
              timestamp: Date.now(),
            }];
        }
      }
      // If no game state at all, loadedMessages will remain initialAiWelcomeMessage

      setGameState(loadedGameState);
      setMessages(loadedMessages);

    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      // Fallback to initial state if loading fails
      setGameState(initialLocalGameState);
      setMessages([initialAiWelcomeMessage]);
    }
    setIsInitialLoadComplete(true);
  }, []);

  // Effect for saving messages to localStorage
  useEffect(() => {
    if (!isInitialLoadComplete) return; // Don't save during initial hydration
    try {
      localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  }, [messages, isInitialLoadComplete]);

  // Effect for saving game state to localStorage
  useEffect(() => {
    if (!isInitialLoadComplete) return; // Don't save during initial hydration
    try {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.error("Error saving game state to localStorage:", error);
    }
  }, [gameState, isInitialLoadComplete]);


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
      // Pass current game state (not just seriesDetails) to processPlayerInput if needed
      // For now, processPlayerInput internally uses server-side state after initialization
      const result: ProcessedPlayerInput = await processPlayerInput(userMessage.text, currentMessages);
      
      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: result.responseText,
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

      if (result.gameStateUpdate) {
        const updatedClientGameState = {
          ...gameState, // Start with current client game state
          seriesDetails: result.gameStateUpdate?.seriesDetails || gameState.seriesDetails,
          inventory: result.gameStateUpdate?.inventory || gameState.inventory,
          currentLocation: result.gameStateUpdate?.currentLocation || gameState.currentLocation,
          activeQuests: result.gameStateUpdate?.activeQuests || gameState.activeQuests,
        };
        setGameState(updatedClientGameState);
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
              {/* SidebarTrigger is now part of GameSidebar */}
              <h1 className="text-lg font-semibold ml-2">Mystic Chatways</h1>
            </div>
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings size={20} />
              </Button>
            </Link>
          </div>
           {isInitialLoadComplete ? (
            <ChatLayout
                messages={messages}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                customLoadingMessage={currentLoadingMessage}
            />
            ) : (
            // Optional: Basic loading state for the chat area until localStorage is processed
            <div className="flex-grow flex items-center justify-center">
                <p>Loading your adventure...</p>
            </div>
            )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
