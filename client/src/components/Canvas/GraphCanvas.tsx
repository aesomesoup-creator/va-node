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
      <div className="canvas-empty-icon">⬡</div>
      <h2>Your graph is empty</h2>
      <p>Search for an anime to start building your voice actor connection graph.</p>
      <button className="btn-primary" onClick={toggleSearch}>+ Add Anime</button>
    </div>
  );
}

function EdgeTooltip({ name, image, x, y }: { name: string | null; image: string | null; x: number; y: number }) {
  return (
    <div className="edge-tooltip" style={{ left: x + 12, top: y - 44 }}>
      {image && <img src={image} alt={name ?? ""} className="edge-tooltip-img" />}
      <span>{name || "Unknown VA"}</span>
    </div>
  );
}

// Character node in orbit around its anime
function CharNode({
  char, absX, absY, colorBorder, colorGlow, highlighted, dimmed,
  onHoverIn, onHoverOut,
}: {
  char: Character; absX: number; absY: number;
  colorBorder: string; colorGlow: string;
  highlighted: boolean; dimmed: boolean;
  onHoverIn: () => void; onHoverOut: () => void;
}) {
  const D = CHAR_RADIUS * 2;
  return (
    <div
      className={`char-orbit-node${highlighted ? " highlighted" : ""}${dimmed ? " dimmed" : ""}`}
      style={{
        position: "absolute",
        left: absX - CHAR_RADIUS,
        top: absY - CHAR_RADIUS,
        width: D, height: D,
        borderColor: highlighted ? colorBorder : "rgba(255,255,255,0.18)",
        boxShadow: highlighted ? `0 0 14px ${colorBorder}, 0 0 4px ${colorBorder}` : "none",
      }}
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
      onMouseDown={(e) => e.stopPropagation()}
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
  // Ref keeps handlers stable — avoids re-registering touch listeners on every pan frame
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const [tooltip, setTooltip] = useState<{ name: string | null; image: string | null; x: number; y: number } | null>(null);
  const [detailAnimeId, setDetailAnimeId] = useState<number | null>(null);

  const dragState = useRef<{
    isPanning: boolean; isDraggingBubble: boolean; anilistId: number | null;
    startMouse: { x: number; y: number }; startPos: { x: number; y: number };
  }>({ isPanning: false, isDraggingBubble: false, anilistId: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } });

  const pinchState = useRef<{ active: boolean; startDist: number; startScale: number; midX: number; midY: number }>({
    active: false, startDist: 0, startScale: 1, midX: 0, midY: 0,
  });

  const { anime, characters, connectedCharIds, seiyuuGroups, isLoading } = useGraphStore();
  const { updatePosition, persistPosition } = useGraphStore();
  const { hoveredAnimeId, setHoveredAnime, hoveredCharId, setHoveredChar, hoveredSeiyuuId, setHoveredSeiyuu } = useUiStore();

  // Color map (stable)
  const animeColorMap = useMemo(() => {
    const m = new Map<number, number>();
    anime.forEach((a, i) => m.set(a.anilistId, i));
    return m;
  }, [anime.map((a) => a.anilistId).join(",")]);

  // Only characters with at least one cross-anime VA link
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

  // Absolute positions of each character in the orbit
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

  // ── Edge bundling: one bundle per anime pair ────────────────────────────
  interface EdgeBundle {
    key: string;
    animeId1: number; animeId2: number;
    count: number;
    vaNames: string[];
    vaImages: (string | null)[];
  }

  const bundledEdges = useMemo((): EdgeBundle[] => {
    const m = new Map<string, EdgeBundle>();
    for (const group of seiyuuGroups) {
      const animeIds = [...new Set(group.characters.map((c) => c.anilistAnimeId))];
      for (let i = 0; i < animeIds.length; i++) {
        for (let j = i + 1; j < animeIds.length; j++) {
          const key = [animeIds[i], animeIds[j]].sort().join("-");
          if (!m.has(key)) {
            m.set(key, { key, animeId1: animeIds[i], animeId2: animeIds[j], count: 0, vaNames: [], vaImages: [] });
          }
          const b = m.get(key)!;
          b.count++;
          if (group.seiyuuName) b.vaNames.push(group.seiyuuName);
          b.vaImages.push(group.seiyuuImage ?? null);
        }
      }
    }
    return Array.from(m.values());
  }, [seiyuuGroups]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = { isPanning: true, isDraggingBubble: false, anilistId: null,
      startMouse: { x: e.clientX, y: e.clientY }, startPos: { x: transformRef.current.x, y: transformRef.current.y } };
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

  // Touch events
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

  return (
    <>
      <div ref={containerRef} className="graph-canvas-container" onMouseDown={handleMouseDown} onWheel={handleWheel}>
        <div className="canvas-world"
          style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, width: W, height: H }}>

          {/* SVG layer: orbit arms + bundled edges */}
          <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}>
            <defs>
              <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
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
                    strokeWidth={isAnimeHovered ? 1.5 : 0.8}
                    strokeOpacity={isAnimeHovered ? 0.5 : 0.18}
                    strokeDasharray="3 5"
                    style={{ transition: "all 0.2s" }}
                  />
                );
              });
            })}

            {/* ── MODE A: Anime hover → bundled arcs ────────────────── */}
            {bundledEdges.map((bundle) => {
              const a1 = anime.find((a) => a.anilistId === bundle.animeId1);
              const a2 = anime.find((a) => a.anilistId === bundle.animeId2);
              if (!a1 || !a2) return null;

              const from = { x: a1.positionX, y: a1.positionY };
              const to   = { x: a2.positionX, y: a2.positionY };
              const cpx  = (from.x + to.x) / 2;
              const dist = Math.hypot(to.x - from.x, to.y - from.y);
              const cpy  = (from.y + to.y) / 2 - Math.max(60, dist * 0.25);
              const midX = 0.25 * from.x + 0.5 * cpx + 0.25 * to.x;
              const midY = 0.25 * from.y + 0.5 * cpy + 0.25 * to.y;
              const badgeR = 18 + Math.min(bundle.count - 1, 3) * 2;

              // Active only in anime-hover mode (not char-hover mode)
              const isActive = hoveredCharId == null && (
                hoveredAnimeId === bundle.animeId1 || hoveredAnimeId === bundle.animeId2
              );
              const anyHover = hoveredAnimeId != null || hoveredCharId != null;
              // In char-hover mode bundles nearly disappear; otherwise faint baseline
              const opacity = isActive ? 1 : hoveredCharId != null ? 0.03 : anyHover ? 0.04 : 0.18;
              const stroke  = isActive ? "#00ffcc" : "rgba(0,200,255,0.8)";
              const strokeW = isActive ? 2.5 + bundle.count * 0.4 : 1.2 + bundle.count * 0.25;

              return (
                <g key={bundle.key} opacity={opacity} style={{ transition: "opacity 0.2s", pointerEvents: isActive ? "all" : "none" }}>
                  <path d={`M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`}
                    fill="none" stroke={stroke} strokeWidth={strokeW}
                    filter={isActive ? "url(#edge-glow)" : undefined}
                    style={{ transition: "stroke 0.2s" }} />
                  <circle cx={midX} cy={midY} r={badgeR + 2}
                    fill={isActive ? "rgba(0,255,204,0.12)" : "rgba(0,10,28,0.75)"}
                    stroke={stroke} strokeWidth={isActive ? 2 : 1.5}
                    filter={isActive ? "url(#edge-glow)" : undefined} style={{ transition: "all 0.2s" }} />
                  <text x={midX} y={midY - 3} textAnchor="middle"
                    fill={isActive ? "#00ffcc" : "rgba(0,200,255,0.9)"}
                    fontSize={11} fontWeight="800" style={{ pointerEvents: "none" }}>×{bundle.count}</text>
                  <text x={midX} y={midY + 9} textAnchor="middle"
                    fill={isActive ? "rgba(0,255,204,0.7)" : "rgba(0,200,255,0.5)"}
                    fontSize={7.5} fontWeight="600" style={{ pointerEvents: "none" }}>VA</text>
                  {isActive && bundle.vaNames.length > 0 && (
                    <>
                      <rect x={midX - 70} y={midY + badgeR + 6} width={140}
                        height={Math.min(bundle.vaNames.length, 4) * 13 + 8} rx={8}
                        fill="rgba(3,10,28,0.92)" stroke="rgba(0,255,204,0.4)" strokeWidth={1} />
                      {bundle.vaNames.slice(0, 4).map((name, i) => (
                        <text key={i} x={midX} y={midY + badgeR + 18 + i * 13}
                          textAnchor="middle" fill="rgba(226,244,255,0.85)"
                          fontSize={9.5} fontWeight="500" style={{ pointerEvents: "none" }}>
                          {name.length > 20 ? name.slice(0, 19) + "…" : name}
                        </text>
                      ))}
                      {bundle.vaNames.length > 4 && (
                        <text x={midX} y={midY + badgeR + 18 + 4 * 13}
                          textAnchor="middle" fill="rgba(0,200,255,0.5)" fontSize={9}
                          style={{ pointerEvents: "none" }}>+{bundle.vaNames.length - 4} more</text>
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* ── MODE B: Character hover → direct char-to-char edges ── */}
            {(() => {
              if (hoveredCharId == null) return null;
              const hoveredChar = characters.find((c) => c.anilistCharacterId === hoveredCharId);
              if (!hoveredChar?.seiyuuId) return null;
              const fromPos = charAbsPos.get(hoveredCharId);
              if (!fromPos) return null;

              // All other connected characters that share the exact same VA
              const targets = characters.filter(
                (c) => c.seiyuuId === hoveredChar.seiyuuId &&
                       c.anilistCharacterId !== hoveredCharId &&
                       charAbsPos.has(c.anilistCharacterId)
              );

              return targets.map((char) => {
                const toPos = charAbsPos.get(char.anilistCharacterId)!;
                const cpx = (fromPos.x + toPos.x) / 2;
                const dist = Math.hypot(toPos.x - fromPos.x, toPos.y - fromPos.y);
                const cpy = (fromPos.y + toPos.y) / 2 - Math.max(40, dist * 0.2);
                const midX = 0.25 * fromPos.x + 0.5 * cpx + 0.25 * toPos.x;
                const midY = 0.25 * fromPos.y + 0.5 * cpy + 0.25 * toPos.y;

                return (
                  <g key={`direct-${char.anilistCharacterId}`}>
                    {/* Direct arc */}
                    <path
                      d={`M ${fromPos.x} ${fromPos.y} Q ${cpx} ${cpy} ${toPos.x} ${toPos.y}`}
                      fill="none" stroke="#00ffcc" strokeWidth={2.5}
                      filter="url(#edge-glow)"
                    />
                    {/* VA name label at midpoint */}
                    <rect x={midX - 58} y={midY - 10} width={116} height={18} rx={9}
                      fill="rgba(3,10,28,0.92)" stroke="rgba(0,255,204,0.5)" strokeWidth={1} />
                    <text x={midX} y={midY + 3} textAnchor="middle"
                      fill="#00ffcc" fontSize={10} fontWeight="700"
                      style={{ pointerEvents: "none" }}>
                      {(hoveredChar.seiyuuName ?? "Unknown VA").slice(0, 22)}
                    </text>
                  </g>
                );
              });
            })()}
          </svg>

          {/* Anime center nodes (draggable) */}
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
              // Highlighted = this char shares the VA of the hovered char
              const isHovered = hoveredCharId === char.anilistCharacterId;
              const highlighted = hoveredCharId != null && (
                isHovered || (
                  char.seiyuuId != null &&
                  characters.find((c) => c.anilistCharacterId === hoveredCharId)?.seiyuuId === char.seiyuuId
                )
              );
              const dimmed = hoveredCharId != null && !highlighted;
              return (
                <CharNode key={char.anilistCharacterId} char={char}
                  absX={pos.x} absY={pos.y}
                  colorBorder={color.border} colorGlow={color.glow}
                  highlighted={highlighted} dimmed={dimmed}
                  onHoverIn={() => setHoveredChar(char.anilistCharacterId)}
                  onHoverOut={() => setHoveredChar(null)} />
              );
            });
          })}
        </div>

        {tooltip && <EdgeTooltip {...tooltip} />}
        <div className="canvas-hint canvas-hint-desktop">Scroll/pinch to zoom · Drag anime to move · Hover edge to highlight VA · Click anime for cast</div>
        <div className="canvas-hint canvas-hint-mobile">Pinch to zoom · Drag to pan · Tap anime to see cast</div>
      </div>

      {detailAnime && <AnimeDetailPanel anime={detailAnime} onClose={() => setDetailAnimeId(null)} />}
    </>
  );
}
