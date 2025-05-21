
"use client";

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizontal } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  customLoadingMessage?: string;
}

export function ChatInput({ value, onChange, onSubmit, isLoading, customLoadingMessage }: ChatInputProps) {
  return (
    <div className="border-t border-border bg-background p-4 shadow- ऊपर">
      {isLoading && <TypingIndicator customMessage={customLoadingMessage} />}
      <form onSubmit={onSubmit} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Type your message..."
          value={value}
          onChange={onChange}
          disabled={isLoading}
          className="flex-grow rounded-lg bg-input px-4 py-2 text-foreground focus:ring-accent"
          aria-label="Chat input"
        />
        <Button
          type="submit"
          disabled={isLoading || value.trim() === ''}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          aria-label="Send message"
        >
          <SendHorizontal size={20} />
        </Button>
      </form>
    </div>
  );
}
