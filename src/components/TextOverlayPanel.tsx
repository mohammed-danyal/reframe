import { TextOverlay } from "@/lib/types";
import { Plus, Trash2, Bold, Type } from "lucide-react";

interface TextOverlayPanelProps {
  textOverlays: TextOverlay[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<TextOverlay, "id">>) => void;
  onRemove: (id: string) => void;
}

const COLOR_PRESETS = [
  "#ffffff",
  "#000000",
  "#e63946",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
];

/**
 * Sidebar panel for managing text overlays.
 * Follows the same compact UI patterns used by ImageOverlayPanel.
 */
export default function TextOverlayPanel({
  textOverlays,
  onAdd,
  onUpdate,
  onRemove,
}: TextOverlayPanelProps) {
  return (
    <div className="w-full text-[11px] text-[var(--text)] space-y-3">
      {/* Add Text button */}
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition text-[10px] font-heading font-semibold uppercase tracking-wider"
        aria-label="Add text overlay"
      >
        <Plus size={12} />
        Add Text
      </button>

      {/* Per-overlay controls */}
      {textOverlays.map((overlay, index) => (
        <div
          key={overlay.id}
          className="rounded-lg border border-[var(--border)] bg-[#121d30]/20 p-2.5 space-y-2 animate-fade-in"
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-[var(--muted)]">
              Text {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onRemove(overlay.id)}
              className="w-5 h-5 rounded flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
              title="Remove text overlay"
              aria-label={`Remove text overlay ${index + 1}`}
            >
              <Trash2 size={10} />
            </button>
          </div>

          {/* Text input */}
          <input
            type="text"
            value={overlay.text}
            onChange={(e) => onUpdate(overlay.id, { text: e.target.value })}
            className="w-full rounded border border-[var(--border)] bg-transparent px-2 py-1 text-[11px] text-[var(--text)] focus:border-film-500 focus:outline-none"
            placeholder="Enter text…"
            aria-label={`Text content for overlay ${index + 1}`}
          />

          {/* Font size + weight row */}
          <div className="flex items-center gap-2">
            <Type size={11} className="text-[var(--muted)] shrink-0" />
            <input
              type="number"
              min={8}
              max={120}
              value={overlay.fontSize}
              onChange={(e) => onUpdate(overlay.id, { fontSize: Number(e.target.value) })}
              className="w-14 rounded border border-[var(--border)] bg-transparent px-1.5 py-0.5 text-[10px] text-[var(--text)] text-center focus:border-film-500 focus:outline-none"
              aria-label={`Font size for overlay ${index + 1}`}
            />
            <span className="text-[9px] text-[var(--muted)]">px</span>
            <button
              type="button"
              onClick={() =>
                onUpdate(overlay.id, {
                  fontWeight: overlay.fontWeight === "bold" ? "normal" : "bold",
                })
              }
              className={`ml-auto w-6 h-6 rounded flex items-center justify-center border transition ${
                overlay.fontWeight === "bold"
                  ? "border-film-500 text-white bg-film-600/10"
                  : "border-[var(--border)] text-[var(--muted)] hover:bg-white/5"
              }`}
              title="Toggle bold"
              aria-label={`Toggle bold for overlay ${index + 1}`}
              aria-pressed={overlay.fontWeight === "bold"}
            >
              <Bold size={11} />
            </button>
          </div>

          {/* Color presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)] text-[10px] w-8 shrink-0">Color:</span>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdate(overlay.id, { color: c })}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  overlay.color === c ? "border-film-500 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                title={c}
                aria-label={`Set color to ${c}`}
              />
            ))}
            {/* Custom color picker */}
            <label className="relative w-5 h-5 shrink-0 cursor-pointer" title="Custom color">
              <input
                type="color"
                value={overlay.color}
                onChange={(e) => onUpdate(overlay.id, { color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label={`Custom color for overlay ${index + 1}`}
              />
              <span
                className={`block w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  !COLOR_PRESETS.includes(overlay.color) ? "border-film-500 scale-110" : "border-[var(--border)]"
                }`}
                style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
              />
            </label>
          </div>
        </div>
      ))}

      {textOverlays.length === 0 && (
        <p className="text-[10px] text-[var(--muted)] italic text-center">
          No text overlays added
        </p>
      )}
    </div>
  );
}
