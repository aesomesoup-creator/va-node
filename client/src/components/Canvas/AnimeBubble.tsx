import { useRef } from "react";
import type { AnimeEntry, Character } from "../../types";
import {
  useGraphStore,
  charRelativePos,
  CHAR_SIZE,
  CHAR_GAP,
  COLS,
  BUBBLE_HEADER_H,
  BUBBLE_PADDING,
  BUBBLE_WIDTH,
} from "../../stores/graphStore";
import { useUiStore } from "../../stores/uiStore";

const BUBBLE_COLORS = [
  { border: "#00c8ff", glow: "rgba(0,200,255,0.22)" },
  { border: "#00ff88", glow: "rgba(0,255,136,0.22)" },
  { border: "#7b61ff", glow: "rgba(123,97,255,0.22)" },
  { border: "#ff6b9d", glow: "rgba(255,107,157,0.22)" },
  { border: "#ffb800", glow: "rgba(255,184,0,0.22)" },
  { border: "#00e5cc", glow: "rgba(0,229,204,0.22)" },
  { border: "#ff4757", glow: "rgba(255,71,87,0.22)" },
  { border: "#a8ff78", glow: "rgba(168,255,120,0.22)" },
];

interface Props {
  anime: AnimeEntry;
  characters: Character[];
  colorIndex: number;
  canvasScale: number;
  onDragStart: (anilistId: number, e: React.MouseEvent | React.TouchEvent) => void;
  onBubbleClick: (anilistId: number) => void;
}

export default function AnimeBubble({
  anime, characters, colorIndex, onDragStart, onBubbleClick,
}: Props) {
  const color = BUBBLE_COLORS[colorIndex % BUBBLE_COLORS.length];
  const { hoveredSeiyuuId, setHoveredSeiyuu } = useUiStore();
  const { seiyuuGroups } = useGraphStore();
  const clickStart = useRef<{ x: number; y: number } | null>(null);

  const rows = Math.max(1, Math.ceil(Math.max(characters.length, 1) / COLS));
  // Height: header + padding + rows of chars + bottom padding
  const bubbleH =
    BUBBLE_HEADER_H + BUBBLE_PADDING + rows * (CHAR_SIZE + CHAR_GAP) - CHAR_GAP + BUBBLE_PADDING + 18; // 18 = hint

  const getSeiyuuId = (char: Character): number | undefined =>
    seiyuuGroups.find((g) =>
      g.characters.some((c) => c.anilistCharacterId === char.anilistCharacterId)
    )?.seiyuuId;

  const isHighlighted = (char: Character) =>
    hoveredSeiyuuId != null &&
    seiyuuGroups.some(
      (g) =>
        g.seiyuuId === hoveredSeiyuuId &&
        g.characters.some((c) => c.anilistCharacterId === char.anilistCharacterId)
    );

  // Click vs drag detection
  const onMouseDown = (e: React.MouseEvent) => {
    clickStart.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!clickStart.current) return;
    const d = Math.hypot(e.clientX - clickStart.current.x, e.clientY - clickStart.current.y);
    if (d < 6) onBubbleClick(anime.anilistId);
    clickStart.current = null;
  };
  const onTouchStartBubble = (e: React.TouchEvent) => {
    if (e.touches.length === 1)
      clickStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEndBubble = (e: React.TouchEvent) => {
    if (!clickStart.current || !e.changedTouches.length) return;
    const t = e.changedTouches[0];
    const d = Math.hypot(t.clientX - clickStart.current.x, t.clientY - clickStart.current.y);
    if (d < 10) onBubbleClick(anime.anilistId);
    clickStart.current = null;
  };

  return (
    <div
      className="anime-bubble"
      style={{
        left: anime.positionX,
        top: anime.positionY,
        width: BUBBLE_WIDTH,
        height: bubbleH,
        borderColor: color.border,
        boxShadow: `0 0 24px ${color.glow}, 0 0 48px ${color.glow}`,
        overflow: "visible",
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStartBubble}
      onTouchEnd={onTouchEndBubble}
    >
      {/* ── Header (drag handle) ── */}
      <div
        className="bubble-header"
        style={{ borderBottomColor: `${color.border}40` }}
        onMouseDown={(e) => {
          e.stopPropagation();
          clickStart.current = null;
          onDragStart(anime.anilistId, e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          clickStart.current = null;
          onDragStart(anime.anilistId, e);
        }}
      >
        {anime.coverImage && (
          <img className="bubble-cover" src={anime.coverImage} alt={anime.title} />
        )}
        <span className="bubble-title">{anime.title}</span>
        <span className="bubble-count" style={{ color: color.border }}>
          {characters.length} VA
        </span>
      </div>

      {/* ── Characters — positioned absolute within the FULL bubble ── */}
      {characters.length === 0 ? (
        <div className="bubble-no-links">
          No shared VA links yet
          <small>Add more anime</small>
        </div>
      ) : (
        characters.map((char, i) => {
          // charRelativePos y already accounts for BUBBLE_HEADER_H
          const pos = charRelativePos(i);
          const highlighted = isHighlighted(char);
          const dimmed = hoveredSeiyuuId != null && !highlighted;
          const seiyuuId = getSeiyuuId(char);

          return (
            <div
              key={char.anilistCharacterId}
              className={`char-node${highlighted ? " highlighted" : ""}${dimmed ? " dimmed" : ""}`}
              style={{
                // Position relative to the bubble root (not bubble-chars)
                position: "absolute",
                left: pos.x - CHAR_SIZE / 2,
                top: pos.y - CHAR_SIZE / 2,
                width: CHAR_SIZE,
                height: CHAR_SIZE,
                borderColor: highlighted ? color.border : "rgba(255,255,255,0.15)",
                boxShadow: highlighted ? `0 0 14px ${color.border}, 0 0 4px ${color.border}` : "none",
                zIndex: highlighted ? 30 : 20,
              }}
              onMouseEnter={() => seiyuuId && setHoveredSeiyuu(seiyuuId)}
              onMouseLeave={() => setHoveredSeiyuu(null)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {char.characterImage ? (
                <img
                  src={char.characterImage}
                  alt={char.characterName}
                  className="char-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="char-letter" style={{ background: color.border }}>
                  {char.characterName[0]}
                </div>
              )}
              <div className="char-tooltip">
                <strong>{char.characterName}</strong>
                <span>CV: {char.seiyuuName || "—"}</span>
              </div>
            </div>
          );
        })
      )}

      <div className="bubble-click-hint">tap for cast list</div>
    </div>
  );
}
