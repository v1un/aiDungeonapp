
"use client";

import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Sparkles, Command } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  customLoadingMessage?: string;
}

export function ChatInput({ value, onChange, onSubmit, isLoading, customLoadingMessage }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on the input when component mounts
  useEffect(() => {
    if (inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  return (
    <div className="relative">
      <form 
        onSubmit={onSubmit} 
        className="relative flex items-center gap-2 transition-all"
      >
        <div className="relative flex-grow group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/40 to-accent/40 blur-md opacity-25 group-focus-within:opacity-100 transition-opacity"></div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Command size={16} className="opacity-70" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type your message or command..."
            value={value}
            onChange={onChange}
            disabled={isLoading}
            className="flex-grow pl-9 pr-4 py-6 rounded-full border border-border/50 bg-background/70 backdrop-blur-sm text-foreground shadow-lg focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 transition-all"
            aria-label="Chat input"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading || value.trim() === ''}
          className="rounded-full aspect-square h-12 w-12 p-0 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-md hover:brightness-110 disabled:opacity-50 transition-all shadow-lg"
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="animate-spin">
              <Sparkles size={18} />
            </div>
          ) : (
            <SendHorizontal size={18} />
          )}
        </Button>
      </form>
      
      {/* Help text */}
      <div className="absolute -top-5 left-0 right-0 text-center">
        <div className="text-xs text-muted-foreground animate-pulse-light">
          {isLoading ? 
            (customLoadingMessage || 'The Game Master is thinking...') : 
            ''}
        </div>
      </div>
    </div>
  );
}
