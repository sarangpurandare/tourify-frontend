"use client";

import { useState, useEffect, useRef } from "react";
import type { SiteConfig } from "@/types/website-template";

type OpeningProps = SiteConfig["opening"];

function BoardingPass({ pass }: { pass: OpeningProps["pass"] }) {
  return (
    <div className="bp-card">
      <div className="bp-left">
        <div className="bp-head">
          <div>
            <div
              className="bp-brand"
              dangerouslySetInnerHTML={{ __html: pass.brandHtml }}
            />
            <div
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginTop: 4,
              }}
            >
              {pass.established}
            </div>
          </div>
          <div className="bp-flight">
            FLIGHT · <strong>{pass.flightCode}</strong>
            <br />
            CLASS · <strong>{pass.flightClass}</strong>
            <br />
            DATE · <strong>{pass.flightDate}</strong>
          </div>
        </div>
        <div className="bp-route">
          <div>
            <div className="bp-iata">{pass.origin.code}</div>
            <div className="bp-place">{pass.origin.city}</div>
          </div>
          <div className="bp-arrow" aria-hidden="true">
            <svg viewBox="0 0 100 32">
              <path
                d="M5 16 H85"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 4"
                fill="none"
              />
              <path
                d="M82 10 L92 16 L82 22"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="plane">✈</span>
          </div>
          <div>
            <div className="bp-iata right">{pass.destination.code}</div>
            <div className="bp-place">{pass.destination.city}</div>
          </div>
        </div>
        <div className="bp-meta-row">
          {pass.metaCells.map((c, i) => (
            <div className="bp-meta-cell" key={i}>
              <div className="l">{c.label}</div>
              <div className="v">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bp-right">
        <div className="bp-stamp">
          {pass.stampLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < pass.stampLines.length - 1 && <br />}
            </span>
          ))}
        </div>
        <div className="bp-right-stub">{pass.stubLabel}</div>
        <div className="bp-right-num">{pass.stubNumber}</div>
        <div
          className="bp-right-place"
          style={{ whiteSpace: "pre-line" }}
        >
          {pass.stubSubtext}
        </div>
        <div className="bp-barcode" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <i key={i} style={{ height: 18 + ((i * 37) % 24) }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorldMap({ map }: { map: OpeningProps["map"] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="map-canvas">
      <svg
        className="world"
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g className="grid">
          {[100, 200, 300, 400].map((y) => (
            <line key={"h" + y} x1="0" y1={y} x2="1000" y2={y} />
          ))}
          {[200, 400, 600, 800].map((x) => (
            <line key={"v" + x} x1={x} y1="0" x2={x} y2="500" />
          ))}
        </g>
        <path className="land" d={map.worldPath} />
        {map.destinations.map((d, i) => {
          const cx = (map.originX + d.x) / 2;
          const cy =
            Math.min(map.originY, d.y) -
            Math.abs(d.x - map.originX) * 0.18 -
            30;
          return (
            <path
              key={i}
              className="map-arc"
              d={`M${map.originX},${map.originY} Q${cx},${cy} ${d.x},${d.y}`}
              style={{
                animationDelay: `${i * 0.4}s`,
                opacity: hovered === i ? 1 : 0.5,
              }}
            />
          );
        })}
        <circle cx={map.originX} cy={map.originY} r="3.5" fill="#1F1A14" />
        <circle
          cx={map.originX}
          cy={map.originY}
          r="9"
          fill="none"
          stroke="rgba(31,26,20,0.35)"
          strokeWidth="0.8"
        />
      </svg>
      {map.destinations.map((d, i) => (
        <div
          key={i}
          className="map-pin"
          style={
            {
              left: `${(d.x / 1000) * 100}%`,
              top: `${(d.y / 500) * 100}%`,
              "--delay": `${i * 0.3}s`,
            } as React.CSSProperties
          }
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          <span className={`ring ${d.tone}`} />
          <div className="label">
            {d.code} · {d.name}
          </div>
          <div className="photo">
            <img src={d.img} alt={d.name} />
            <div className="cap">{d.cap}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OpeningSequence(props: OpeningProps) {
  const [stage, setStage] = useState<"bp" | "map">("bp");
  const skippedRef = useRef(false);

  useEffect(() => {
    if (!props.enabled || skippedRef.current) return;
    const t = setTimeout(() => setStage("map"), 4200);
    return () => clearTimeout(t);
  }, [props.enabled]);

  const skip = () => {
    skippedRef.current = true;
    setStage("map");
  };

  if (!props.enabled) return null;

  return (
    <section className="opening" data-stage={stage}>
      <div className="opening-progress">
        <span className={stage === "bp" ? "active" : ""} />
        <span className={stage === "map" ? "active" : ""} />
      </div>
      {stage === "bp" && (
        <button className="map-skip" onClick={skip}>
          Skip intro →
        </button>
      )}
      <div className="bp-stage">
        <BoardingPass pass={props.pass} />
      </div>
      <div className="map-stage">
        <div className="map-eyebrow-row">
          <span className="dot" />
          <span>{props.map.eyebrow}</span>
        </div>
        <h1
          className="map-headline"
          dangerouslySetInnerHTML={{ __html: props.map.headlineHtml }}
        />
        <p className="map-sub">{props.map.subtitle}</p>
        <WorldMap map={props.map} />
        <div className="map-cue">
          <span>{props.map.cue}</span>
          <span className="arrow" />
        </div>
      </div>
    </section>
  );
}
