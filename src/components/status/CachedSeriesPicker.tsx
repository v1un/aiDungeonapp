'use client';

import React, { useState, useEffect } from 'react';
import {
  getCachedSeriesNames,
  cleanupExpiredCache,
  deleteCachedSeries,
  clearAllCachedSeries,
} from '@/lib/series-cache';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Trash2 } from 'lucide-react';

interface CachedSeriesPickerProps {
  onSelect: (seriesName: string) => void;
}

/**
 * Component for displaying and selecting cached series
 * This is shown when there are AI API issues to provide alternative options
 */
export default function CachedSeriesPicker({ onSelect }: CachedSeriesPickerProps) {
  const [cachedSeries, setCachedSeries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCachedSeries = () => {
    cleanupExpiredCache();
    const seriesList = getCachedSeriesNames();
    setCachedSeries(seriesList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCachedSeries();
  }, []);

  const handleDeleteSeries = (seriesName: string) => {
    deleteCachedSeries(seriesName);
    loadCachedSeries(); // Refresh the list
  };

  const handleClearAll = () => {
    clearAllCachedSeries();
    loadCachedSeries(); // Refresh the list
  };

  if (isLoading) {
    return <div>Checking for cached game worlds...</div>;
  }

  if (cachedSeries.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={20} />
            <p>No cached game worlds found. Please try a different series name.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previously Generated Worlds</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          The AI service is currently experiencing issues. You can choose one of these previously generated worlds:
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {cachedSeries.map((series) => (
            <div key={series} className="flex gap-2">
              <Button
                variant="outline"
                className="flex-grow text-left h-auto py-2 px-3 justify-start"
                onClick={() => onSelect(series)}
              >
                {series}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDeleteSeries(series)}
                aria-label={`Delete ${series}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
        {cachedSeries.length > 0 && (
          <div className="mt-4">
            <Button variant="destructive" onClick={handleClearAll} className="w-full sm:w-auto">
              Clear All Cached Worlds
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
