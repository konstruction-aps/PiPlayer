"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { EditorElement, EditorLayout } from "@/lib/types";
import { THEMES } from "@/lib/themes";

type Props = {
  initial: EditorLayout;
};

type DragState =
  | { kind: "move"; id: string; ox: number; oy: number; startX: number; startY: number }
  | { kind: "resize"; id: string; ox: number; oy: number; startW: number; startH: number }
  | null;

function uid() {
  return `tmp_${Math.random().toString(36).slice(2, 10)}`;
}

export function LayoutEditor({ initial }: Props) {
  const [layout, setLayout] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showThemes, setShowThemes] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(0.45);

  const selected = layout.elements.find((e) => e.id === selectedId) || null;

  useEffect(() => {
    const fit = () => {
      const pad = 80;
      const availW = Math.max(320, window.innerWidth - 360 - pad);
      const availH = Math.max(240, window.innerHeight - 140);
      const s = Math.min(availW / layout.width, availH / layout.height, 0.7);
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [layout.width, layout.height]);

  const updateElement = useCallback((id: string, patch: Partial<EditorElement>) => {
    setLayout((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
    }));
  }, []);

  const addText = () => {
    const el: EditorElement = {
      id: uid(),
      type: "text",
      x: 200,
      y: 200,
      width: 600,
      height: 120,
      rotation: 0,
      zIndex: layout.elements.length + 1,
      content: "Double-click to edit",
      fontFamily: "Georgia, serif",
      fontSize: 56,
      fontWeight: "400",
      color: layout.backgroundColor === "#F7F1E5" ? "#1A120B" : "#F4F0E6",
      textAlign: "left",
      imageUrl: null,
      objectFit: null,
    };
    setLayout((p) => ({ ...p, elements: [...p.elements, el] }));
    setSelectedId(el.id);
    setEditingTextId(el.id);
  };

  const addImageFromFile = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/media", { method: "POST", body });
    if (!res.ok) {
      alert("Could not upload picture");
      return;
    }
    const data = await res.json();
    const el: EditorElement = {
      id: uid(),
      type: "image",
      x: 360,
      y: 180,
      width: 720,
      height: 480,
      rotation: 0,
      zIndex: layout.elements.length + 1,
      content: null,
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      color: null,
      textAlign: null,
      imageUrl: data.url,
      objectFit: "cover",
    };
    setLayout((p) => ({ ...p, elements: [...p.elements, el] }));
    setSelectedId(el.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setLayout((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
    setEditingTextId(null);
  };

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const elements: EditorElement[] = theme.elements.map((e, i) => ({
      id: uid(),
      type: e.type,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      rotation: 0,
      zIndex: e.zIndex || i + 1,
      content: e.content ?? null,
      fontFamily: e.fontFamily ?? null,
      fontSize: e.fontSize ?? null,
      fontWeight: e.fontWeight ?? null,
      color: e.color ?? null,
      textAlign: e.textAlign ?? null,
      imageUrl: null,
      objectFit: e.type === "image" ? "cover" : null,
    }));
    setLayout((p) => ({
      ...p,
      theme: theme.id,
      backgroundColor: theme.backgroundColor,
      backgroundImage: null,
      elements,
    }));
    setSelectedId(null);
    setShowThemes(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/layouts/${layout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: layout.name,
          backgroundColor: layout.backgroundColor,
          backgroundImage: layout.backgroundImage,
          theme: layout.theme,
          elements: layout.elements,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      setLayout((p) => ({ ...p, elements: data.elements }));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      alert("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onPointerDownMove = (e: ReactPointerEvent, id: string) => {
    if (editingTextId === id) return;
    e.stopPropagation();
    e.preventDefault();
    const el = layout.elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    dragRef.current = {
      kind: "move",
      id,
      ox: e.clientX,
      oy: e.clientY,
      startX: el.x,
      startY: el.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerDownResize = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const el = layout.elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    dragRef.current = {
      kind: "resize",
      id,
      ox: e.clientX,
      oy: e.clientY,
      startW: el.width,
      startH: el.height,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.ox) / scale;
      const dy = (e.clientY - drag.oy) / scale;
      if (drag.kind === "move") {
        updateElement(drag.id, {
          x: Math.round(drag.startX + dx),
          y: Math.round(drag.startY + dy),
        });
      } else {
        updateElement(drag.id, {
          width: Math.max(40, Math.round(drag.startW + dx)),
          height: Math.max(40, Math.round(drag.startH + dy)),
        });
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [scale, updateElement]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingTextId) return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        e.preventDefault();
        removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <Link href="/pages" className="ghost-link">
          ← Pages
        </Link>
        <input
          className="name-input"
          value={layout.name}
          onChange={(e) => setLayout((p) => ({ ...p, name: e.target.value }))}
          aria-label="Page name"
        />
        <div className="top-actions">
          {savedAt && <span className="saved-hint">Saved {savedAt}</span>}
          <button type="button" className="btn soft" onClick={() => setShowThemes(true)}>
            Themes
          </button>
          <button type="button" className="btn soft" onClick={addText}>
            + Text
          </button>
          <button type="button" className="btn soft" onClick={() => fileRef.current?.click()}>
            + Picture
          </button>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void addImageFromFile(f);
            e.target.value = "";
          }}
        />
      </header>

      <div className="editor-body">
        <div
          className="stage-wrap"
          onPointerDown={() => {
            setSelectedId(null);
            setEditingTextId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type.startsWith("image/")) void addImageFromFile(file);
          }}
        >
          <div
            ref={stageRef}
            className="stage"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${scale})`,
              backgroundColor: layout.backgroundColor,
              backgroundImage: layout.backgroundImage
                ? `url(${layout.backgroundImage})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {layout.elements.map((el) => (
              <div
                key={el.id}
                className={`el ${selectedId === el.id ? "selected" : ""} ${el.type}`}
                style={{
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  zIndex: el.zIndex,
                  transform: `rotate(${el.rotation}deg)`,
                }}
                onPointerDown={(e) => onPointerDownMove(e, el.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (el.type === "text") setEditingTextId(el.id);
                }}
              >
                {el.type === "text" ? (
                  editingTextId === el.id ? (
                    <textarea
                      className="text-edit"
                      autoFocus
                      value={el.content || ""}
                      style={{
                        fontFamily: el.fontFamily || undefined,
                        fontSize: el.fontSize || 48,
                        fontWeight: (el.fontWeight as CSSProperties["fontWeight"]) || 400,
                        color: el.color || "#fff",
                        textAlign: (el.textAlign as CSSProperties["textAlign"]) || "left",
                      }}
                      onChange={(e) => updateElement(el.id, { content: e.target.value })}
                      onBlur={() => setEditingTextId(null)}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="text-view"
                      style={{
                        fontFamily: el.fontFamily || undefined,
                        fontSize: el.fontSize || 48,
                        fontWeight: (el.fontWeight as CSSProperties["fontWeight"]) || 400,
                        color: el.color || "#fff",
                        textAlign: (el.textAlign as CSSProperties["textAlign"]) || "left",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {el.content}
                    </div>
                  )
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={el.imageUrl || ""}
                    alt=""
                    draggable={false}
                    style={{ objectFit: (el.objectFit as CSSProperties["objectFit"]) || "cover" }}
                  />
                )}
                {selectedId === el.id && (
                  <button
                    type="button"
                    className="resize-handle"
                    aria-label="Resize"
                    onPointerDown={(e) => onPointerDownResize(e, el.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="inspector">
          <h2>Inspector</h2>
          {!selected && <p className="muted">Click something on the page to edit it.</p>}
          {selected?.type === "text" && (
            <div className="fields">
              <label>
                Font
                <select
                  value={selected.fontFamily || "Georgia, serif"}
                  onChange={(e) => updateElement(selected.id, { fontFamily: e.target.value })}
                >
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Helvetica Neue, Arial, sans-serif">Helvetica</option>
                  <option value="Courier New, monospace">Courier</option>
                  <option value="Impact, Haettenschweiler, sans-serif">Impact</option>
                  <option value="Palatino Linotype, Palatino, serif">Palatino</option>
                </select>
              </label>
              <label>
                Size
                <input
                  type="number"
                  min={12}
                  max={240}
                  value={selected.fontSize || 48}
                  onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                />
              </label>
              <label>
                Color
                <input
                  type="color"
                  value={selected.color || "#ffffff"}
                  onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                />
              </label>
              <label>
                Align
                <select
                  value={selected.textAlign || "left"}
                  onChange={(e) => updateElement(selected.id, { textAlign: e.target.value })}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label>
                Weight
                <select
                  value={selected.fontWeight || "400"}
                  onChange={(e) => updateElement(selected.id, { fontWeight: e.target.value })}
                >
                  <option value="400">Regular</option>
                  <option value="700">Bold</option>
                </select>
              </label>
            </div>
          )}
          {selected?.type === "image" && (
            <div className="fields">
              <label>
                Fit
                <select
                  value={selected.objectFit || "cover"}
                  onChange={(e) => updateElement(selected.id, { objectFit: e.target.value })}
                >
                  <option value="cover">Fill</option>
                  <option value="contain">Fit</option>
                </select>
              </label>
              <button
                type="button"
                className="btn soft"
                onClick={() => fileRef.current?.click()}
              >
                Replace picture
              </button>
            </div>
          )}
          <div className="fields" style={{ marginTop: 24 }}>
            <label>
              Page color
              <input
                type="color"
                value={layout.backgroundColor}
                onChange={(e) => setLayout((p) => ({ ...p, backgroundColor: e.target.value }))}
              />
            </label>
          </div>
          {selected && (
            <button type="button" className="btn danger" onClick={removeSelected}>
              Delete
            </button>
          )}
        </aside>
      </div>

      {showThemes && (
        <div className="modal-backdrop" onClick={() => setShowThemes(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Choose a theme</h2>
            <p className="muted">Like iWeb themes — start from a layout, then make it yours.</p>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="theme-card"
                  onClick={() => applyTheme(t.id)}
                >
                  <span className="theme-swatch" style={{ background: t.preview }} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn soft" onClick={() => setShowThemes(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
