"use client";

import React, { useState, useEffect, useCallback } from 'react';
// Ensure type imports are not duplicated and are comprehensive
import type { GameSession, ClientGameState, Message, ProcessedPlayerInput, SeriesDetails, Quest } from '@/types';
// @ts-expect-error UUID library doesn't have proper TypeScript types but works correctly
import { v4 as uuidv4 } from 'uuid';
import { processPlayerInput } from '@/lib/game-actions';
// Removed duplicate type imports that were here

// Import necessary UI components - assuming shadcn/ui structure, adjust if different
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ChevronDown, Edit3, Trash2, PlusCircle, Settings, Sparkles, Check, AlertTriangle 
} from 'lucide-react'; // Assuming lucide-react for icons

import Link from 'next/link'; // For navigation links

// Import other custom components
import InitialSetupScreen from '@/components/screens/InitialSetupScreen'; // Corrected import for default export
import { generateSeriesDetails } from '@/ai/flows/generate-series-details'; // type GenerateSeriesDetailsOutput removed as it's not directly used here
import { useRouter } from 'next/navigation';
import { ChatLayout } from './ChatLayout';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionStatus } from "@/components/status/ConnectionStatus";
import { GameHUD } from '@/components/hud/GameHUD'; // Corrected to named import
import { CharacterScreen } from '@/components/screens/CharacterScreen'; // Corrected to named import
import { QuestLogScreen } from '@/components/screens/QuestLogScreen'; // Corrected to named import


// Constants - ensure these are defined or imported correctly
const DEFAULT_SESSION_ID = 'game-session-';
const LOCAL_STORAGE_KEY = 'mysticChatways_gameSessions';

const initialAiWelcomeMessage: Message = {
  id: 'welcome-message',
  sender: 'ai',
  text: 'Welcome to Mystic Chatways! Please set up your new adventure or select an existing one.',
  timestamp: Date.now(),
};

export default function ChatWindow() {
  const router = useRouter(); // For hotkey navigation

  // State for all game sessions and the active session
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Screen visibility state
  const [isCharacterScreenOpen, setIsCharacterScreenOpen] = useState(false);
  const [isQuestLogScreenOpen, setIsQuestLogScreenOpen] = useState(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false); // New state for initial setup

  // Message-related state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | null>(null);
  
  // API error handling state
  const [showApiErrorDialog, setShowApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  // CachedSeriesPicker related state removed

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  const [gameState, setGameState] = useState<ClientGameState>({
    inventory: [],
    currentLocation: "Not yet initialized",
    activeQuests: [],
    userDisplayName: undefined,
    seriesDetails: undefined,
  });
  
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  const createNewSession = (idSuffix: string | number = Date.now()): GameSession => {
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      
      if (storedSessions) {
        const sessions: GameSession[] = JSON.parse(storedSessions);
        setAllSessions(sessions.sort((a, b) => b.lastPlayed - a.lastPlayed));
        
        if (sessions.length > 0 && !activeSessionId) {
          const mostRecentSession = sessions[0];
          setActiveSessionId(mostRecentSession.id);
          setMessages(mostRecentSession.messages);
          setGameState(mostRecentSession.gameState);
          // Check if this session needs setup
          setNeedsInitialSetup(!mostRecentSession.gameState?.seriesDetails);
          
          if (mostRecentSession.gameState?.seriesDetails) {
            syncSeriesDetailsToLorebook(mostRecentSession.gameState.seriesDetails);
          }
        }
      } else {
        const defaultSession = createNewSession('default');
        setAllSessions([defaultSession]);
        setActiveSessionId(defaultSession.id);
        setMessages(defaultSession.messages);
        setNeedsInitialSetup(true); // New default session needs setup
      }
    } catch (error) {
      console.error('Error loading game sessions:', error);
      const fallbackSession = createNewSession('fallback');
      setAllSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
      setMessages(fallbackSession.messages);
      setNeedsInitialSetup(true); // New fallback session needs setup
    } finally {
      setIsInitialLoadComplete(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || allSessions.length === 0) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSessions));
    } catch (error) {
      console.error('Error saving game sessions:', error);
    }
  }, [allSessions]);

  const handleSelectSession = (sessionId: string) => {
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, lastPlayed: Date.now() }
          : session
      ).sort((a, b) => b.lastPlayed - a.lastPlayed)
    );
    
    const selectedSession = allSessions.find(s => s.id === sessionId);
    if (selectedSession) {
      setActiveSessionId(sessionId);
      setMessages(selectedSession.messages);
      setGameState(selectedSession.gameState);
      setNeedsInitialSetup(!selectedSession.gameState?.seriesDetails); // Check if selected session needs setup
      
      // Sync series details with lorebook - explicitly call here for immediate update
      syncSeriesDetailsToLorebook(selectedSession.gameState?.seriesDetails);
    }
  };

  const handleStartNewGame = () => {
    const newSession = createNewSession();
    setAllSessions(prev => [newSession, ...prev].sort((a, b) => b.lastPlayed - a.lastPlayed));
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    setGameState(newSession.gameState);
    setNeedsInitialSetup(true); // A new game always needs initial setup
    
    // Clear lorebook data when starting a new game
    syncSeriesDetailsToLorebook(undefined);
  };

  const openRenameDialog = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (session) {
      setRenameSessionId(sessionId);
      setRenameInputValue(session.name);
      setIsRenameDialogOpen(true);
    }
  };

  const handleRenameSession = () => {
    if (!renameSessionId || !renameInputValue.trim()) {
      setIsRenameDialogOpen(false);
      return;
    }
    const newName = renameInputValue.trim();
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === renameSessionId
          ? { ...session, name: newName }
          : session
      )
    );
    setIsRenameDialogOpen(false);
    setRenameSessionId(null);
    setRenameInputValue('');
  };

  const openDeleteDialog = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteSessionId) {
      setIsDeleteDialogOpen(false);
      return;
    }
    if (deleteSessionId === activeSessionId) {
      if (allSessions.length > 1) {
        const newActiveSession = allSessions.find(s => s.id !== deleteSessionId);
        setActiveSessionId(newActiveSession?.id || null);
        setMessages(newActiveSession?.messages || []);
        const newGameState = newActiveSession?.gameState || {
          inventory: [], currentLocation: "Not yet initialized", activeQuests: [],
          userDisplayName: undefined, seriesDetails: undefined,
        };
        setGameState(newGameState);
        setNeedsInitialSetup(!newGameState.seriesDetails); // Check if new active session needs setup
        
        // Sync the new active session's series details to lorebook
        syncSeriesDetailsToLorebook(newGameState.seriesDetails);
      } else {
        const newSession = createNewSession();
        setActiveSessionId(newSession.id);
        setMessages(newSession.messages);
        setGameState(newSession.gameState);
        setAllSessions([newSession]);
        setNeedsInitialSetup(true); // The very first session needs setup
        
        // Clear lorebook data if the last session is deleted
        syncSeriesDetailsToLorebook(undefined);
        
        setIsDeleteDialogOpen(false);
        setDeleteSessionId(null);
        return;
      }
    }
    setAllSessions(prev => prev.filter(s => s.id !== deleteSessionId));
    setIsDeleteDialogOpen(false);
    setDeleteSessionId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !activeSessionId) return;
    setIsLoading(true);
    setCurrentLoadingMessage("Processing input...");
    try {
      const playerMessage: Message = {
        id: uuidv4(), sender: 'player', text: inputValue, timestamp: Date.now(),
      };
      const updatedMessages = [...messages, playerMessage];
      setMessages(updatedMessages);
      setInputValue('');
      const processedResult: ProcessedPlayerInput = await processPlayerInput(
        inputValue, messages, activeSessionId
      );
      setCurrentLoadingMessage("Generating response...");
      if (!processedResult) {
        setIsLoading(false);
        setCurrentLoadingMessage(null);
        return;
      }
      const aiMessage: Message = {
        id: uuidv4(), sender: 'ai',
        text: processedResult.responseText || 'I did not understand that. Could you try again?',
        timestamp: Date.now(),
      };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      if (processedResult.gameStateUpdate) {
        setGameState(prevState => ({ ...prevState, ...processedResult.gameStateUpdate }));
      }
      const updatedSession = {
        ...(allSessions.find(s => s.id === activeSessionId) || createNewSession()),
        messages: finalMessages,
        gameState: { ...gameState, ...processedResult.gameStateUpdate },
        lastPlayed: Date.now()
      };
      const sessionExists = allSessions.some(s => s.id === activeSessionId);
      const updatedSessions = sessionExists
        ? allSessions.map(s => s.id === activeSessionId ? updatedSession : s)
        : [...allSessions, updatedSession];
      setAllSessions(updatedSessions);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Extract the error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if this is an AI API error (Google Generative AI)
      if (errorMsg.includes('GoogleGenerativeAI Error') || 
          errorMsg.includes('500 Internal Server Error') || 
          errorMsg.includes('503 Service Unavailable')) {
        
        // Set API error message and show dialog
        setApiErrorMessage(
          // "The AI service is currently experiencing issues. You can choose from previously generated worlds or try again later."
          "The AI service is currently experiencing issues. Please try again later or check your connection."
        );
        setShowApiErrorDialog(true);
      }
      
      const errorMessage: Message = {
        id: uuidv4(), 
        sender: 'ai',
        text: "I'm sorry, I encountered an error while processing your message. Please try again later.",
        timestamp: Date.now(),
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      
      toast({
        title: "Error", 
        description: "Failed to process your message. Please try again.", 
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setCurrentLoadingMessage(null);
    }
  };

  const syncSeriesDetailsToLorebook = useCallback((seriesDetails: SeriesDetails | undefined) => {
    if (seriesDetails && typeof window !== 'undefined') {
      try {
        localStorage.setItem('mysticChatways_seriesDetails', JSON.stringify(seriesDetails));
      } catch (error) {
        console.error('Error syncing series details to lorebook storage:', error);
      }
    } else if (!seriesDetails && typeof window !== 'undefined') {
      // If no series details provided, clear the lorebook cache
      localStorage.removeItem('mysticChatways_seriesDetails');
    }
  }, []);

  useEffect(() => {
    // Sync seriesDetails to lorebook storage whenever it changes
    syncSeriesDetailsToLorebook(gameState.seriesDetails);
  }, [gameState.seriesDetails, syncSeriesDetailsToLorebook]);

  // Make sure to sync on session change
  useEffect(() => {
    if (activeSessionId) {
      const currentSession = allSessions.find(s => s.id === activeSessionId);
      if (currentSession) {
        syncSeriesDetailsToLorebook(currentSession.gameState.seriesDetails);
        setNeedsInitialSetup(!currentSession.gameState?.seriesDetails); // Re-check setup need on active session change
      }
    }
  }, [activeSessionId, allSessions, syncSeriesDetailsToLorebook]);

  const currentSession = React.useMemo(() => 
    allSessions.find(s => s.id === activeSessionId) || null,
    [allSessions, activeSessionId]
  );
  const currentSessionName = currentSession?.name || "New Game";

  const openCharacterScreen = () => setIsCharacterScreenOpen(true);
  const closeCharacterScreen = () => setIsCharacterScreenOpen(false);
  const openQuestLogScreen = () => setIsQuestLogScreenOpen(true);
  const closeQuestLogScreen = () => setIsQuestLogScreenOpen(false);

  // Hotkey handling
  useEffect(() => {
    const handleHotkeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || event.metaKey || event.ctrlKey) {
        return; // Don't trigger hotkeys if typing in an input or meta/ctrl keys are pressed
      }

      const key = event.key.toLowerCase();
      const isAnyScreenOpen = isCharacterScreenOpen || isQuestLogScreenOpen;

      switch (key) {
        case 'c':
          if (isQuestLogScreenOpen) return; // Other screen open, do nothing
          setIsCharacterScreenOpen(prev => !prev);
          break;
        case 'j':
          if (isCharacterScreenOpen) return; // Other screen open, do nothing
          setIsQuestLogScreenOpen(prev => !prev);
          break;
        case 'l':
          if (isAnyScreenOpen) return; // A screen is open, do nothing
          router.push('/lorebook');
          break;
        default:
          // No specific hotkey, do nothing
          break;
      }
    };

    window.addEventListener('keydown', handleHotkeyPress);
    return () => {
      window.removeEventListener('keydown', handleHotkeyPress);
    };
  }, [isCharacterScreenOpen, isQuestLogScreenOpen, router]);

  // handleCachedSeriesSelect removed as CachedSeriesPicker is no longer used here.
  // InitialSetupScreen will handle its own logic for series selection/generation.

  const handleInitialSetupComplete = (seriesDetails: SeriesDetails) => {
    if (!activeSessionId) return;

    const updatedGameState: ClientGameState = {
      ...gameState,
      seriesDetails: seriesDetails,
      inventory: seriesDetails.initialInventory || [],
      currentLocation: seriesDetails.startingLocation || "Unknown Location",
      activeQuests: seriesDetails.initialQuest ? [seriesDetails.initialQuest] : [],
    };
    setGameState(updatedGameState);

    const welcomeMessage: Message = {
      id: uuidv4(),
      sender: 'ai',
      text: seriesDetails.initialPromptForPlayer || `Welcome to ${seriesDetails.seriesTitle}! Your adventure begins. What would you like to do?`,
      timestamp: Date.now(),
    };
    const updatedMessages = [welcomeMessage]; 
    setMessages(updatedMessages);

    const currentSessionDetails = allSessions.find(s => s.id === activeSessionId);
    if (!currentSessionDetails) {
      console.error("Active session not found during setup completion");
      return;
    }

    const updatedSession: GameSession = { 
      ...currentSessionDetails,
      name: seriesDetails.seriesTitle, 
      messages: updatedMessages,
      gameState: updatedGameState,
      lastPlayed: Date.now()
    };

    const updatedSessions = allSessions.map(s => s.id === activeSessionId ? updatedSession : s);
    setAllSessions(updatedSessions);
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error saving updated session after setup:', error);
    }

    syncSeriesDetailsToLorebook(seriesDetails);
    setNeedsInitialSetup(false); 

    toast({
      title: "World Ready!",
      description: `Successfully generated and loaded ${seriesDetails.seriesTitle}.`,
    });
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative flex h-screen w-full overflow-hidden bg-background">
        {/* Background elements */}
        <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[5%] -right-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute top-1/3 left-1/4 w-[70%] h-[70%] bg-secondary/3 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute bottom-[5%] -left-[5%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[40%] h-[40%] bg-primary/3 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
        </div>
        
        <div className="relative z-10 flex w-full h-full">
          {/* GameSidebar and its containing Sidebar component removed */}

          {/* 
            SidebarInset still needs to be part of the layout if SidebarTrigger is used,
            even if the actual sidebar panel is removed.
            The 'group-data-[state=collapsed]:ml-16' would typically respond to the main sidebar's state.
            If there's no collapsible sidebar on the left anymore, this ml-16 might be undesirable
            or might need to be controlled by a different state if a different collapsible behavior is intended.
            For now, per instructions, SidebarInset is kept. The ml-16 might need adjustment later if it causes layout issues without a sidebar.
          */}
          <SidebarInset className="relative flex-1 h-full min-w-0 transition-all duration-200 ease-in-out group-data-[state=collapsed]:ml-0"> {/* Adjusted ml-0 as there's no sidebar to collapse */}
            <div className="h-full w-full max-w-7xl mx-auto px-2 sm:px-4 flex flex-col overflow-hidden">
              <div className="border-b border-border/40 backdrop-blur-sm bg-background/30 py-2 sm:py-3 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center">
                  {/* 
                    SidebarTrigger is kept. It might be intended for other purposes or a future sidebar.
                    If it was strictly for the removed GameSidebar, it might also be removed.
                    However, instructions say to keep SidebarTrigger.
                  */}
                  <SidebarTrigger className="md:hidden mr-2 flex-shrink-0" />
                  <h1 key={currentSession?.id} className="text-sm sm:text-base font-medium truncate max-w-[120px] sm:max-w-[200px]">
                    {currentSessionName}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1 sm:gap-2 hover:bg-primary/10 hover:text-primary transition-colors">
                        <span className="text-xs sm:text-sm font-medium">Switch Game</span>
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-background/80 backdrop-blur-md border-white/10 shadow-xl rounded-xl p-1 animate-fade-in">
                      <DropdownMenuLabel className="text-primary/90 font-medium px-3 py-2">Your Adventures</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <div className="max-h-[250px] overflow-y-auto styled-scrollbar py-1">
                        {allSessions.length > 0 ? allSessions.map((session) => (
                          <DropdownMenuItem
                            key={session.id}
                            className="flex items-center justify-between relative group rounded-lg p-2 mx-1 hover:bg-primary/10 transition-colors"
                            onSelect={() => handleSelectSession(session.id)}
                          >
                            <div className="flex-1 truncate flex items-center">
                              <span className="truncate">{session.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button data-action-button="true" variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/20 hover:text-primary rounded-full" onClick={(e) => { e.stopPropagation(); openRenameDialog(session.id); }} aria-label="Rename session">
                                <Edit3 size={14} />
                              </Button>
                              <Button data-action-button="true" variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-full" onClick={(e) => { e.stopPropagation(); openDeleteDialog(session.id); }} aria-label="Delete session">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            {session.id === activeSessionId && <Check className="h-4 w-4 text-primary absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0" />}
                          </DropdownMenuItem>
                        )) : (
                          <div className="px-3 py-2 text-center text-muted-foreground text-sm">No saved games yet.</div>
                        )}
                      </div>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem onSelect={handleStartNewGame} className="rounded-lg m-1 p-2 hover:bg-primary/10 transition-colors">
                        <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                        Start New Game
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <ConnectionStatus />
                  
                  <Link href="/settings" passHref>
                    <Button variant="ghost" size="icon" aria-label="Settings" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                      <Settings size={18} />
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col min-h-0">
                {isInitialLoadComplete && activeSessionId ? (
                  needsInitialSetup ? (
                    <InitialSetupScreen 
                      onSetupComplete={handleInitialSetupComplete} 
                      onGenerateSeries={async (prompt: string): Promise<SeriesDetails | null> => {
                        try {
                          const details = await generateSeriesDetails({ seriesName: prompt, useCache: true });
                          return details as SeriesDetails; 
                        } catch (error) {
                          console.error("Error generating series details in ChatWindow:", error);
                          if (error instanceof Error) {
                            // Pass the error message to be displayed by InitialSetupScreen
                            throw new Error(error.message || "Failed to generate series details due to an unknown error.");
                          }
                          throw new Error("Failed to generate series details.");
                        }
                      }}
                    />
                  ) : (
                    <ChatLayout
                      messages={messages}
                      inputValue={inputValue}
                      onInputChange={handleInputChange}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      customLoadingMessage={currentLoadingMessage || undefined}
                    />
                  )
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center animate-pulse-light">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                      </div>
                      <p className="text-lg">Loading your adventure sessions...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>

      {/* Add a container with controlled z-index to ensure proper stacking */}
      <div className="relative z-40">
        {isInitialLoadComplete && activeSessionId && gameState && (
          <GameHUD 
            gameState={gameState} 
            onOpenCharacterScreen={openCharacterScreen}
            onOpenQuestLogScreen={openQuestLogScreen}
          />
        )}
      </div>

      {isInitialLoadComplete && activeSessionId && gameState && (
        <CharacterScreen 
          gameState={gameState} 
          isOpen={isCharacterScreenOpen} 
          onClose={closeCharacterScreen} 
        />
      )}

      {isInitialLoadComplete && activeSessionId && gameState && (
        <QuestLogScreen 
          gameState={gameState} 
          isOpen={isQuestLogScreenOpen} 
          onClose={closeQuestLogScreen} 
        />
      )}

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Game Session</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessionName" className="text-right">Name</Label>
              <Input id="sessionName" value={renameInputValue} onChange={(e) => setRenameInputValue(e.target.value)} className="col-span-3" onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession();}} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSession}>Save Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the game session
              and all its associated chat history and game state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* API Error Dialog with Cached Series Picker */}
      <Dialog open={showApiErrorDialog} onOpenChange={setShowApiErrorDialog}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>AI Service Issue</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-1">
            <p className="mb-4 text-sm text-muted-foreground">{apiErrorMessage}</p>
            {/* CachedSeriesPicker removed from here */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiErrorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
