/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */
"use client";

import { useEffect, useRef, useState, useCallback, RefObject } from "react";
import { EditRecipe, TextOverlay } from "@/lib/types";
import { getPresetById } from "@/lib/presets";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";
import { captureFrameAsPng } from "@/lib/frame-export";
import { DEFAULT_RECIPE } from "@/lib/constants";

interface Props {
  file: File | null;
  recipe?: EditRecipe;
  videoRef: RefObject<HTMLVideoElement | null>;
  textOverlays?: TextOverlay[];
  onUpdateTextOverlay?: (id: string, patch: Partial<Omit<TextOverlay, "id">>) => void;
}

export default function VideoPreview({ file, recipe, videoRef, textOverlays, onUpdateTextOverlay }: Props) {
  const lastId = useRef(0);
  const urlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const onLoadedRef = useRef<(() => void) | null>(null);

  /* ── Drag and Tap state for text overlays ── */
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    target: HTMLElement;
    pointerId: number;
  } | null>(null);

  /** Begin dragging a text overlay. */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, overlay: TextOverlay) => {
      // Ignore if the element is being edited
      if ((e.target as HTMLElement).isContentEditable) return;

      const now = Date.now();
      if (lastTapRef.current.id === overlay.id && now - lastTapRef.current.time < 300) {
        // Double tap detected
        setEditingTextId(overlay.id);
        setTimeout(() => {
          const el = document.getElementById(`overlay-text-${overlay.id}`);
          if (el) {
            el.focus();
            if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }
        }, 0);
        lastTapRef.current = { id: "", time: 0 };
        return;
      }
      lastTapRef.current = { id: overlay.id, time: now };

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      dragRef.current = {
        id: overlay.id,
        startX: e.clientX,
        startY: e.clientY,
        origX: overlay.x,
        origY: overlay.y,
        target,
        pointerId: e.pointerId
      };
    },
    []
  );

  /** Move the text overlay while dragging. */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      const container = containerRef.current;
      if (!drag || !container || !onUpdateTextOverlay) return;
      if (e.pointerId !== drag.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const dx = ((e.clientX - drag.startX) / rect.width) * 100;
      const dy = ((e.clientY - drag.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, drag.origX + dx));
      const newY = Math.max(0, Math.min(100, drag.origY + dy));
      onUpdateTextOverlay(drag.id, { x: newX, y: newY });
    },
    [onUpdateTextOverlay]
  );

  /** Finish dragging. */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag && e.pointerId === drag.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      try {
        drag.target.releasePointerCapture(drag.pointerId);
      } catch (err) {
        // ignore if already released
      }
      dragRef.current = null;
    }
  }, []);

  const [frameNotice, setFrameNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isExportingFrame, setIsExportingFrame] = useState(false);
  const isExportingFrameRef = useRef(false);
  const activeRecipe = recipe ?? DEFAULT_RECIPE;

  useEffect(() => {
    if (!frameNotice) return;

    const timeoutId = window.setTimeout(() => setFrameNotice(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [frameNotice]);

  /** Capture the current video frame and download it as a PNG. */
  const handleGrabFrame = useCallback(async () => {
    if (isExportingFrameRef.current) return;

    const video = videoRef.current;
    if (!video) {
      setFrameNotice({ kind: "error", message: "No video frame is available yet." });
      return;
    }

    isExportingFrameRef.current = true;
    setIsExportingFrame(true);

    try {
      const { blob, filename } = await captureFrameAsPng(video, activeRecipe);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFrameNotice({ kind: "success", message: `Saved ${filename}` });
    } catch (error) {
      console.error("frame export failed:", error);
      setFrameNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "Frame export failed.",
      });
    } finally {
      isExportingFrameRef.current = false;
      setIsExportingFrame(false);
    }
  }, [activeRecipe, videoRef]);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "KeyT") {
        e.preventDefault();
        void handleGrabFrame();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [handleGrabFrame]);
  useEffect(() => {
    if (!file) return;

    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    setIsLoading(true);
    const id = ++lastId.current;
    const url = URL.createObjectURL(file);

    // cleanup previous object URL safely
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }
    urlRef.current = url;

    const video = videoRef.current;
    if (!video) return;

    video.src = url;
    video.load();

    // define handler once per effect run
    const handleLoaded = () => {
      if (lastId.current !== id) return;
      video.play().catch(() => { });
    };

    onLoadedRef.current = handleLoaded;

    video.addEventListener("loadeddata", handleLoaded);

    return () => {
      // cleanup event listener safely
      if (onLoadedRef.current) {
        video.removeEventListener("loadeddata", onLoadedRef.current);
        onLoadedRef.current = null;
      }

      // stop playback safely
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }

      // revoke only if still current
      if (urlRef.current === url) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file, videoRef]);

  /**
   * Compute the overlay geometry for the selected preset + framing mode.
   * The preview container always uses a 16:9 aspect-video box.
   * We express widths/heights as percentage strings for CSS.
   */
  const overlay = (() => {
    if (!recipe || !showOverlay) return null;

    const preset = recipe.preset === "custom"
      ? { width: recipe.customWidth, height: recipe.customHeight }
      : getPresetById(recipe.preset);

    if (!preset) return null;

    // Preview container is 16:9
    const containerW = 16;
    const containerH = 9;
    const containerRatio = containerW / containerH;   // 1.777…
    const outputRatio = preset.width / preset.height;

    if (recipe.framing === "fit") {
      // Letterbox: the output video fits entirely inside 16:9, padded with bars.
      if (outputRatio > containerRatio) {
        // Wider output → pillarbox bars on top & bottom
        const contentH = (containerRatio / outputRatio) * 100;
        const barH = (100 - contentH) / 2;
        return { mode: "fit", barTop: `${barH}%`, barBottom: `${barH}%`, barLeft: "0", barRight: "0" };
      } else {
        // Taller output → letterbox bars on left & right
        const contentW = (outputRatio / containerRatio) * 100;
        const barW = (100 - contentW) / 2;
        return { mode: "fit", barTop: "0", barBottom: "0", barLeft: `${barW}%`, barRight: `${barW}%` };
      }
    } else {
      // Fill / crop: the output fills the entire 16:9 preview — show a box representing what survives the crop.
      if (outputRatio < containerRatio) {
        // Output is taller → crops top & bottom
        const visibleH = (outputRatio / containerRatio) * 100;
        const cropH = (100 - visibleH) / 2;
        return { mode: "fill", barTop: `${cropH}%`, barBottom: `${cropH}%`, barLeft: "0", barRight: "0" };
      } else {
        // Output is wider → crops left & right
        const visibleW = (containerRatio / outputRatio) * 100;
        const cropW = (100 - visibleW) / 2;
        return { mode: "fill", barTop: "0", barBottom: "0", barLeft: `${cropW}%`, barRight: `${cropW}%` };
      }
    }
  })();

  if (!file) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.code === "Space") {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const video = videoRef.current;
      if (video) {
        e.preventDefault(); // Prevent default page scroll
        if (video.paused) {
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      className="relative w-full rounded-lg overflow-hidden bg-[#0a0a0a] aspect-video focus:outline-none focus-visible:ring-2 focus-visible:ring-film-500"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Video preview (press Space to play/pause)"
    >
      {isLoading && (
        <div
          className="absolute inset-0 animate-pulse bg-gray-700 rounded-xl transition-opacity duration-300"
          aria-label="Loading video preview"
        />
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        controls
        className={cn("w-full h-full object-contain transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}
        onLoadedData={() => setIsLoading(false)}
        playsInline
      />

      {/* Letterbox / Crop overlay */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {overlay.mode === "fit" ? (
            // Letterbox: semi-transparent bars outside the content area
            <>
              <div className="absolute left-0 right-0 top-0 bg-black/50" style={{ height: overlay.barTop }} />
              <div className="absolute left-0 right-0 bottom-0 bg-black/50" style={{ height: overlay.barBottom }} />
              <div className="absolute top-0 bottom-0 left-0 bg-black/50" style={{ width: overlay.barLeft }} />
              <div className="absolute top-0 bottom-0 right-0 bg-black/50" style={{ width: overlay.barRight }} />
            </>
          ) : (
            // Fill/crop: dashed border around the surviving area, dimmed outside
            <>
              <div className="absolute left-0 right-0 top-0 bg-red-900/50" style={{ height: overlay.barTop }} />
              <div className="absolute left-0 right-0 bottom-0 bg-red-900/50" style={{ height: overlay.barBottom }} />
              <div className="absolute top-0 bottom-0 left-0 bg-red-900/50" style={{ width: overlay.barLeft }} />
              <div className="absolute top-0 bottom-0 right-0 bg-red-900/50" style={{ width: overlay.barRight }} />
              <div
                className="absolute border-2 border-dashed border-film-400"
                style={{
                  top: overlay.barTop,
                  bottom: overlay.barBottom,
                  left: overlay.barLeft,
                  right: overlay.barRight,
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Draggable text overlays */}
      {textOverlays?.map((overlay) => (
        <div
          key={overlay.id}
          className="absolute select-none cursor-grab active:cursor-grabbing z-10 pointer-events-auto"
          style={{
            left: `${overlay.x}%`,
            top: `${overlay.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${overlay.fontSize}px`,
            color: overlay.color,
            fontWeight: overlay.fontWeight,
            textShadow: "0 1px 4px rgba(0,0,0,0.7)",
            lineHeight: 1.2,
            touchAction: "none",
          }}
          onPointerDown={(e) => handlePointerDown(e, overlay)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={`Text overlay: ${overlay.text}`}
        >
          <span
            id={`overlay-text-${overlay.id}`}
            contentEditable={editingTextId === overlay.id}
            suppressContentEditableWarning
            className={cn(
              "outline-none min-w-[2ch] inline-block transition-colors",
              editingTextId === overlay.id ? "cursor-text border-b border-dashed border-film-500/50" : "cursor-grab active:cursor-grabbing"
            )}
            onDoubleClick={() => {
              setEditingTextId(overlay.id);
              setTimeout(() => {
                const el = document.getElementById(`overlay-text-${overlay.id}`);
                if (el) {
                  el.focus();
                  // Place cursor at the end
                  if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    range.collapse(false);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }
                }
              }, 0);
            }}
            onBlur={(e) => {
              setEditingTextId(null);
              onUpdateTextOverlay?.(overlay.id, {
                text: (e.target as HTMLElement).textContent || "",
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          >
            {overlay.text}
          </span>
        </div>
      ))}

      {/* Toggle button */}
      {recipe && !isLoading && (
        <button
          type="button"
          onClick={() => setShowOverlay((v) => !v)}
          className={`absolute bottom-10 right-2 px-2 py-1 text-[10px] font-heading font-bold uppercase tracking-wider rounded transition-colors z-10 pointer-events-auto ${showOverlay
              ? "bg-film-600 text-white"
              : "bg-black/60 text-white/70 hover:bg-black/80"
            }`}
          aria-pressed={showOverlay}
          aria-label={showOverlay ? "Hide framing overlay" : "Show framing overlay"}
          title={showOverlay ? "Hide framing overlay" : "Show framing overlay"}
        >
          {showOverlay ? "Hide overlay" : "Show overlay"}
        </button>
      )}

      {/* Grab frame button */}
      {!isLoading && (
        <button
          type="button"
          onClick={() => void handleGrabFrame()}
          disabled={isExportingFrame}
          className="absolute top-2 right-2 px-2 py-1 text-[10px] font-heading font-bold uppercase tracking-wider rounded transition-colors z-10 pointer-events-auto bg-black/60 text-white/70 hover:bg-black/80 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export current frame as PNG"
          aria-keyshortcuts="T"
          title="Export current frame as PNG (T)"
        >
          <Camera className="w-3 h-3" />
          {isExportingFrame ? "Exporting" : "Export frame"}
        </button>
      )}
    </div>
  );
}
