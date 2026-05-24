"use client";

import { useCallback, useRef, useState } from "react";
import { EditRecipe } from "@/lib/types";
import {
  HistoryState,
  createHistoryState,
  pushHistory as pushHistoryState,
  undo as undoHistory,
  redo as redoHistory,
  canUndo,
  canRedo,
} from "@/utils/history";

/**
 * Hook for managing undo/redo history for editor state.
 * Tracks recipe changes and provides undo/redo functionality with keyboard support.
 *
 * @param initialRecipe - The initial recipe state
 * @returns Object containing:
 *   - recipe: Current recipe state
 *   - updateRecipe: Function to update recipe (automatically tracked in history)
 *   - undo: Function to undo last action
 *   - redo: Function to redo last undone action
 *   - canUndo: Boolean indicating if undo is available
 *   - canRedo: Boolean indicating if redo is available
 *
 * @example
 * const { recipe, updateRecipe, undo, redo, canUndo, canRedo } = useUndoRedo(initialRecipe);
 */
export function useUndoRedo(initialRecipe: EditRecipe) {
  const [history, setHistory] = useState<HistoryState<EditRecipe>>(() =>
    createHistoryState(initialRecipe)
  );

  /**
   * Updates the recipe and pushes the new state to history.
   * Clears redo stack when a new action is performed.
   */
  const updateRecipe = useCallback((patch: Partial<EditRecipe>) => {
    setHistory((prev) => {
      const next = { ...prev.present, ...patch };
      // GIF has no audio — force keepAudio off
      if (next.format === "gif") {
        next.keepAudio = false;
      }
      return pushHistoryState(prev, next);
    });
  }, []);

  /**
   * Undoes the last action if available.
   */
  const undo = useCallback(() => {
    setHistory((prev) => undoHistory(prev));
  }, []);

  /**
   * Redoes the last undone action if available.
   */
  const redo = useCallback(() => {
    setHistory((prev) => redoHistory(prev));
  }, []);

  return {
    recipe: history.present,
    updateRecipe,
    undo,
    redo,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}
