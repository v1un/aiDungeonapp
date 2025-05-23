'use server';

import { getGenerationProgress } from '@/ai/flows/generate-series-details';
import { NextResponse } from 'next/server';

export async function GET() {
  const progress = await getGenerationProgress();
  
  if (!progress) {
    return NextResponse.json({
      status: 'idle',
      message: 'No generation in progress',
      progress: null
    });
  }
  
  const { step, totalSteps, currentStep, status, details, startTime, endTime } = progress;
  
  // Calculate elapsed time and percentage
  const elapsedTimeMs = endTime ? (endTime - startTime) : (Date.now() - startTime);
  const elapsedTimeSec = Math.floor(elapsedTimeMs / 1000);
  const percent = Math.floor((currentStep / totalSteps) * 100);
  
  return NextResponse.json({
    status,
    message: `Generation ${status}: ${step} (${currentStep}/${totalSteps})`,
    progress: {
      step,
      totalSteps,
      currentStep,
      details,
      percent,
      elapsedTimeSec,
      startTime,
      endTime,
    }
  });
}
