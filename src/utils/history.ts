/**
 * History state management types and utilities for undo/redo functionality.
 */

/**
 * Generic history state structure for managing past, present, and future states.
 * Supports efficient undo/redo operations with minimal memory overhead.
 */
export interface HistoryState<T> {
  /** Array of past states, where the last element is the most recent past state */
  past: T[];
  /** Current active state */
  present: T;
  /** Array of future states (redo stack), where the first element is the most recent redo */
  future: T[];
}

/**
 * Creates a new history state with the given present value.
 * @param present - The initial/current state value
 * @returns A new HistoryState with empty past and future stacks
 */
export function createHistoryState<T>(present: T): HistoryState<T> {
  return {
    past: [],
    present,
    future: [],
  };
}

/**
 * Pushes a new state to the history, clearing the future stack.
 * Call this when a user action creates a new state.
 * @param history - Current history state
 * @param newPresent - The new state to make current
 * @returns Updated history state
 */
export function pushHistory<T>(
  history: HistoryState<T>,
  newPresent: T
): HistoryState<T> {
  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: [],
  };
}

/**
 * Undoes to the previous state if available.
 * @param history - Current history state
 * @returns Updated history state, or unchanged if no past states exist
 */
export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) {
    return history;
  }

  const newPast = history.past.slice(0, -1);
  const newPresent = history.past[history.past.length - 1];

  return {
    past: newPast,
    present: newPresent,
    future: [history.present, ...history.future],
  };
}

/**
 * Redoes to the next state if available.
 * @param history - Current history state
 * @returns Updated history state, or unchanged if no future states exist
 */
export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) {
    return history;
  }

  const newPresent = history.future[0];
  const newFuture = history.future.slice(1);

  return {
    past: [...history.past, history.present],
    present: newPresent,
    future: newFuture,
  };
}

/**
 * Checks if undo is available.
 * @param history - Current history state
 * @returns True if there are past states to undo to
 */
export function canUndo<T>(history: HistoryState<T>): boolean {
  return history.past.length > 0;
}

/**
 * Checks if redo is available.
 * @param history - Current history state
 * @returns True if there are future states to redo to
 */
export function canRedo<T>(history: HistoryState<T>): boolean {
  return history.future.length > 0;
}

/**
 * Performs a shallow equality check between two objects.
 * Useful for detecting if state has meaningfully changed before creating history entries.
 * 
 * @param obj1 - First object to compare
 * @param obj2 - Second object to compare
 * @returns True if both objects have identical keys and values
 * 
 * @example
 * const hasChanged = !shallowEqual(prevRecipe, newRecipe);
 * if (hasChanged) {
 *   pushHistory(history, newRecipe);
 * }
 */
export function shallowEqual<T extends Record<string, any>>(
  obj1: T | null | undefined,
  obj2: T | null | undefined
): boolean {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every((key) => obj1[key] === obj2[key]);
}
