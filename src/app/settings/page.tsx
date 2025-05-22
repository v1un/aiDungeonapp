
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
import { Separator } from '@/components/ui/separator'; // Import Separator
import { useToast } from '@/hooks/use-toast';

const availableModels = [
  { id: 'googleai/gemini-2.0-flash', name: 'Gemini 2.0 Flash (Default)' },
  { id: 'googleai/gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' },
  { id: 'googleai/gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro' },
  { id: 'googleai/gemini-pro', name: 'Gemini Pro' },
  { id: 'googleai/gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview (04-17)' },
  { id: 'googleai/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview (05-20)' },
];

export default function SettingsPage() {
  const [userDisplayName, setUserDisplayName] = useState('');
  const [aiModel, setAiModel] = useState(availableModels[0].id);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  // State for AI Provider status
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // Load general settings from localStorage
    const storedName = localStorage.getItem('mysticChatways_userDisplayName');
    const storedModel = localStorage.getItem('mysticChatways_aiModel');
    const storedApiKey = localStorage.getItem('mysticChatways_apiKey');

    if (storedName) setUserDisplayName(storedName);
    if (storedModel) {
      // Ensure the stored model is still in the available list
      if (availableModels.some(model => model.id === storedModel)) {
        setAiModel(storedModel);
      } else {
        setAiModel(availableModels[0].id); // Fallback to default if not found
      }
    }
    if (storedApiKey) setApiKey(storedApiKey);

    // Fetch AI provider status
    fetch('/api/ai-provider-status')
      .then(res => {
        if (!res.ok) {
          throw new Error(`API responded with status ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setAiProvider(data.aiProvider);
        setIsLoadingProvider(false);
      })
      .catch(error => {
        console.error("Failed to fetch AI provider status:", error);
        setFetchError(error.message || "Unknown error occurred while fetching AI provider.");
        setAiProvider(null);
        setIsLoadingProvider(false);
      });
  }, []); // Empty dependency array ensures this runs once on mount

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
            Note: This key is stored in your browser&apos;s local storage and is not currently used to dynamically configure the backend.
            For production, API keys should be handled securely on the server.
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-lg font-medium">AI Provider Configuration</h3>
          {isLoadingProvider ? (
            <p className="text-sm text-muted-foreground">Loading AI provider status...</p>
          ) : fetchError ? (
            <p className="text-sm text-destructive">Could not determine current AI provider: {fetchError}</p>
          ) : aiProvider ? (
            <p className="text-sm">
              Currently active provider: <strong className="font-semibold">{aiProvider === 'ollama' ? 'Local LLM (Ollama)' : 'Google AI (Cloud)'}</strong>
            </p>
          ) : (
            <p className="text-sm text-destructive">Could not determine current AI provider.</p>
          )}
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              The application can use either Google AI (Cloud-based, typically via Gemini models) or a local LLM 
              (e.g., Gemma via Ollama).
            </p>
            <p>
              To change the AI provider, set the <code>AI_PROVIDER</code> environment variable in your 
              <code>.env.local</code> file (create this file in the project root if it doesn&apos;t exist).
            </p>
            <div className="p-2 bg-secondary rounded-md">
              <pre className="text-xs whitespace-pre-wrap">
                <code>AI_PROVIDER="googleai"  # For Google AI (Cloud)</code><br />
                <code>AI_PROVIDER="ollama"    # For Local LLM (Ollama)</code>
              </pre>
            </div>
            <p>
              If using Ollama (<code>AI_PROVIDER="ollama"</code>), you can also specify the <code>OLLAMA_BASE_URL</code> 
              if your Ollama service is not running on the default <code>http://localhost:11434</code>. For example:
            </p>
            <div className="p-2 bg-secondary rounded-md">
              <pre className="text-xs whitespace-pre-wrap">
                <code>OLLAMA_BASE_URL="http://your-ollama-host:11434"</code>
              </pre>
            </div>
            <p>
              Note: When using the Local LLM (Ollama) provider, the AI interacts differently with the system (using a "tool-less" method where it embeds all information in its text response). This may lead to variations in AI behavior and response characteristics compared to the Google AI (Cloud) provider. For more details on these differences, please see the main <code>README.md</code> file.
            </p>
            <p className="font-semibold text-foreground">
              Important: You must restart the application server after changing environment variables for the new settings to take effect.
            </p>
          </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button onClick={handleSave}>Save Settings</Button>
      </CardFooter>
    </Card>
  );
}
