
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Message, ClientGameState, ProcessedPlayerInput, SeriesDetails, Quest, GameSession } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, Sidebar, SidebarContent as UISidebarContent, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
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
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LOCAL_STORAGE_GAME_SESSIONS_KEY, DEFAULT_SESSION_ID } from '@/config/constants';

const initialAiWelcomeMessage: Message = {
  id: 'ai-initial-welcome-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore, or choose an existing game from the menu.",
  timestamp: Date.now(),
};

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


export function ChatWindow() {
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  // State for Rename Dialog
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [sessionToRenameId, setSessionToRenameId] = useState<string | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // State for Delete Confirmation Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeSessionId || !isInitialLoadComplete) return;

    const currentActiveSession = allSessions.find(s => s.id === activeSessionId);
    if (currentActiveSession) {
      setMessages(currentActiveSession.messages);
      setGameState(currentActiveSession.gameState);
      const storedUserName = localStorage.getItem('mysticChatways_userDisplayName');
      if (storedUserName && !currentActiveSession.gameState.userDisplayName) {
        setGameState(prev => ({...prev, userDisplayName: storedUserName}));
      } else if (currentActiveSession.gameState.userDisplayName){
         setGameState(prev => ({...prev, userDisplayName: currentActiveSession.gameState.userDisplayName}));
      }
    } else if (allSessions.length > 0) {
      setActiveSessionId(allSessions[0].id); // Fallback to the first session if active is not found
    } else {
      const newSession = createNewSession('active_fallback');
      setAllSessions([newSession]);
      setActiveSessionId(newSession.id);
      setMessages(newSession.messages);
      setGameState(newSession.gameState);
    }
  }, [activeSessionId, allSessions, isInitialLoadComplete]);


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
      ).sort((a,b) => b.lastPlayed - a.lastPlayed)
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
      ).sort((a,b) => b.lastPlayed - a.lastPlayed)
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
          userDisplayName: localStorage.getItem('mysticChatways_userDisplayName') || gameState.userDisplayName,
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
    setAllSessions(prevSessions => [newSession, ...prevSessions].sort((a,b) => b.lastPlayed - a.lastPlayed));
    setActiveSessionId(newSession.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, lastPlayed: Date.now() }
          : session
      ).sort((a,b) => b.lastPlayed - a.lastPlayed)
    );
    setActiveSessionId(sessionId);
  };

  const openRenameDialog = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (session) {
      setSessionToRenameId(sessionId);
      setRenameInputValue(session.name);
      setIsRenameDialogOpen(true);
    }
  };

  const handleRenameSession = () => {
    if (!sessionToRenameId || !renameInputValue.trim()) return;
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionToRenameId
          ? { ...session, name: renameInputValue.trim(), lastPlayed: Date.now() }
          : session
      ).sort((a,b) => b.lastPlayed - a.lastPlayed)
    );
    setIsRenameDialogOpen(false);
    setSessionToRenameId(null);
    toast({ title: "Session Renamed", description: `Session name updated to "${renameInputValue.trim()}".`});
  };

  const openDeleteDialog = (sessionId: string) => {
    setSessionToDeleteId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!sessionToDeleteId) return;
    const remainingSessions = allSessions.filter(s => s.id !== sessionToDeleteId);

    if (activeSessionId === sessionToDeleteId) {
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id); // Switch to the most recent of remaining
      } else {
        const newSession = createNewSession('after_delete');
        remainingSessions.push(newSession);
        setActiveSessionId(newSession.id);
      }
    }
    setAllSessions(remainingSessions);
    setIsDeleteDialogOpen(false);
    setSessionToDeleteId(null);
    toast({ title: "Session Deleted", description: "The game session has been removed."});
  };


  const activeSessionName = allSessions.find(s => s.id === activeSessionId)?.name || "Loading...";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="stretch-layout overflow-hidden bg-background/90 backdrop-blur-sm relative">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Game sidebar */}
        <Sidebar 
          side="left"
          collapsible="icon"
          className="group z-10"
        >
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
        
        {/* Main content area */}
        <SidebarInset className="stretch-child">
          <div className="sticky top-0 z-20 bg-background/50 backdrop-blur-md border-b border-white/10 p-3 flex items-center justify-between shadow-md">
            <div className="flex-1 flex items-center justify-between max-w-xl mx-auto w-full">
              {/* Game session dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center pl-3 pr-2 gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <span className="font-semibold truncate max-w-[160px] sm:max-w-xs text-gradient">
                      {allSessions.find(s => s.id === activeSessionId)?.name || "No active game"}
                    </span>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
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

              {/* Settings button */}
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
              <div className="text-center animate-pulse-light">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <p className="text-lg">Loading your adventure sessions...</p>
              </div>
            </div>
          )}
        </SidebarInset>

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

    </div>
    </SidebarProvider>
  );
}

