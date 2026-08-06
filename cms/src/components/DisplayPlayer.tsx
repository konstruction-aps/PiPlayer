"use client";

import { useEffect, useState, type CSSProperties } from "react";

type PlayerElement = {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: string | null;
  fontFamily: string | null;
  fontSize: number | null;
  fontWeight: string | null;
  color: string | null;
  textAlign: string | null;
  imageUrl: string | null;
  objectFit: string | null;
};

type PlayerLayout = {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage: string | null;
  elements: PlayerElement[];
};

export function DisplayPlayer({ screenId }: { screenId: string }) {
  const [layout, setLayout] = useState<PlayerLayout | null>(null);
  const [name, setName] = useState("");
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/display/${screenId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setName(data.screen?.name || "");
        setLayout(data.layout);
      } catch {
        /* ignore transient network errors */
      }
    };
    void load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [screenId]);

  useEffect(() => {
    if (!layout) return;
    const fit = () => {
      const s = Math.min(window.innerWidth / layout.width, window.innerHeight / layout.height);
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [layout]);

  if (!layout) {
    return (
      <div className="display-empty">
        <p>{name || "Screen"}</p>
        <p>No page assigned yet. Open Lumen and pick a page for this screen.</p>
      </div>
    );
  }

  return (
    <div className="display-root">
      <div
        className="display-stage"
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
            className="display-el"
            style={{
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex,
              transform: `rotate(${el.rotation}deg)`,
            }}
          >
            {el.type === "text" ? (
              <div
                style={{
                  fontFamily: el.fontFamily || undefined,
                  fontSize: el.fontSize || 48,
                  fontWeight: (el.fontWeight as CSSProperties["fontWeight"]) || 400,
                  color: el.color || "#fff",
                  textAlign: (el.textAlign as CSSProperties["textAlign"]) || "left",
                  whiteSpace: "pre-wrap",
                  width: "100%",
                  height: "100%",
                }}
              >
                {el.content}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={el.imageUrl || ""}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: (el.objectFit as CSSProperties["objectFit"]) || "cover",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
