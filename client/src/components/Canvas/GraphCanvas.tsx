import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { Transform, AnimeEntry, Character } from "../../types";
import { useGraphStore, charOrbitPos, ANIME_RADIUS, CHAR_RADIUS } from "../../stores/graphStore";
import { useUiStore } from "../../stores/uiStore";
import AnimeNode, { getAnimeColor } from "./AnimeNode";
import AnimeDetailPanel from "./AnimeDetailPanel";
import "./GraphCanvas.css";

const MIN_SCALE = 0.15;
const MAX_SCALE = 2.5;

function EmptyState() {
  const { toggleSearch } = useUiStore();
  return (
    <div className="canvas-empty">
      <div className="canvas-empty-icon">◇</div>
      <h2>Your graph is empty</h2>
      <p>Search for an anime to start building your voice actor connection graph.</p>
      <button className="btn-primary" onClick={toggleSearch}>+ Add Anime</button>
    </div>
  );
}

function CharNode({
  char, absX, absY, colorBorder, highlighted, dimmed, pinned,
  onHoverIn, onHoverOut, onClick,
}: {
  char: Character; absX: number; absY: number;
  colorBorder: string;
  highlighted: boolean; dimmed: boolean; pinned: boolean;
  onHoverIn: () => void; onHoverOut: () => void; onClick: () => void;
}) {
  const D = CHAR_RADIUS * 2;
  return (
    <div
      className={[
        "char-orbit-node",
        highlighted ? "highlighted" : "",
        dimmed ? "dimmed" : "",
        pinned ? "pinned" : "",
      ].filter(Boolean).join(" ")}
      style={{
        position: "absolute",
        left: absX - CHAR_RADIUS,
        top: absY - CHAR_RADIUS,
        width: D, height: D,
        borderColor: highlighted || pinned ? colorBorder : "rgba(255,255,255,0.18)",
        boxShadow: pinned
          ? `0 0 18px ${colorBorder}, 0 0 6px ${colorBorder}, 0 0 36px ${colorBorder}55`
          : highlighted
          ? `0 0 14px ${colorBorder}, 0 0 4px ${colorBorder}`
          : "none",
        cursor: "pointer",
      }}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${char.characterName}\nCV: ${char.seiyuuName || "—"}`}
    >
      {char.characterImage ? (
        <img src={char.characterImage} alt={char.characterName} className="char-img"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="char-letter" style={{ background: colorBorder }}>{char.characterName[0]}</div>
      )}
      <div className="char-tooltip">
        <strong>{char.characterName}</strong>
        <span>CV: {char.seiyuuName || "—"}</span>
      </div>
    </div>
  );
}

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const [detailAnimeId, setDetailAnimeId] = useState<number | null>(null);
  const [pinnedCharId, setPinnedCharId] = useState<number | null>(null);

  const dragState = useRef<{
    isPanning: boolean; isDraggingBubble: boolean; anilistId: number | null;
    startMouse: { x: number; y: number }; startPos: { x: number; y: number };
  }>({ isPanning: false, isDraggingBubble: false, anilistId: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } });

  const pinchState = useRef<{ active: boolean; startDist: number; startScale: number; midX: number; midY: number }>({
    active: false, startDist: 0, startScale: 1, midX: 0, midY: 0,
  });

  const { anime, characters, connectedCharIds, isLoading } = useGraphStore();
  const { updatePosition, persistPosition } = useGraphStore();
  const { hoveredAnimeId, setHoveredAnime, hoveredCharId, setHoveredChar } = useUiStore();

  // Pinned char overrides hovered char for VA line display
  const activeCharId = pinnedCharId ?? hoveredCharId;

  const animeColorMap = useMemo(() => {
    const m = new Map<number, number>();
    anime.forEach((a, i) => m.set(a.anilistId, i));
    return m;
  }, [anime.map((a) => a.anilistId).join(",")]);

  const charsByAnime = useMemo(() => {
    const m = new Map<number, Character[]>();
    for (const char of characters) {
      if (!connectedCharIds.has(char.anilistCharacterId)) continue;
      const list = m.get(char.anilistAnimeId) ?? [];
      list.push(char);
      m.set(char.anilistAnimeId, list);
    }
    return m;
  }, [characters, connectedCharIds]);

  const charAbsPos = useMemo(() => {
    const m = new Map<number, { x: number; y: number }>();
    for (const a of anime) {
      const chars = charsByAnime.get(a.anilistId) ?? [];
      chars.forEach((char, i) => {
        const rel = charOrbitPos(i, chars.length);
        m.set(char.anilistCharacterId, { x: a.positionX + rel.x, y: a.positionY + rel.y });
      });
    }
    return m;
  }, [anime, charsByAnime]);

  const activeChar = activeCharId != null ? characters.find((c) => c.anilistCharacterId === activeCharId) : null;

  const vaTargets = useMemo(() => {
    if (!activeChar?.seiyuuId) return [];
    return characters.filter(
      (c) => c.seiyuuId === activeChar.seiyuuId &&
             c.anilistCharacterId !== activeCharId &&
             charAbsPos.has(c.anilistCharacterId)
    );
  }, [activeChar, activeCharId, characters, charAbsPos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = { isPanning: true, isDraggingBubble: false, anilistId: null,
      startMouse: { x: e.clientX, y: e.clientY }, startPos: { x: transformRef.current.x, y: transformRef.current.y } };
  }, []);

  const handleCanvasClick = useCallback(() => {
    setPinnedCharId(null);
  }, []);

  const handleBubbleDragStart = useCallback((anilistId: number, e: React.MouseEvent | React.TouchEvent) => {
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const a = useGraphStore.getState().anime.find((a) => a.anilistId === anilistId);
    if (!a) return;
    dragState.current = { isPanning: false, isDraggingBubble: true, anilistId,
      startMouse: { x: cx, y: cy }, startPos: { x: a.positionX, y: a.positionY } };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const ds = dragState.current;
    if (!ds.isPanning && !ds.isDraggingBubble) return;
    const dx = e.clientX - ds.startMouse.x;
    const dy = e.clientY - ds.startMouse.y;
    if (ds.isPanning) {
      setTransform((t) => ({ ...t, x: ds.startPos.x + dx, y: ds.startPos.y + dy }));
    } else if (ds.isDraggingBubble && ds.anilistId !== null) {
      updatePosition(ds.anilistId, ds.startPos.x + dx / transformRef.current.scale, ds.startPos.y + dy / transformRef.current.scale);
    }
  }, [updatePosition]);

  const handleMouseUp = useCallback(() => {
    const ds = dragState.current;
    if (ds.isDraggingBubble && ds.anilistId !== null) {
      const a = useGraphStore.getState().anime.find((a) => a.anilistId === ds.anilistId);
      if (a) persistPosition(ds.anilistId, a.positionX, a.positionY);
    }
    dragState.current = { ...ds, isPanning: false, isDraggingBubble: false };
  }, [persistPosition]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setTransform((t) => {
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale + delta * t.scale));
      const ratio = newScale / t.scale;
      return { scale: newScale, x: mx - ratio * (mx - t.x), y: my - ratio * (my - t.y) };
    });
  }, []);

  const getTouchDist = (touches: TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      dragState.current.isPanning = false;
      dragState.current.isDraggingBubble = false;
      const rect = containerRef.current!.getBoundingClientRect();
      pinchState.current = {
        active: true, startDist: getTouchDist(e.touches), startScale: transformRef.current.scale,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
    } else if (e.touches.length === 1 && !dragState.current.isDraggingBubble) {
      dragState.current = { isPanning: true, isDraggingBubble: false, anilistId: null,
        startMouse: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        startPos: { x: transformRef.current.x, y: transformRef.current.y } };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchState.current.active) {
      const p = pinchState.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.startScale * (getTouchDist(e.touches) / p.startDist)));
      setTransform((t) => {
        const ratio = newScale / t.scale;
        return { scale: newScale, x: p.midX - ratio * (p.midX - t.x), y: p.midY - ratio * (p.midY - t.y) };
      });
    } else if (e.touches.length === 1) {
      const ds = dragState.current;
      const dx = e.touches[0].clientX - ds.startMouse.x, dy = e.touches[0].clientY - ds.startMouse.y;
      if (ds.isPanning) setTransform((t) => ({ ...t, x: ds.startPos.x + dx, y: ds.startPos.y + dy }));
      else if (ds.isDraggingBubble && ds.anilistId)
        updatePosition(ds.anilistId, ds.startPos.x + dx / transformRef.current.scale, ds.startPos.y + dy / transformRef.current.scale);
    }
  }, [updatePosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) pinchState.current.active = false;
    if (e.touches.length === 0) {
      const ds = dragState.current;
      if (ds.isDraggingBubble && ds.anilistId) {
        const a = useGraphStore.getState().anime.find((a) => a.anilistId === ds.anilistId);
        if (a) persistPosition(ds.anilistId, a.positionX, a.positionY);
      }
      dragState.current = { ...ds, isPanning: false, isDraggingBubble: false };
    }
  }, [persistPosition]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    const el = containerRef.current;
    if (el) {
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", handleTouchEnd, { passive: false });
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (el) {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const detailAnime = detailAnimeId !== null ? anime.find((a) => a.anilistId === detailAnimeId) ?? null : null;

  if (isLoading) return <div className="canvas-loading"><div className="spinner" /><span>Loading graph…</span></div>;
  if (anime.length === 0) return <EmptyState />;

  const W = 5000, H = 4000;
  const fromPos = activeCharId != null ? charAbsPos.get(activeCharId) : null;

  return (
    <>
      <div ref={containerRef} className="graph-canvas-container"
        onMouseDown={handleMouseDown} onWheel={handleWheel} onClick={handleCanvasClick}>
        <div className="canvas-world"
          style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, width: W, height: H }}>

          <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}>
            <defs>
              <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Orbit arms */}
            {anime.map((a) => {
              const color = getAnimeColor(animeColorMap.get(a.anilistId) ?? 0);
              return (charsByAnime.get(a.anilistId) ?? []).map((char) => {
                const pos = charAbsPos.get(char.anilistCharacterId);
                if (!pos) return null;
                const isAnimeHovered = hoveredAnimeId === a.anilistId;
                return (
                  <line key={`arm-${char.anilistCharacterId}`}
                    x1={a.positionX} y1={a.positionY} x2={pos.x} y2={pos.y}
                    stroke={color.border}
                    strokeWidth={isAnimeHovered ? 1.2 : 0.6}
                    strokeOpacity={isAnimeHovered ? 0.4 : 0.12}
                    strokeDasharray="3 6"
                    style={{ transition: "all 0.2s" }}
                  />
                );
              });
            })}

            {/* VA arcs (hover or pinned) */}
            {activeCharId != null && fromPos && vaTargets.map((char) => {
              const toPos = charAbsPos.get(char.anilistCharacterId)!;
              const cpx = (fromPos.x + toPos.x) / 2;
              const dist = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
              const cpy = (fromPos.y + toPos.y) / 2 - Math.max(40, dist * 0.2);
              const midX = 0.25 * fromPos.x + 0.5 * cpx + 0.25 * toPos.x;
              const midY = 0.25 * fromPos.y + 0.5 * cpy + 0.25 * toPos.y;

              return (
                <g key={`va-${char.anilistCharacterId}`}>
                  <path
                    d={`M ${fromPos.x} ${fromPos.y} Q ${cpx} ${cpy} ${toPos.x} ${toPos.y}`}
                    fill="none"
                    stroke={pinnedCharId != null ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)"}
                    strokeWidth={pinnedCharId != null ? 2.5 : 2}
                    filter="url(#edge-glow)"
                  />
                  <rect x={midX - 58} y={midY - 10} width={116} height={18} rx={9}
                    fill="rgba(3,10,28,0.92)" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                  <text x={midX} y={midY + 3} textAnchor="middle"
                    fill="rgba(255,255,255,0.9)" fontSize={10} fontWeight="700"
                    style={{ pointerEvents: "none" }}>
                    {(activeChar?.seiyuuName ?? "Unknown VA").slice(0, 22)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Anime center nodes */}
          {anime.map((a) => (
            <AnimeNode key={a.anilistId} anime={a}
              colorIndex={animeColorMap.get(a.anilistId) ?? 0}
              onDragStart={handleBubbleDragStart}
              onNodeClick={(id) => setDetailAnimeId(id)}
              onHoverIn={(id) => setHoveredAnime(id)}
              onHoverOut={() => setHoveredAnime(null)} />
          ))}

          {/* Character orbit nodes */}
          {anime.map((a) => {
            const ci = animeColorMap.get(a.anilistId) ?? 0;
            const color = getAnimeColor(ci);
            const chars = charsByAnime.get(a.anilistId) ?? [];
            return chars.map((char) => {
              const pos = charAbsPos.get(char.anilistCharacterId);
              if (!pos) return null;
              const isPinned = pinnedCharId === char.anilistCharacterId;
              const isVaTarget = activeChar?.seiyuuId != null &&
                char.seiyuuId === activeChar.seiyuuId &&
                char.anilistCharacterId !== activeCharId;
              const highlighted = activeCharId != null &&
                (char.anilistCharacterId === activeCharId || isVaTarget);
              const dimmed = activeCharId != null && !highlighted;
              return (
                <CharNode key={char.anilistCharacterId} char={char}
                  absX={pos.x} absY={pos.y}
                  colorBorder={color.border}
                  highlighted={highlighted} dimmed={dimmed} pinned={isPinned}
                  onHoverIn={() => setHoveredChar(char.anilistCharacterId)}
                  onHoverOut={() => { if (pinnedCharId == null) setHoveredChar(null); }}
                  onClick={() => {
                    if (connectedCharIds.has(char.anilistCharacterId)) {
                      setPinnedCharId((prev) =>
                        prev === char.anilistCharacterId ? null : char.anilistCharacterId
                      );
                    }
                  }}
                />
              );
            });
          })}

          {/* Ghost bubbles — duplicates at arc midpoints when a char is pinned */}
          {pinnedCharId != null && fromPos && vaTargets.map((char) => {
            const toPos = charAbsPos.get(char.anilistCharacterId)!;
            const cpx = (fromPos.x + toPos.x) / 2;
            const dist = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
            const cpy = (fromPos.y + toPos.y) / 2 - Math.max(40, dist * 0.2);
            const midX = 0.25 * fromPos.x + 0.5 * cpx + 0.25 * toPos.x;
            const midY = 0.25 * fromPos.y + 0.5 * cpy + 0.25 * toPos.y;
            const D = CHAR_RADIUS * 2;
            return (
              <div key={`ghost-${char.anilistCharacterId}`}
                className="char-ghost-bubble"
                style={{
                  position: "absolute",
                  left: midX - CHAR_RADIUS,
                  top: midY - CHAR_RADIUS,
                  width: D, height: D,
                }}>
                {char.characterImage ? (
                  <img src={char.characterImage} alt={char.characterName} className="char-img"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="char-letter">{char.characterName[0]}</div>
                )}
                <div className="char-ghost-label">{char.characterName}</div>
              </div>
            );
          })}
        </div>

        <div className="canvas-hint canvas-hint-desktop">Scroll to zoom · Drag to pan · Hover character → VA links · Click character → pin</div>
        <div className="canvas-hint canvas-hint-mobile">Pinch to zoom · Drag to pan · Tap anime to see cast</div>
      </div>

      {detailAnime && <AnimeDetailPanel anime={detailAnime} onClose={() => setDetailAnimeId(null)} />}
    </>
  );
}
