
"use client";

import React from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

// Simple markdown parser
const parseMarkdown = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index} className="text-accent italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isPlayer = message.sender === 'player';
  const parsedText = parseMarkdown(message.text);

  return (
    <div
      className={cn(
        'flex items-end space-x-2 py-2',
        isPlayer ? 'justify-end' : 'justify-start'
      )}
    >
      {!isPlayer && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          'max-w-xs rounded-lg p-0 shadow-md sm:max-w-md md:max-w-lg lg:max-w-xl',
          isPlayer
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground'
        )}
      >
        <CardContent className="p-3">
          <p className="whitespace-pre-wrap text-sm">{parsedText}</p>
        </CardContent>
      </Card>
      {isPlayer && (
         <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
