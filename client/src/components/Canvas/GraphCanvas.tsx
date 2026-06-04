import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import type { Transform } from "../../types";
import { useGraphStore, charRelativePos } from "../../stores/graphStore";
import { useUiStore } from "../../stores/uiStore";
import AnimeBubble from "./AnimeBubble";
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

export default function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [tooltip, setTooltip] = useState<{ name: string | null; image: string | null; x: number; y: number } | null>(null);
  const [detailAnimeId, setDetailAnimeId] = useState<number | null>(null);

  const dragState = useRef<{
    isPanning: boolean;
    isDraggingBubble: boolean;
    anilistId: number | null;
    startMouse: { x: number; y: number };
    startPos: { x: number; y: number };
  }>({ isPanning: false, isDraggingBubble: false, anilistId: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } });

  // Pinch zoom state
  const pinchState = useRef<{ active: boolean; startDist: number; startScale: number; midX: number; midY: number }>({
    active: false, startDist: 0, startScale: 1, midX: 0, midY: 0,
  });

  const { anime, characters, edges, connectedCharIds, seiyuuGroups, isLoading } = useGraphStore();
  const { updatePosition, persistPosition } = useGraphStore();
  const { hoveredSeiyuuId } = useUiStore();

  const animeColorMap = useMemo(() => {
    const m = new Map<number, number>();
    anime.forEach((a, i) => m.set(a.anilistId, i));
    return m;
  }, [anime.map((a) => a.anilistId).join(",")]);

  const charsByAnime = useMemo(() => {
    const m = new Map<number, typeof characters>();
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
        const rel = charRelativePos(i);
        m.set(char.anilistCharacterId, { x: a.positionX + rel.x, y: a.positionY + rel.y });
      });
    }
    return m;
  }, [anime, charsByAnime]);

  // ── Mouse events ─────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragState.current = {
      isPanning: true, isDraggingBubble: false, anilistId: null,
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { x: transform.x, y: transform.y },
    };
  }, [transform.x, transform.y]);

  const handleBubbleDragStart = useCallback((anilistId: number, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const a = useGraphStore.getState().anime.find((a) => a.anilistId === anilistId);
    if (!a) return;
    dragState.current = {
      isPanning: false, isDraggingBubble: true, anilistId,
      startMouse: { x: clientX, y: clientY },
      startPos: { x: a.positionX, y: a.positionY },
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const ds = dragState.current;
    if (!ds.isPanning && !ds.isDraggingBubble) return;
    const dx = e.clientX - ds.startMouse.x;
    const dy = e.clientY - ds.startMouse.y;
    if (ds.isPanning) {
      setTransform((t) => ({ ...t, x: ds.startPos.x + dx, y: ds.startPos.y + dy }));
    } else if (ds.isDraggingBubble && ds.anilistId !== null) {
      updatePosition(ds.anilistId, ds.startPos.x + dx / transform.scale, ds.startPos.y + dy / transform.scale);
    }
  }, [transform.scale, updatePosition]);

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
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform((t) => {
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale + delta * t.scale));
      const ratio = newScale / t.scale;
      return { scale: newScale, x: mx - ratio * (mx - t.x), y: my - ratio * (my - t.y) };
    });
  }, []);

  // ── Touch events ─────────────────────────────────────────────────────────

  const getTouchDist = (touches: TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start — cancel any drag
      dragState.current.isPanning = false;
      dragState.current.isDraggingBubble = false;
      const rect = containerRef.current!.getBoundingClientRect();
      pinchState.current = {
        active: true,
        startDist: getTouchDist(e.touches),
        startScale: transform.scale,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
      };
    } else if (e.touches.length === 1 && !dragState.current.isDraggingBubble) {
      // Single touch = pan (if not on a bubble header)
      dragState.current = {
        isPanning: true, isDraggingBubble: false, anilistId: null,
        startMouse: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        startPos: { x: transform.x, y: transform.y },
      };
    }
  }, [transform.scale, transform.x, transform.y]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchState.current.active) {
      const p = pinchState.current;
      const newDist = getTouchDist(e.touches);
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.startScale * (newDist / p.startDist)));
      setTransform((t) => {
        const ratio = newScale / t.scale;
        return { scale: newScale, x: p.midX - ratio * (p.midX - t.x), y: p.midY - ratio * (p.midY - t.y) };
      });
    } else if (e.touches.length === 1) {
      const ds = dragState.current;
      const dx = e.touches[0].clientX - ds.startMouse.x;
      const dy = e.touches[0].clientY - ds.startMouse.y;
      if (ds.isPanning) {
        setTransform((t) => ({ ...t, x: ds.startPos.x + dx, y: ds.startPos.y + dy }));
      } else if (ds.isDraggingBubble && ds.anilistId !== null) {
        updatePosition(ds.anilistId, ds.startPos.x + dx / transform.scale, ds.startPos.y + dy / transform.scale);
      }
    }
  }, [transform.scale, updatePosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) pinchState.current.active = false;
    if (e.touches.length === 0) {
      const ds = dragState.current;
      if (ds.isDraggingBubble && ds.anilistId !== null) {
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

  if (isLoading) return (
    <div className="canvas-loading"><div className="spinner" /><span>Loading graph…</span></div>
  );

  if (anime.length === 0) return <EmptyState />;

  const worldW = 4000;
  const worldH = 3000;

  return (
    <>
      <div
        ref={containerRef}
        className="graph-canvas-container"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div
          className="canvas-world"
          style={{ transform: `translate(${transform.x}px,${transform.y}px) scale(${transform.scale})`, width: worldW, height: worldH }}
        >
          {/* SVG edges */}
          <svg className="edges-svg" width={worldW} height={worldH}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
          >
            <defs>
              <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {edges.map((edge) => {
              const from = charAbsPos.get(edge.fromChar.anilistCharacterId);
              const to = charAbsPos.get(edge.toChar.anilistCharacterId);
              if (!from || !to) return null;

              // Bezier control point — arch upward
              const cpx = (from.x + to.x) / 2;
              const cpy = Math.min(from.y, to.y) - 90;

              // Bezier midpoint at t=0.5 (where VA avatar will sit)
              const midX = 0.25 * from.x + 0.5 * cpx + 0.25 * to.x;
              const midY = 0.25 * from.y + 0.5 * cpy + 0.25 * to.y;

              const hovered = hoveredSeiyuuId != null &&
                seiyuuGroups.find((g) =>
                  g.characters.some((c) => c.anilistCharacterId === edge.fromChar.anilistCharacterId)
                )?.seiyuuId === hoveredSeiyuuId;

              const VA_R = 20; // VA avatar radius
              const clipId = `clip-${edge.id.replace(/[^a-z0-9]/gi, "")}`;
              const edgeColor = hovered ? "#00ffcc" : "rgba(0,200,255,0.55)";

              return (
                <g key={edge.id} style={{ pointerEvents: "all" }}>
                  {/* Arc line */}
                  <path
                    d={`M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={hovered ? 2.5 : 1.5}
                    filter={hovered ? "url(#edge-glow)" : undefined}
                    style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current!.getBoundingClientRect();
                      setTooltip({ name: edge.seiyuuName, image: edge.seiyuuImage, x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />

                  {/* VA avatar circle at bezier midpoint */}
                  <defs>
                    <clipPath id={clipId}>
                      <circle cx={midX} cy={midY} r={VA_R} />
                    </clipPath>
                  </defs>

                  {/* Outer ring */}
                  <circle
                    cx={midX} cy={midY} r={VA_R + 3}
                    fill={hovered ? "rgba(0,255,204,0.15)" : "rgba(0,200,255,0.08)"}
                    stroke={edgeColor}
                    strokeWidth={hovered ? 2 : 1.5}
                    filter={hovered ? "url(#edge-glow)" : undefined}
                    style={{ transition: "all 0.2s" }}
                  />

                  {/* VA photo or letter */}
                  {edge.seiyuuImage ? (
                    <image
                      href={edge.seiyuuImage}
                      x={midX - VA_R} y={midY - VA_R}
                      width={VA_R * 2} height={VA_R * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                      style={{ pointerEvents: "none" }}
                    />
                  ) : (
                    <text x={midX} y={midY + 5} textAnchor="middle"
                      fill="#00c8ff" fontSize={15} fontWeight="700"
                      style={{ pointerEvents: "none" }}>
                      {edge.seiyuuName?.[0] ?? "?"}
                    </text>
                  )}

                  {/* VA name tag — always visible, below avatar */}
                  <rect
                    x={midX - 52} y={midY + VA_R + 5}
                    width={104} height={18} rx={9}
                    fill="rgba(3,10,28,0.88)"
                    stroke={edgeColor}
                    strokeWidth={hovered ? 1.5 : 1}
                  />
                  <text
                    x={midX} y={midY + VA_R + 18}
                    textAnchor="middle"
                    fill={hovered ? "#00ffcc" : "rgba(226,244,255,0.75)"}
                    fontSize={10} fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {(edge.seiyuuName ?? "Unknown VA").slice(0, 18)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Anime bubbles */}
          {anime.map((a) => (
            <AnimeBubble
              key={a.anilistId}
              anime={a}
              characters={charsByAnime.get(a.anilistId) ?? []}
              colorIndex={animeColorMap.get(a.anilistId) ?? 0}
              canvasScale={transform.scale}
              onDragStart={handleBubbleDragStart}
              onBubbleClick={(id) => setDetailAnimeId(id)}
            />
          ))}
        </div>

        {tooltip && <EdgeTooltip {...tooltip} />}
        <div className="canvas-hint">Scroll/pinch to zoom · Drag header to move · Tap bubble for characters</div>
      </div>

      {/* Detail panel */}
      {detailAnime && (
        <AnimeDetailPanel
          anime={detailAnime}
          onClose={() => setDetailAnimeId(null)}
        />
      )}
    </>
  );
}
