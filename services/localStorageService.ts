
import type { TranscriptionRecord } from '../types';
import { LOCAL_STORAGE_HISTORY_KEY } from '../constants';

export const loadHistory = (): TranscriptionRecord[] => {
  try {
    const storedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (storedHistory) {
      return JSON.parse(storedHistory) as TranscriptionRecord[];
    }
  } catch (error) {
    console.error('Error loading history from localStorage:', error);
  }
  return [];
};

export const saveHistory = (history: TranscriptionRecord[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
    // Potentially handle quota exceeded error
  }
};

// Note: deleteHistoryItem was simplified in App.tsx to just re-save the filtered list.
// A specific delete function could be:
export const deleteHistoryItem = (recordId: string): void => {
  const currentHistory = loadHistory();
  const updatedHistory = currentHistory.filter(item => item.id !== recordId);
  saveHistory(updatedHistory);
};

export const clearHistory = (): void => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch (error) {
        console.error('Error clearing history from localStorage:', error);
    }
}
    