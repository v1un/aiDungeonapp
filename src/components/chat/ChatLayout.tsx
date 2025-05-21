
"use client";

import React, { useEffect, useRef } from 'react';
import type { Message } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Sparkles } from 'lucide-react';

interface ChatLayoutProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  customLoadingMessage?: string;
}

export function ChatLayout({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isLoading,
  customLoadingMessage,
}: ChatLayoutProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="stretch-layout bg-background/90 backdrop-blur-sm relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse-light"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl animate-pulse-light" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Header */}
      <div className="border-b border-border/40 backdrop-blur-sm bg-background/30 py-3 px-4 flex justify-center items-center sticky top-0 z-10">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-gradient">Mystic Chatways</span>
        </h1>
      </div>
      
      {/* Chat messages */}
      <ScrollArea className="stretch-child p-2 sm:p-4 md:p-6 styled-scrollbar" ref={scrollAreaRef}>
        <div className="mx-auto max-w-3xl space-y-3 w-full">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
              Begin your adventure by typing a message below...
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id} className={`animate-fade-in`} style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}>
                <ChatMessage message={msg} />
              </div>
            ))
          )}
          
          {/* Typing indicator */}
          {isLoading && (
            <div className="animate-fade-in">
              <div className="rounded-lg p-4 max-w-[80%] bg-muted/30 text-muted-foreground animate-pulse-light glass-effect">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span className="ml-2 text-sm">{customLoadingMessage || 'Thinking...'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Chat input */}
      <div className="border-t border-border/40 backdrop-blur-sm bg-background/40 p-2 sm:p-4 w-full">
        <div className="mx-auto max-w-3xl w-full">
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSubmit={onSendMessage}
            isLoading={isLoading}
            customLoadingMessage={customLoadingMessage}
          />
        </div>
      </div>
    </div>
  );
}
