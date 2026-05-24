"use client";

import { TextOverlay, EditRecipe } from "@/lib/types";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { getTextPixelPosition, getTextPercentPosition } from "@/lib/text-overlay";

interface DraggableTextOverlaysProps {
  recipe?: EditRecipe;
  containerWidth: number;
  containerHeight: number;
  selectedTextId: string | null;
  onUpdateText: (id: string, updates: Partial<TextOverlay>) => void;
  onSelectText: (id: string | null) => void;
}

/**
 * Renders draggable text overlays on the video preview.
 * Users can click and drag text to reposition it on the canvas.
 */
export default function DraggableTextOverlays({
  recipe,
  containerWidth,
  containerHeight,
  selectedTextId,
  onUpdateText,
  onSelectText,
}: DraggableTextOverlaysProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLDivElement>(null);
  
  /**
   * Tracks whether initial focus and text selection have been applied.
   * Prevents re-selecting text on every keystroke during editing.
   */
  const initialFocusAppliedRef = useRef(false);

  /**
   * Memoize text overlays to prevent unnecessary dependency changes.
   */
  const textOverlays = useMemo(() => recipe?.textOverlays || [], [recipe?.textOverlays]);

  /**
   * Handles the start of a drag operation.
   * Skipped when in edit mode to allow normal caret positioning.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, overlayId: string) => {
      // Don't start drag while editing — let clicks position the caret naturally
      if (editingId === overlayId) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const overlay = textOverlays.find((o) => o.id === overlayId);
      if (!overlay || !containerRef.current) return;

      onSelectText(overlayId);

      const rect = containerRef.current.getBoundingClientRect();
      const { left: pixelX, top: pixelY } = getTextPixelPosition(
        overlay.x,
        overlay.y,
        containerWidth,
        containerHeight
      );

      setDraggingId(overlayId);
      setDragOffset({
        x: e.clientX - rect.left - pixelX,
        y: e.clientY - rect.top - pixelY,
      });
    },
    [textOverlays, containerWidth, containerHeight, onSelectText, editingId]
  );

  /**
   * Handles double-click to enter edit mode.
   */
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, overlayId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const overlay = textOverlays.find((o) => o.id === overlayId);
      if (!overlay) return;

      setEditingId(overlayId);
      setEditText(overlay.text);
    },
    [textOverlays]
  );

  /**
   * Saves the edited text and exits edit mode.
   */
  const handleSaveEdit = useCallback(
    (overlayId: string) => {
      if (editText.trim()) {
        onUpdateText(overlayId, { text: editText });
      }
      setEditingId(null);
      setEditText("");
      initialFocusAppliedRef.current = false;
    },
    [editText, onUpdateText]
  );

  /**
   * Handles keyboard events in edit mode.
   */
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, overlayId: string) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit(overlayId);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setEditingId(null);
        setEditText("");
        initialFocusAppliedRef.current = false;
      }
    },
    [handleSaveEdit]
  );

  /**
   * Handles dragging of text overlays.
   */
  useEffect(() => {
    if (!draggingId || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const pixelX = e.clientX - rect.left - dragOffset.x;
      const pixelY = e.clientY - rect.top - dragOffset.y;

      const { x: percentX, y: percentY } = getTextPercentPosition(
        pixelX,
        pixelY,
        containerWidth,
        containerHeight
      );

      onUpdateText(draggingId, { x: percentX, y: percentY });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingId, dragOffset, containerWidth, containerHeight, onUpdateText]);

  /**
   * Focus edit input when entering edit mode.
   * 
   * Applies initial text selection only ONCE when entering edit mode.
   * This prevents the selection from being re-applied on every keystroke,
   * which was causing the typing-overwrites-text bug.
   * 
   * Selection behavior:
   * - On double-click: text is fully selected for quick replacement
   * - On first keystroke: selection is cleared for normal typing
   * - During continued typing: normal text cursor behavior applies
   */
  useEffect(() => {
    if (!editingId || !editInputRef.current) {
      initialFocusAppliedRef.current = false;
      return;
    }

    // Only apply initial focus and selection once per edit session
    if (!initialFocusAppliedRef.current) {
      editInputRef.current.textContent = editText;
      editInputRef.current.focus();

      // Select all text for quick replacement, but only on first focus
      const range = document.createRange();
      range.selectNodeContents(editInputRef.current);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }

      initialFocusAppliedRef.current = true;
    }
  }, [editingId, editText]); // Added editText to fix closure issue, but guarded by ref

  if (!textOverlays || textOverlays.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: containerWidth, height: containerHeight }}
    >
      {textOverlays.map((overlay) => {
        const { left, top } = getTextPixelPosition(
          overlay.x,
          overlay.y,
          containerWidth,
          containerHeight
        );

        const isSelected = selectedTextId === overlay.id;
        const isDragging = draggingId === overlay.id;

        return (
          <div
            key={overlay.id}
            role="button"
            tabIndex={0}
            onMouseDown={(e) => handleMouseDown(e, overlay.id)}
            onDoubleClick={(e) => handleDoubleClick(e, overlay.id)}
            onKeyDown={(e) => {
              if (editingId === overlay.id) {
                handleEditKeyDown(e, overlay.id);
              } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectText(overlay.id);
              }
            }}
            className={`absolute pointer-events-auto ${
              editingId === overlay.id ? "cursor-text" : "cursor-move"
            } select-none transition-all ${
              isDragging ? "scale-105" : "scale-100"
            } ${
              isSelected
                ? "ring-2 ring-film-500 ring-offset-1 ring-offset-black/50"
                : ""
            }`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              transform: "translate(-50%, -50%)",
              fontSize: `${overlay.fontSize}px`,
              color: overlay.color,
              fontWeight:
                overlay.fontWeight === "900"
                  ? 900
                  : overlay.fontWeight === "bold"
                  ? 700
                  : 400,
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
              whiteSpace: "nowrap",
            }}
            aria-label={`Text overlay: ${overlay.text}`}
            aria-pressed={isSelected}
          >
            {editingId === overlay.id ? (
              <div
                ref={editInputRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={() => handleSaveEdit(overlay.id)}
                onInput={(e) => {
                  // Simply update the text state and let browser handle caret naturally
                  setEditText(e.currentTarget.textContent || "");
                }}
                className="outline-none bg-black/30 px-1 py-0.5 rounded"
                style={{
                  color: overlay.color,
                  fontSize: `${overlay.fontSize}px`,
                  fontWeight:
                    overlay.fontWeight === "900"
                      ? 900
                      : overlay.fontWeight === "bold"
                      ? 700
                      : 400,
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
                }}
              >
              </div>
            ) : (
              overlay.text
            )}
          </div>
        );
      })}
    </div>
  );
}
