"use client";

import React from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessageProps {
  message: Message;
}

// Enhanced markdown parser with support for more elements
const parseMarkdown = (text: string) => {
  // Process basic formatting
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  
  return parts.map((part, index) => {
    // Strong/Bold
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Emphasis/Italic
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index} className="text-accent italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isPlayer = message.sender === 'player';
  const parsedText = parseMarkdown(message.text);
  const messageTime = new Date(message.timestamp);

  return (
    <div
      className={cn(
        'flex items-end gap-2 py-2 w-full transition-opacity',
        isPlayer ? 'justify-end' : 'justify-start'
      )}
    >
      {!isPlayer && (
        <div className="flex flex-col items-center gap-1">
          <Avatar className="h-8 w-8 ring-2 ring-accent/30 shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-white">
              <Sparkles size={14} />
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground">GM</span>
        </div>
      )}
      
      <div className="max-w-[85%] sm:max-w-[75%]">
        <Card
          className={cn(
            'rounded-2xl shadow-md border overflow-hidden transition-all',
            isPlayer 
              ? 'bg-primary/90 text-primary-foreground border-primary/20 rounded-tr-sm' 
              : 'glass-effect border-white/5 backdrop-blur-md rounded-tl-sm bg-card/70'
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="whitespace-pre-wrap text-sm sm:text-base space-y-2">
              {parsedText}
            </div>
          </CardContent>
        </Card>
        <div className="text-[10px] text-muted-foreground mt-1 px-2">
          {format(messageTime, 'h:mm a')}
        </div>
      </div>
      
      {isPlayer && (
        <div className="flex flex-col items-center gap-1">
          <Avatar className="h-8 w-8 ring-2 ring-primary/30 shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white">
              <User size={14} />
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] text-muted-foreground">You</span>
        </div>
      )}
    </div>
  );
}
