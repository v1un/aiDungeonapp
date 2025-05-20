"use client";

import React, { useState, useEffect } from 'react';
import type { Message } from '@/types';
import { ChatLayout } from './ChatLayout';
import { processPlayerInput } from '@/lib/game-actions';
import { useToast } from '@/hooks/use-toast';

const initialAiMessage: Message = {
  id: 'ai-start-' + Date.now(),
  sender: 'ai',
  text: "Welcome to Mystic Chatways! Enter the name of a fictional series (e.g., TV show, book, movie, game) you'd like to explore.",
  timestamp: Date.now(),
};

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([initialAiMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: Message = {
      id: 'player-' + Date.now(),
      sender: 'player',
      text: inputValue,
      timestamp: Date.now(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponseText = await processPlayerInput(userMessage.text, [...messages, userMessage]);
      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        sender: 'ai',
        text: aiResponseText,
        timestamp: Date.now(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
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
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatLayout
      messages={messages}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
    />
  );
}
