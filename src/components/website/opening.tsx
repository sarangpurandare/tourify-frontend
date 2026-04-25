"use client";

import { useState, useEffect, useRef } from "react";
import { IMG, MAP_DESTS, WORLD_PATH } from "@/lib/website-data";

function BoardingPass() {
  return (
    <div className="bp-card">
      <div className="bp-left">
        <div className="bp-head">
          <div>
            <div className="bp-brand">Boarding <em>Pass</em></div>
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 4 }}>
              ESTD. 2016 · MUMBAI
            </div>
          </div>
          <div className="bp-flight">
            FLIGHT · <strong>BP-026</strong><br/>
            CLASS · <strong>WINDOW SEAT</strong><br/>
            DATE · <strong>2026 — A YEAR</strong>
          </div>
        </div>
        <div className="bp-route">
          <div>
            <div className="bp-iata">BOM</div>
            <div className="bp-place">Mumbai · Origin</div>
          </div>
          <div className="bp-arrow" aria-hidden="true">
            <svg viewBox="0 0 100 32">
              <path d="M5 16 H85" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" fill="none" />
              <path d="M82 10 L92 16 L82 22" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="plane">✈</span>
          </div>
          <div>
            <div className="bp-iata right">EDI</div>
            <div className="bp-place">Edinburgh · Scotland</div>
          </div>
        </div>
        <div className="bp-meta-row">
          <div className="bp-meta-cell"><div className="l">Passenger</div><div className="v">You</div></div>
          <div className="bp-meta-cell"><div className="l">Group</div><div className="v">12</div></div>
          <div className="bp-meta-cell"><div className="l">Pace</div><div className="v">Slow</div></div>
          <div className="bp-meta-cell"><div className="l">Boarding</div><div className="v">Now</div></div>
        </div>
      </div>
      <div className="bp-right">
        <div className="bp-stamp">Cleared<br/>For<br/>Curiosity</div>
        <div className="bp-right-stub">Seat · Window</div>
        <div className="bp-right-num">14A</div>
        <div className="bp-right-place">somewhere<br/>worth going</div>
        <div className="bp-barcode" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <i key={i} style={{ height: 18 + ((i * 37) % 24) }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorldMap() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="map-canvas">
      <svg className="world" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g className="grid">
          {[100, 200, 300, 400].map(y => <line key={"h"+y} x1="0" y1={y} x2="1000" y2={y} />)}
          {[200, 400, 600, 800].map(x => <line key={"v"+x} x1={x} y1="0" x2={x} y2="500" />)}
        </g>
        <path className="land" d={WORLD_PATH} />
        {MAP_DESTS.map((d, i) => {
          const x1 = 520, y1 = 230;
          const cx = (x1 + d.x) / 2;
          const cy = Math.min(y1, d.y) - Math.abs(d.x - x1) * 0.18 - 30;
          return (
            <path
              key={i}
              className="map-arc"
              d={`M${x1},${y1} Q${cx},${cy} ${d.x},${d.y}`}
              style={{ animationDelay: `${i * 0.4}s`, opacity: hovered === i ? 1 : 0.5 }}
            />
          );
        })}
        <circle cx="520" cy="230" r="3.5" fill="#1F1A14" />
        <circle cx="520" cy="230" r="9" fill="none" stroke="rgba(31,26,20,0.35)" strokeWidth="0.8" />
      </svg>
      {MAP_DESTS.map((d, i) => (
        <div
          key={i}
          className="map-pin"
          style={{ left: `${(d.x / 1000) * 100}%`, top: `${(d.y / 500) * 100}%`, "--delay": `${i * 0.3}s` } as React.CSSProperties}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className={`ring ${d.tone}`} />
          <div className="label">{d.code} · {d.name}</div>
          <div className="photo">
            <img src={d.img} alt={d.name} />
            <div className="cap">{d.cap}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OpeningSequence() {
  const [stage, setStage] = useState<"bp" | "map">("bp");
  const skippedRef = useRef(false);

  useEffect(() => {
    if (skippedRef.current) return;
    const t = setTimeout(() => setStage("map"), 4200);
    return () => clearTimeout(t);
  }, []);

  const skip = () => {
    skippedRef.current = true;
    setStage("map");
  };

  return (
    <section className="opening" data-stage={stage}>
      <div className="opening-progress">
        <span className={stage === "bp" ? "active" : ""} />
        <span className={stage === "map" ? "active" : ""} />
      </div>
      {stage === "bp" && (
        <button className="map-skip" onClick={skip}>Skip intro →</button>
      )}
      <div className="bp-stage">
        <BoardingPass />
      </div>
      <div className="map-stage">
        <div className="map-eyebrow-row">
          <span className="dot" />
          <span>Nine destinations · Small groups · One unhurried year</span>
        </div>
        <h1 className="map-headline">
          Where Every Stamp<br/>
          Tells <em>A Story.</em>
        </h1>
        <p className="map-sub">
          Hover any pin. These are the places we travel to — small-group journeys for travellers who'd rather know a country than tick it off.
        </p>
        <WorldMap />
        <div className="map-cue">
          <span>Scroll to see the trips</span>
          <span className="arrow" />
        </div>
      </div>
    </section>
  );
}
