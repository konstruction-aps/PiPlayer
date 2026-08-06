"use client";

import { useRef, useState } from "react";

type Asset = { id: string; name: string; url: string; mimeType: string };

export function PicturesUploader({ initial }: { initial: Asset[] }) {
  const [assets, setAssets] = useState(initial);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body });
      if (!res.ok) {
        alert("Upload failed");
        return;
      }
      const asset = await res.json();
      setAssets((list) => [asset, ...list]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "+ Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="page-grid">
        {assets.map((a) => (
          <article key={a.id} className="page-card">
            <div
              className="thumb"
              style={{
                backgroundImage: `url(${a.url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="meta">
              <h3>{a.name}</h3>
              <p className="muted">{a.mimeType}</p>
            </div>
          </article>
        ))}
      </div>
      {assets.length === 0 && <p className="muted">No pictures yet.</p>}
    </>
  );
}
