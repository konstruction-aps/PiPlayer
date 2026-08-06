"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LayoutOption = { id: string; name: string };
type ScreenRow = {
  id: string;
  name: string;
  location: string | null;
  pairingCode: string;
  status: string;
  layout: { id: string; name: string } | null;
};

export function ScreensManager({
  initialScreens,
  layouts,
}: {
  initialScreens: ScreenRow[];
  layouts: LayoutOption[];
}) {
  const router = useRouter();
  const [screens, setScreens] = useState(initialScreens);
  const [name, setName] = useState("");

  const refresh = () => router.refresh();

  const add = async () => {
    const res = await fetch("/api/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "New screen", layoutId: layouts[0]?.id }),
    });
    if (!res.ok) return alert("Could not add screen");
    const screen = await res.json();
    setScreens((s) => [screen, ...s]);
    setName("");
    refresh();
  };

  const assign = async (id: string, layoutId: string) => {
    const res = await fetch(`/api/screens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layoutId: layoutId || null }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setScreens((list) => list.map((s) => (s.id === id ? updated : s)));
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this screen?")) return;
    await fetch(`/api/screens/${id}`, { method: "DELETE" });
    setScreens((list) => list.filter((s) => s.id !== id));
  };

  return (
    <div className="screens-manager">
      <div className="inline-form">
        <input
          placeholder="Screen name (e.g. Lobby)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="button" className="btn primary" onClick={() => void add()}>
          Add screen
        </button>
      </div>

      <div className="screen-list">
        {screens.map((s) => (
          <article key={s.id} className="screen-row">
            <div>
              <h3>{s.name}</h3>
              <p className="muted">
                Code <strong className="code">{s.pairingCode}</strong>
                {s.location ? ` · ${s.location}` : ""} · {s.status}
              </p>
            </div>
            <label className="assign">
              Page
              <select
                value={s.layout?.id || ""}
                onChange={(e) => void assign(s.id, e.target.value)}
              >
                <option value="">None</option>
                {layouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <a className="btn soft" href={`/display/${s.id}`} target="_blank" rel="noreferrer">
              Preview
            </a>
            <button type="button" className="btn danger" onClick={() => void remove(s.id)}>
              Remove
            </button>
          </article>
        ))}
        {screens.length === 0 && <p className="muted">No screens yet. Add one above.</p>}
      </div>
    </div>
  );
}
