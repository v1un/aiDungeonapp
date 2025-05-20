"use client";

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isPlayer = message.sender === 'player';

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
          <p className="whitespace-pre-wrap text-sm">{message.text}</p>
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
