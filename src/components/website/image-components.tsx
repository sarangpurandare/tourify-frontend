interface PHProps {
  label?: string;
  coord?: string;
  style?: React.CSSProperties;
  className?: string;
  src?: string;
  alt?: string;
}

export function PH({ label, coord, style, className, src, alt }: PHProps) {
  return (
    <div className={`ph ${className || ""} ${src ? "ph-img" : ""}`} style={style}>
      {src ? <img src={src} alt={alt || label || ""} loading="lazy" /> : null}
      {coord ? <div className="ph-coord">{coord}</div> : null}
      {label ? <div className="ph-label">{label}</div> : null}
    </div>
  );
}

interface PolaroidProps {
  label?: string;
  caption?: string;
  coord?: string;
  rotation?: number;
  style?: React.CSSProperties;
  className?: string;
  src?: string;
}

export function Polaroid({ label, caption, coord, rotation, style, className, src }: PolaroidProps) {
  return (
    <div className={`polaroid ${className || ""}`} style={{ transform: `rotate(${rotation || 0}deg)`, ...(style || {}) }}>
      <div className="tape" />
      <div className="polaroid-inner">
        <PH label={label} coord={coord} src={src} />
      </div>
      {caption ? <div className="polaroid-caption">{caption}</div> : null}
    </div>
  );
}
