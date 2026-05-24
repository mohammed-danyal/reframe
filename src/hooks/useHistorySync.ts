"use client";

import { useEffect, useCallback } from "react";
import { EditRecipe } from "@/lib/types";

/**
 * Hook for synchronizing UI state after undo/redo operations.
 * Ensures that UI components reflect the restored recipe state properly.
 * 
 * Specifically handles:
 * - Validating and preserving text overlay selection
 * - Ensuring no stale references after state restoration
 * - Maintaining UI consistency after history navigation
 *
 * @param recipe - Current recipe state (restored via undo/redo or normal updates)
 * @param selectedTextId - Currently selected text overlay ID
 * @param onSelectText - Callback to update selected text ID
 * 
 * @example
 * useHistorySync(recipe, selectedTextId, setSelectedTextId);
 */
export function useHistorySync(
  recipe: EditRecipe,
  selectedTextId: string | null,
  onSelectText: (id: string | null) => void
): void {
  // Validate selection after recipe changes (e.g., after undo/redo)
  useEffect(() => {
    if (!selectedTextId) return;

    // Check if the currently selected overlay still exists in the recipe
    const overlayStillExists = recipe.textOverlays.some(
      (overlay) => overlay.id === selectedTextId
    );

    // If the selected overlay was removed (e.g., via undo of "add text"),
    // clear the selection to prevent broken state
    if (!overlayStillExists) {
      onSelectText(null);
    }
  }, [recipe.textOverlays, selectedTextId, onSelectText]);
}
