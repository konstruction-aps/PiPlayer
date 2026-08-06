"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PairPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pair = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Pairing failed");
        return;
      }
      localStorage.setItem("lumen_device_token", data.deviceToken);
      localStorage.setItem("lumen_screen_id", data.screenId);
      router.push(`/display/${data.screenId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="hero-landing">
      <div className="hero-card">
        <p className="brand-mark">Pair</p>
        <p className="tag">Type the code from Lumen → Screens</p>
        <form className="login-form" onSubmit={pair}>
          <label>
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoFocus
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary wide" type="submit" disabled={busy}>
            {busy ? "Pairing…" : "Connect screen"}
          </button>
        </form>
      </div>
    </main>
  );
}
