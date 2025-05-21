"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Function to check the backend connection
async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.error('Backend connection check failed:', error);
    return false;
  }
}

// Function to check GenKit connection
async function checkGenkitConnection(): Promise<boolean> {
  try {
    const response = await fetch('/api/genkit-health', { method: 'GET' });
    return response.ok;
  } catch (error) {
    console.error('GenKit connection check failed:', error);
    return false;
  }
}

type ConnectionStatus = "connected" | "disconnected" | "checking";

export function ConnectionStatus() {
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>("checking");
  const [genkitStatus, setGenkitStatus] = useState<ConnectionStatus>("checking");
  const [isExpanded, setIsExpanded] = useState(false);

  const checkConnections = async () => {
    setBackendStatus("checking");
    setGenkitStatus("checking");
    
    const backendConnected = await checkBackendConnection();
    setBackendStatus(backendConnected ? "connected" : "disconnected");
    
    const genkitConnected = await checkGenkitConnection();
    setGenkitStatus(genkitConnected ? "connected" : "disconnected");
  };

  useEffect(() => {
    // Check connections when component mounts
    checkConnections();
    
    // Set up interval to check connections periodically (every 30 seconds)
    const intervalId = setInterval(checkConnections, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <TooltipProvider>
      <div className={`flex items-center transition-all duration-300 ${isExpanded ? "gap-2" : "gap-0"}`}>
        {isExpanded && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={
                    backendStatus === "connected" ? "outline" : 
                    backendStatus === "disconnected" ? "destructive" : "secondary"
                  }
                  className="flex items-center gap-1 cursor-help"
                >
                  {backendStatus === "connected" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {backendStatus === "disconnected" && <AlertCircle className="h-3 w-3 text-red-500" />}
                  {backendStatus === "checking" && <MinusCircle className="h-3 w-3 text-yellow-500 animate-pulse" />}
                  <span>Backend</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {backendStatus === "connected" ? "Backend connection: OK" : 
                 backendStatus === "disconnected" ? "Backend connection: Failed" : 
                 "Checking backend connection..."}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={
                    genkitStatus === "connected" ? "outline" : 
                    genkitStatus === "disconnected" ? "destructive" : "secondary"
                  }
                  className="flex items-center gap-1 cursor-help"
                >
                  {genkitStatus === "connected" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  {genkitStatus === "disconnected" && <AlertCircle className="h-3 w-3 text-red-500" />}
                  {genkitStatus === "checking" && <MinusCircle className="h-3 w-3 text-yellow-500 animate-pulse" />}
                  <span>GenKit</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {genkitStatus === "connected" ? "GenKit connection: OK" : 
                 genkitStatus === "disconnected" ? "GenKit connection: Failed" : 
                 "Checking GenKit connection..."}
              </TooltipContent>
            </Tooltip>
          </>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Hide connection status" : "Show connection status"}
        >
          <div 
            className={`flex items-center justify-center h-full w-full rounded-full transition-colors ${
              isExpanded ? "bg-muted hover:bg-muted/80" : 
              (backendStatus === "connected" && genkitStatus === "connected") ? "bg-green-500/20 hover:bg-green-500/30" :
              (backendStatus === "disconnected" || genkitStatus === "disconnected") ? "bg-red-500/20 hover:bg-red-500/30" :
              "bg-yellow-500/20 hover:bg-yellow-500/30"
            }`}
          >
            {(backendStatus === "connected" && genkitStatus === "connected") && 
              <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {(backendStatus === "disconnected" || genkitStatus === "disconnected") && 
              <AlertCircle className="h-4 w-4 text-red-500" />}
            {(backendStatus === "checking" || genkitStatus === "checking") && 
              <MinusCircle className="h-4 w-4 text-yellow-500 animate-pulse" />}
          </div>
        </Button>
      </div>
    </TooltipProvider>
  );
}
