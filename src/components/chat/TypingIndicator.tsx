"use client";

import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 p-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-accent"></div>
      <span className="ml-2 text-sm text-muted-foreground">AI is typing...</span>
    </div>
  );
}
