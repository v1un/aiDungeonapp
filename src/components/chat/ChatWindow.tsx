"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { GameSession, ClientGameState, ClientGameStateUpdate, Message, ProcessedPlayerInput } from '@/types';
// Add type declaration for uuid module to fix TypeScript error
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ConnectionStatus } from "@/components/status/ConnectionStatus";
import { GameSidebar } from '@/components/rpg/GameSidebar';
import { Settings, ChevronDown, PlusCircle, Check, Edit3, Trash2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Constants
const DEFAULT_SESSION_ID = 'game-session-';
const LOCAL_STORAGE_KEY = 'mysticChatways_gameSessions';

// Initial message shown to the user
const initialAiWelcomeMessage: Message = {
  id: 'welcome-message',
  sender: 'ai',
  text: 'Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) to explore, or choose an existing game from the menu.',
  timestamp: Date.now(),
};

export default function ChatWindow() {
  // State for all game sessions and the active session
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Message-related state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string | null>(null);
  
  // Game state from the active session
  const [gameState, setGameState] = useState<ClientGameState>({
    inventory: [],
    currentLocation: "Not yet initialized",
    activeQuests: [],
    userDisplayName: undefined,
    seriesDetails: undefined,
  });
  
  // Dialog state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Create a new game session
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

  // Load sessions from localStorage
  useEffect(() => {
    // Skip localStorage access during SSR
    if (typeof window === 'undefined') return;
    
    try {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      
      if (storedSessions) {
        const sessions: GameSession[] = JSON.parse(storedSessions);
        setAllSessions(sessions.sort((a, b) => b.lastPlayed - a.lastPlayed));
        
        // Set active session to the most recently played
        if (sessions.length > 0 && !activeSessionId) {
          const mostRecentSession = sessions[0];
          setActiveSessionId(mostRecentSession.id);
          setMessages(mostRecentSession.messages);
          setGameState(mostRecentSession.gameState);
        }
      } else {
        // Create a default session if none exists
        const defaultSession = createNewSession('default');
        setAllSessions([defaultSession]);
        setActiveSessionId(defaultSession.id);
        setMessages(defaultSession.messages);
      }
    } catch (error) {
      console.error('Error loading game sessions:', error);
      
      // Fallback to a new session if load fails
      const fallbackSession = createNewSession('fallback');
      setAllSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
      setMessages(fallbackSession.messages);
    } finally {
      setIsInitialLoadComplete(true);
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined' || allSessions.length === 0) return;
    
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allSessions));
    } catch (error) {
      console.error('Error saving game sessions:', error);
    }
  }, [allSessions]);

  // Handler for selecting a session
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
    }
  };

  // Handler for starting a new game
  const handleStartNewGame = () => {
    const newSession = createNewSession();
    setAllSessions(prev => [newSession, ...prev].sort((a, b) => b.lastPlayed - a.lastPlayed));
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    setGameState(newSession.gameState);
  };

  // Dialog handlers for renaming sessions
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

  // Dialog handlers for deleting sessions
  const openDeleteDialog = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteSessionId) {
      setIsDeleteDialogOpen(false);
      return;
    }
    const sessionToRemove = allSessions.find(s => s.id === deleteSessionId);
    // If we're deleting the active session, switch to another one
    if (deleteSessionId === activeSessionId) {
      if (allSessions.length > 1) {
        const newActiveSession = allSessions.find(s => s.id !== deleteSessionId);
        setActiveSessionId(newActiveSession?.id || null);
        setMessages(newActiveSession?.messages || []);
        setGameState(newActiveSession?.gameState || {
          inventory: [],
          currentLocation: "Not yet initialized",
          activeQuests: [],
          userDisplayName: undefined,
          seriesDetails: undefined,
        });
      } else {
        // If this was the last session, create a new one
        const newSession = createNewSession();
        setActiveSessionId(newSession.id);
        setMessages(newSession.messages);
        setGameState(newSession.gameState);
        setAllSessions([newSession]);
        setIsDeleteDialogOpen(false);
        setDeleteSessionId(null);
        return;
      }
    }
    
    // Remove the session
    setAllSessions(prev => prev.filter(s => s.id !== deleteSessionId));
    setIsDeleteDialogOpen(false);
    setDeleteSessionId(null);
  };

  // Handlers for chat input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || !activeSessionId) return;
    
    setIsLoading(true);
    setCurrentLoadingMessage("Processing input...");
    
    try {
      // Create a player message
      const playerMessage: Message = {
        id: uuidv4(),
        sender: 'player',
        text: inputValue,
        timestamp: Date.now(),
      };
      
      const updatedMessages = [...messages, playerMessage];
      setMessages(updatedMessages);
      setInputValue('');
      
      // Process the player input
      const processedResult: ProcessedPlayerInput = await processPlayerInput(inputValue, messages);
      
      // Update loading message based on the current step in processing
      setCurrentLoadingMessage("Generating response...");
      
      // If there's no input, exit early
      if (!processedResult) {
        setIsLoading(false);
        setCurrentLoadingMessage(null);
        return;
      }
      
      // Add the AI response to messages
      const aiMessage: Message = {
        id: uuidv4(),
        sender: 'ai',
        text: processedResult.responseText || 'I did not understand that. Could you try again?',
        timestamp: Date.now(),
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      
      // Update messages state
      setMessages(finalMessages);
      
      // Update game state if needed
      if (processedResult.gameStateUpdate) {
        setGameState(prevState => ({
          ...prevState,
          ...processedResult.gameStateUpdate
        }));
      }
      
      // Update the session in allSessions
      const updatedSessions = allSessions.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: finalMessages,
              gameState: { 
                ...session.gameState,
                ...processedResult.gameStateUpdate 
              },
              lastPlayed: Date.now(),
            }
          : session
      );
      
      setAllSessions(updatedSessions);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add an error message
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
  
  // Get the current session with proper dependency tracking
  const currentSession = React.useMemo(() => 
    allSessions.find(s => s.id === activeSessionId) || null,
    [allSessions, activeSessionId]
  );
  
  // Derive the current session name with a fallback
  const currentSessionName = currentSession?.name || "New Game";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="relative flex h-screen w-full overflow-hidden bg-background">
        {/* Background elements - contained within the viewport */}
        <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[5%] -right-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute top-1/3 left-1/4 w-[70%] h-[70%] bg-secondary/3 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute bottom-[5%] -left-[5%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
          <div className="absolute bottom-1/4 right-1/6 w-[40%] h-[40%] bg-primary/3 rounded-full blur-3xl peer-data-[state=collapsed]:opacity-30 transition-opacity duration-300"></div>
        </div>
        
        {/* Layout structure */}
        <div className="relative z-10 flex w-full h-full">
          {/* Game sidebar with fixed width */}
          <Sidebar 
            side="left"
            collapsible="icon"
            className="group z-20 h-full"
          >
            <SidebarContent className="h-full">
              <GameSidebar
                seriesDetails={gameState.seriesDetails}
                inventory={gameState.inventory}
                currentLocation={gameState.currentLocation}
                activeQuests={gameState.activeQuests}
                userDisplayName={gameState.userDisplayName}
              />
            </SidebarContent>
          </Sidebar>

          {/* Main content area */}
          <SidebarInset className="relative flex-1 h-full min-w-0 transition-all duration-200 ease-in-out group-data-[state=collapsed]:ml-16">
            <div className="h-full w-full max-w-7xl mx-auto px-2 sm:px-4 flex flex-col overflow-hidden">
              {/* Header with controls */}
              <div className="border-b border-border/40 backdrop-blur-sm bg-background/30 py-2 sm:py-3 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center">
                  <SidebarTrigger className="md:hidden mr-2 flex-shrink-0" />
                  <h1 
                    key={currentSession?.id} // Force re-render when session changes
                    className="text-sm sm:text-base font-medium truncate max-w-[120px] sm:max-w-[200px]"
                  >
                    {currentSessionName}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {/* Session selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="flex items-center gap-1 sm:gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <span className="text-xs sm:text-sm font-medium">
                          Switch Game
                        </span>
                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-64 bg-background/80 backdrop-blur-md border-white/10 shadow-xl rounded-xl p-1 animate-fade-in"
                    >
                      <DropdownMenuLabel className="text-primary/90 font-medium px-3 py-2">
                        Your Adventures
                      </DropdownMenuLabel>
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
                              <Button
                                data-action-button="true"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-primary/20 hover:text-primary rounded-full"
                                onClick={(e) => { e.stopPropagation(); openRenameDialog(session.id); }}
                                aria-label="Rename session"
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button
                                data-action-button="true"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-full"
                                onClick={(e) => { e.stopPropagation(); openDeleteDialog(session.id); }}
                                aria-label="Delete session"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                            {session.id === activeSessionId && 
                              <Check className="h-4 w-4 text-primary absolute right-2 top-1/2 -translate-y-1/2 group-hover:opacity-0" />
                            }
                          </DropdownMenuItem>
                        )) : (
                          <div className="px-3 py-2 text-center text-muted-foreground text-sm">
                            No saved games yet.
                          </div>
                        )}
                      </div>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem 
                        onSelect={handleStartNewGame}
                        className="rounded-lg m-1 p-2 hover:bg-primary/10 transition-colors"
                      >
                        <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                        Start New Game
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Connection status and settings */}
                  <ConnectionStatus />
                  
                  <Link href="/settings" passHref>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      aria-label="Settings"
                      className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Settings size={18} />
                    </Button>
                  </Link>
                </div>
              </div>
              
              {/* Chat area */}
              <div className="flex-1 flex flex-col min-h-0">
                {isInitialLoadComplete && activeSessionId ? (
                  <ChatLayout
                    messages={messages}
                    inputValue={inputValue}
                    onInputChange={handleInputChange}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    customLoadingMessage={currentLoadingMessage || undefined}
                  />
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
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>

      {/* Rename Session Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Game Session</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sessionName" className="text-right">
                Name
              </Label>
              <Input
                id="sessionName"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSession();}}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSession}>Save Name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Confirmation Dialog */}
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
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
