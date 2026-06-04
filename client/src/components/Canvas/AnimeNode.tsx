import { useRef } from "react";
import type { AnimeEntry } from "../../types";
import { ANIME_RADIUS } from "../../stores/graphStore";
import "./AnimeNode.css";

const COLORS = [
  { border: "#00c8ff", glow: "rgba(0,200,255,0.28)" },
  { border: "#00ff88", glow: "rgba(0,255,136,0.28)" },
  { border: "#7b61ff", glow: "rgba(123,97,255,0.28)" },
  { border: "#ff6b9d", glow: "rgba(255,107,157,0.28)" },
  { border: "#ffb800", glow: "rgba(255,184,0,0.28)" },
  { border: "#00e5cc", glow: "rgba(0,229,204,0.28)" },
  { border: "#ff4757", glow: "rgba(255,71,87,0.28)" },
  { border: "#a8ff78", glow: "rgba(168,255,120,0.28)" },
];

export function getAnimeColor(index: number) {
  return COLORS[index % COLORS.length];
}

interface Props {
  anime: AnimeEntry;
  colorIndex: number;
  onDragStart: (anilistId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onNodeClick: (anilistId: number) => void;
}

export default function AnimeNode({ anime, colorIndex, onDragStart, onNodeClick }: Props) {
  const color = getAnimeColor(colorIndex);
  const clickStart = useRef<{ x: number; y: number } | null>(null);
  const D = ANIME_RADIUS * 2;

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    clickStart.current = { x: e.clientX, y: e.clientY };
    onDragStart(anime.anilistId, e);
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!clickStart.current) return;
    if (Math.hypot(e.clientX - clickStart.current.x, e.clientY - clickStart.current.y) < 6)
      onNodeClick(anime.anilistId);
    clickStart.current = null;
  };
  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    clickStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    onDragStart(anime.anilistId, e);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!clickStart.current || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - clickStart.current.x, t.clientY - clickStart.current.y) < 10)
      onNodeClick(anime.anilistId);
    clickStart.current = null;
  };

  return (
    <div
      className="anime-node"
      style={{ position: "absolute", left: anime.positionX - ANIME_RADIUS, top: anime.positionY - ANIME_RADIUS,
        width: D, height: D, borderColor: color.border,
        boxShadow: `0 0 20px ${color.glow}, 0 0 40px ${color.glow}` }}
      onMouseDown={onMouseDown} onMouseUp={onMouseUp}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
    >
      {anime.coverImage
        ? <img src={anime.coverImage} alt={anime.title} className="anime-node-img" />
        : <div className="anime-node-placeholder">{anime.title[0]}</div>}
      <div className="anime-node-label">
        <span>{anime.title}</span>
      </div>
    </div>
  );
}
