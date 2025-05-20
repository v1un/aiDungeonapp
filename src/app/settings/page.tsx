
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const availableModels = [
  { id: 'googleai/gemini-2.0-flash', name: 'Gemini 2.0 Flash (Default)' },
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
  { id: 'googleai/gemini-pro', name: 'Gemini Pro' },
];

export default function SettingsPage() {
  const [userDisplayName, setUserDisplayName] = useState('');
  const [aiModel, setAiModel] = useState(availableModels[0].id);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Load settings from localStorage
    const storedName = localStorage.getItem('mysticChatways_userDisplayName');
    const storedModel = localStorage.getItem('mysticChatways_aiModel');
    const storedApiKey = localStorage.getItem('mysticChatways_apiKey');

    if (storedName) setUserDisplayName(storedName);
    if (storedModel) setAiModel(storedModel);
    if (storedApiKey) setApiKey(storedApiKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('mysticChatways_userDisplayName', userDisplayName);
    localStorage.setItem('mysticChatways_aiModel', aiModel);
    localStorage.setItem('mysticChatways_apiKey', apiKey);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>Manage your preferences for Mystic Chatways.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="userDisplayName">User/Character Display Name</Label>
          <Input
            id="userDisplayName"
            value={userDisplayName}
            onChange={(e) => setUserDisplayName(e.target.value)}
            placeholder="E.g., Your Name or Character Alias"
          />
          <p className="text-xs text-muted-foreground">
            This name will be used to identify you in the game sidebar.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiModel">AI Model</Label>
          <Select value={aiModel} onValueChange={setAiModel}>
            <SelectTrigger id="aiModel">
              <SelectValue placeholder="Select AI Model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Note: Changing this setting currently does not dynamically update the backend AI model used by Genkit. This is for demonstration.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">AI API Key (Optional)</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your AI API Key if required"
          />
          <p className="text-xs text-muted-foreground">
            Note: This key is stored in your browser's local storage and is not currently used to dynamically configure the backend.
            For production, API keys should be handled securely on the server.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave}>Save Settings</Button>
      </CardFooter>
    </Card>
  );
}
