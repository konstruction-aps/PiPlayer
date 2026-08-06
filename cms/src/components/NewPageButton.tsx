"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEMES } from "@/lib/themes";

export function NewPageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async (theme: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled page", theme }),
      });
      if (!res.ok) {
        alert("Could not create page");
        return;
      }
      const page = await res.json();
      router.push(`/pages/${page.id}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button type="button" className="btn primary" onClick={() => setOpen(true)} disabled={busy}>
        + New page
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New page</h2>
            <p className="muted">Pick a theme, then drag text and pictures like iWeb.</p>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="theme-card"
                  disabled={busy}
                  onClick={() => void create(t.id)}
                >
                  <span className="theme-swatch" style={{ background: t.preview }} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn soft" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
