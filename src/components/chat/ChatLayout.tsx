"use client";

import React, { useEffect, useRef } from 'react';
import type { Message } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatLayoutProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function ChatLayout({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  isLoading,
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
    <div className="flex h-screen flex-col bg-background">
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="mx-auto max-w-3xl space-y-1">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>
      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSubmit={onSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
