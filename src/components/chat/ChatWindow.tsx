
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails, Quest, GameSession } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent as UISidebarContent, SidebarInset } from '@/components/ui/sidebar';
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_GAME_SESSIONS_KEY, DEFAULT_SESSION_ID } from '@/config/constants';

const initialAiWelcomeMessage: Message = {
  id: 'ai-initial-welcome-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore.",
  timestamp: Date.now(),
};

const createNewSession = (idSuffix: string | number = Date.now()): GameSession => {
  return {
    id: `${DEFAULT_SESSION_ID}${idSuffix}`,
    name: "New Game",
    lastPlayed: Date.now(),
    gameState: {
      inventory: [],
      currentLocation: "Not yet initialized",
      activeQuests: [],
      userDisplayName: localStorage.getItem('mysticChatways_userDisplayName') || undefined, // Load display name separately for now
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
        // Sort by lastPlayed to get the most recent session
        loadedSessions.sort((a, b) => b.lastPlayed - a.lastPlayed);
        setAllSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
      } else {
        // No sessions, create a new default one
        const newSession = createNewSession();
        setAllSessions([newSession]);
        setActiveSessionId(newSession.id);
      }
    } catch (error) {
      console.error("Error loading sessions from localStorage:", error);
      // Fallback to a single new session if loading fails
      const newSession = createNewSession('fallback');
      setAllSessions([newSession]);
      setActiveSessionId(newSession.id);
    }
    // Load user display name separately - this could be integrated into session/user settings later
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
    } else if (allSessions.length > 0) {
      // Active session ID might be invalid, fallback to the first session
      setActiveSessionId(allSessions[0].id);
    } else {
      // No sessions at all, create a new default one (should be rare if mount logic is correct)
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


  // Update the active session's messages (debounced or direct)
  const updateActiveSessionMessages = useCallback((newMessages: Message[]) => {
    if (!activeSessionId) return;
    setMessages(newMessages); // Update local messages state for immediate UI response
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: newMessages, lastPlayed: Date.now() }
          : session
      )
    );
  }, [activeSessionId]);

  // Update the active session's gameState
  const updateActiveSessionGameState = useCallback((newGameState: ClientGameState) => {
    if (!activeSessionId) return;
    setGameState(newGameState); // Update local gameState for immediate UI response
     const sessionName = newGameState.seriesDetails ? newGameState.seriesDetails.seriesTitle : "New Game";
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? { ...session, gameState: newGameState, name: sessionName, lastPlayed: Date.now() }
          : session
      )
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
    updateActiveSessionMessages(currentMessages); // Save new user message to active session
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
      updateActiveSessionMessages([...currentMessages, aiMessage]); // Save AI message

      if (result.gameStateUpdate) {
        const updatedClientGameState: ClientGameState = {
          ...gameState, // Start with current client game state
          seriesDetails: result.gameStateUpdate?.seriesDetails || gameState.seriesDetails,
          inventory: result.gameStateUpdate?.inventory || gameState.inventory,
          currentLocation: result.gameStateUpdate?.currentLocation || gameState.currentLocation,
          activeQuests: result.gameStateUpdate?.activeQuests || gameState.activeQuests,
          userDisplayName: gameState.userDisplayName, // Preserve user display name
        };
        updateActiveSessionGameState(updatedClientGameState); // Save updated game state
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
      updateActiveSessionMessages([...currentMessages, errorMessage]); // Save error message
    } finally {
      setIsLoading(false);
      setCurrentLoadingMessage(undefined);
    }
  };

  // Placeholder for UI to switch sessions - not implemented in this pass
  // const handleSwitchSession = (sessionId: string) => { setActiveSessionId(sessionId); };

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
            {/* Placeholder for session management UI */}
            {/* <div><small>Active Session: {allSessions.find(s=>s.id === activeSessionId)?.name || 'N/A'}</small></div> */}
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings size={20} />
              </Button>
            </Link>
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

    