
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails, Quest, GameSession } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent as UISidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { Settings, ChevronDown, PlusCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LOCAL_STORAGE_GAME_SESSIONS_KEY, DEFAULT_SESSION_ID } from '@/config/constants';

const initialAiWelcomeMessage: Message = {
  id: 'ai-initial-welcome-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore, or choose an existing game from the menu.",
  timestamp: Date.now(),
};

const createNewSession = (idSuffix: string | number = Date.now()): GameSession => {
  // Ensure a unique ID for new sessions, even if created rapidly
  const uniqueId = `${DEFAULT_SESSION_ID}${idSuffix}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: uniqueId,
    name: "New Game",
    lastPlayed: Date.now(),
    gameState: {
      inventory: [],
      currentLocation: "Not yet initialized",
      activeQuests: [],
      userDisplayName: typeof window !== 'undefined' ? localStorage.getItem('mysticChatways_userDisplayName') || undefined : undefined,
      seriesDetails: undefined,
    },
    messages: [initialAiWelcomeMessage],
  };
};


export function ChatWindow() {
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Derived states based on activeSession
  const [messages, setMessages] = useState<Message[]>([]);
  const [gameState, setGameState] = useState<ClientGameState>({
    inventory: [],
    currentLocation: "Not yet initialized",
    activeQuests: [],
    seriesDetails: undefined,
    userDisplayName: undefined,
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const storedSessionsString = localStorage.getItem(LOCAL_STORAGE_GAME_SESSIONS_KEY);
      let loadedSessions: GameSession[] = [];

      if (storedSessionsString) {
        loadedSessions = JSON.parse(storedSessionsString) as GameSession[];
      }

      if (loadedSessions.length > 0) {
        loadedSessions.sort((a, b) => b.lastPlayed - a.lastPlayed);
        setAllSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
      } else {
        const newSession = createNewSession();
        setAllSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    } catch (error) {
      console.error("Error loading sessions from localStorage:", error);
      const newSession = createNewSession('fallback');
      setAllSessions([newSession]);
      setActiveSessionId(newSession.id);
    }
    const storedUserName = localStorage.getItem('mysticChatways_userDisplayName');
    if (storedUserName) {
        setGameState(prev => ({...prev, userDisplayName: storedUserName}));
    }
    setIsInitialLoadComplete(true);
  }, []);

  // Effect to update messages and gameState when activeSessionId changes or allSessions updates
  useEffect(() => {
    if (!activeSessionId || !isInitialLoadComplete) return;

    const currentActiveSession = allSessions.find(s => s.id === activeSessionId);
    if (currentActiveSession) {
      setMessages(currentActiveSession.messages);
      setGameState(currentActiveSession.gameState);
       // Ensure userDisplayName from localStorage is prioritized if session doesn't have one yet
      const storedUserName = localStorage.getItem('mysticChatways_userDisplayName');
      if (storedUserName && !currentActiveSession.gameState.userDisplayName) {
        setGameState(prev => ({...prev, userDisplayName: storedUserName}));
      } else if (currentActiveSession.gameState.userDisplayName){
         setGameState(prev => ({...prev, userDisplayName: currentActiveSession.gameState.userDisplayName}));
      }

    } else if (allSessions.length > 0) {
      setActiveSessionId(allSessions[0].id);
    } else {
      const newSession = createNewSession('active_fallback');
      setAllSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages(newSession.messages);
      setGameState(newSession.gameState);
    }
  }, [activeSessionId, allSessions, isInitialLoadComplete]);


  // Save all sessions to localStorage whenever allSessions array is modified
  useEffect(() => {
    if (!isInitialLoadComplete || allSessions.length === 0) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_GAME_SESSIONS_KEY, JSON.stringify(allSessions));
    } catch (error) {
      console.error("Error saving sessions to localStorage:", error);
    }
  }, [allSessions, isInitialLoadComplete]);


  const updateActiveSessionMessages = useCallback((newMessages: Message[]) => {
    if (!activeSessionId) return;
    setMessages(newMessages);
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: newMessages, lastPlayed: Date.now() }
          : session
      ).sort((a,b) => b.lastPlayed - a.lastPlayed) // Keep sorted by lastPlayed
    );
  }, [activeSessionId]);

  const updateActiveSessionGameState = useCallback((newGameState: ClientGameState) => {
    if (!activeSessionId) return;
    setGameState(newGameState);
    const sessionName = newGameState.seriesDetails ? newGameState.seriesDetails.seriesTitle : "New Game";
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? { ...session, gameState: newGameState, name: sessionName, lastPlayed: Date.now() }
          : session
      ).sort((a,b) => b.lastPlayed - a.lastPlayed) // Keep sorted by lastPlayed
    );
  }, [activeSessionId]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading || !activeSessionId) return;

    const userMessage: Message = {
      id: 'player-' + Date.now(),
      sender: 'player',
      text: inputValue,
      timestamp: Date.now(),
    };

    const currentMessages = [...messages, userMessage];
    updateActiveSessionMessages(currentMessages);
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
      updateActiveSessionMessages([...currentMessages, aiMessage]);

      if (result.gameStateUpdate) {
        const updatedClientGameState: ClientGameState = {
          ...gameState,
          seriesDetails: result.gameStateUpdate?.seriesDetails || gameState.seriesDetails,
          inventory: result.gameStateUpdate?.inventory || gameState.inventory,
          currentLocation: result.gameStateUpdate?.currentLocation || gameState.currentLocation,
          activeQuests: result.gameStateUpdate?.activeQuests || gameState.activeQuests,
          userDisplayName: localStorage.getItem('mysticChatways_userDisplayName') || gameState.userDisplayName, // Re-check userDisplayName
        };
        updateActiveSessionGameState(updatedClientGameState);
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
      updateActiveSessionMessages([...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentLoadingMessage(undefined);
    }
  };

  const handleStartNewGame = () => {
    const newSession = createNewSession();
    setAllSessions(prevSessions => [newSession, ...prevSessions].sort((a,b) => b.lastPlayed - a.lastPlayed)); // Add to start, then re-sort
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId: string) => {
    // Touch the lastPlayed to bring it to the top of the sorted list
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, lastPlayed: Date.now() }
          : session
      ).sort((a,b) => b.lastPlayed - a.lastPlayed)
    );
    setActiveSessionId(sessionId);
  };

  const activeSessionName = allSessions.find(s => s.id === activeSessionId)?.name || "Loading...";

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
              <SidebarTrigger className="mr-2 md:hidden" /> {/* Trigger for mobile */}
              <h1 className="text-lg font-semibold ml-2">Mystic Chatways</h1>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[150px] max-w-[250px] truncate justify-between">
                    <span className="truncate">{activeSessionName}</span>
                    <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                  <DropdownMenuLabel>Game Sessions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allSessions.length > 0 ? allSessions.map(session => (
                    <DropdownMenuItem key={session.id} onSelect={() => handleSelectSession(session.id)}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{session.name}</span>
                        {session.id === activeSessionId && <Check className="h-4 w-4 text-primary" />}
                      </div>
                       <p className="text-xs text-muted-foreground">
                        Last played: {new Date(session.lastPlayed).toLocaleDateString()}
                      </p>
                    </DropdownMenuItem>
                  )) : (
                    <DropdownMenuItem disabled>No saved games yet.</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleStartNewGame}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Start New Game
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/settings" passHref>
                <Button variant="ghost" size="icon" aria-label="Settings">
                  <Settings size={20} />
                </Button>
              </Link>
            </div>
          </div>
           {isInitialLoadComplete && activeSessionId ? (
            <ChatLayout
                messages={messages}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                customLoadingMessage={currentLoadingMessage}
            />
            ) : (
            <div className="flex-grow flex items-center justify-center">
                <p>Loading your adventure sessions...</p>
            </div>
            )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
    
