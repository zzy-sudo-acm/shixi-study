import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'

const MAX_NODES = 26
const HOLD_MS = 7000
const TURN_MS = 26000
const BAND_LAT = [-40, -16, 10, 34, 54]

type LiveNode = { title: string; depth: number; lat: number; lon: number }
type Show = { name: string; color: string; nodes: LiveNode[]; edges: [number, number][] }

function buildShow(name: string, color: string, all: KnowledgeNode[]): Show {
  const byId = new Map(all.map((node) => [node.id, node]))
  const children = new Map<string, KnowledgeNode[]>()
  const roots: KnowledgeNode[] = []
  for (const node of all) {
    if (node.parentId && byId.has(node.parentId)) {
      const siblings = children.get(node.parentId) ?? []
      siblings.push(node)
      children.set(node.parentId, siblings)
    } else roots.push(node)
  }
  const nodes: LiveNode[] = []
  const edges: [number, number][] = []
  function place(node: KnowledgeNode, depth: number, lonStart: number, lonSpan: number, parent: number) {
    if (nodes.length >= MAX_NODES) return
    const index = nodes.length
    nodes.push({
      title: node.title,
      depth,
      lat: (BAND_LAT[Math.min(depth, BAND_LAT.length - 1)] * Math.PI) / 180,
      lon: lonStart + lonSpan / 2,
    })
    if (parent >= 0) edges.push([parent, index])
    const kids = children.get(node.id) ?? []
    kids.forEach((kid, kidIndex) =>
      place(kid, depth + 1, lonStart + (lonSpan * kidIndex) / kids.length, lonSpan / kids.length, index),
    )
  }
  roots.forEach((root, index) =>
    place(root, 0, (2 * Math.PI * index) / roots.length, (2 * Math.PI) / roots.length, -1),
  )
  return { name, color, nodes, edges }
}

export function KnowledgeOrb({ data }: { data: Snapshot }) {
  const id = useId()
  const shows = useMemo(
    () =>
      data.spaces
        .map((space) =>
          buildShow(
            space.name,
            space.color ?? '#456785',
            data.knowledgeNodes.filter((node) => node.spaceId === space.id),
          ),
        )
        .filter((show) => show.nodes.length > 0),
    [data],
  )
  const [turn, setTurn] = useState(0)
  const hovering = useRef(false)
  const spread = useRef(0)
  const circleRefs = useRef<(SVGCircleElement | null)[]>([])
  const lineRefs = useRef<(SVGLineElement | null)[]>([])
  const labelRefs = useRef<(SVGTextElement | null)[]>([])
  const current = shows.length ? shows[turn % shows.length] : null

  useEffect(() => {
    if (shows.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      if (!hovering.current && !document.hidden) setTurn((value) => value + 1)
    }, HOLD_MS)
    return () => window.clearInterval(timer)
  }, [shows.length])

  useEffect(() => {
    if (!current) return
    const { nodes, edges } = current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0,
      angle = 0.6,
      last = performance.now()
    function render() {
      const s = spread.current
      const radius = 150 + 95 * s
      const squash = 0.86 - 0.36 * s
      const px: number[] = [],
        py: number[] = [],
        pz: number[] = []
      nodes.forEach((node, index) => {
        const around = node.lon + angle
        const lat = node.lat * (1 - 0.45 * s)
        const z = Math.cos(lat) * Math.sin(around)
        px[index] = 220 + radius * Math.cos(lat) * Math.cos(around)
        py[index] = 216 - radius * Math.sin(lat) * squash
        pz[index] = z
        const circle = circleRefs.current[index]
        if (circle) {
          circle.setAttribute('cx', px[index].toFixed(1))
          circle.setAttribute('cy', py[index].toFixed(1))
          circle.setAttribute(
            'r',
            ((node.depth === 0 ? 5.2 : 3.4) * (0.75 + 0.35 * ((z + 1) / 2) + 0.5 * s)).toFixed(2),
          )
          circle.setAttribute('opacity', z > 0 ? '0.95' : '0.22')
          circle.setAttribute('fill', node.depth === 0 ? current!.color : '#1d1d1d')
        }
        const label = labelRefs.current[index]
        if (label) {
          const show = node.depth === 0 ? z > 0.35 : s > 0.4 && z > 0.2
          label.setAttribute('x', px[index].toFixed(1))
          label.setAttribute('y', (py[index] - 11).toFixed(1))
          label.setAttribute('opacity', show ? '0.9' : '0')
        }
      })
      edges.forEach(([from, to], index) => {
        const line = lineRefs.current[index]
        if (!line) return
        line.setAttribute('x1', px[from].toFixed(1))
        line.setAttribute('y1', py[from].toFixed(1))
        line.setAttribute('x2', px[to].toFixed(1))
        line.setAttribute('y2', py[to].toFixed(1))
        line.setAttribute('opacity', Math.min(pz[from], pz[to]) > 0 ? (s > 0.5 ? '0.55' : '0.4') : '0.1')
      })
    }
    render()
    if (!reduced) {
      const tick = (time: number) => {
        const dt = time - last
        last = time
        if (!document.hidden) angle += (dt / TURN_MS) * 2 * Math.PI
        const target = hovering.current ? 1 : 0
        spread.current += (target - spread.current) * Math.min(1, dt / 170)
        render()
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(frame)
  }, [current])

  function enter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') hovering.current = true
  }
  function leave() {
    hovering.current = false
  }

  if (!current)
    return (
      <div className="knowledge-orb orb-empty" role="img" aria-label="等待知识树的球体">
        <svg viewBox="0 0 440 440" aria-hidden="true">
          <defs>
            <clipPath id={`${id}-clip`}>
              <circle cx="220" cy="220" r="194" />
            </clipPath>
          </defs>
          <circle className="orb-empty-body" cx="220" cy="220" r="194" />
          <g clipPath={`url(#${id}-clip)`}>
            <g className="orb-empty-mesh">
              <ellipse cx="220" cy="220" rx="214" ry="72" transform="rotate(-24 220 220)" />
              <ellipse cx="220" cy="220" rx="102" ry="214" transform="rotate(-24 220 220)" />
              <ellipse cx="220" cy="220" rx="166" ry="208" transform="rotate(24 220 220)" />
            </g>
          </g>
        </svg>
        <span className="orb-caption">从一个想法开始</span>
      </div>
    )
  return (
    <div
      className="knowledge-orb"
      role="img"
      onPointerEnter={enter}
      onPointerLeave={leave}
      aria-label={`知识球体，正在展出：${current.name}`}
    >
      <svg viewBox="0 0 440 440" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-surface`} cx="32%" cy="22%" r="85%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#f1f1ee" />
            <stop offset="1" stopColor="#d9d9d3" />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <circle cx="220" cy="220" r="194" />
          </clipPath>
        </defs>
        <circle className="orb-body" cx="220" cy="220" r="194" fill={`url(#${id}-surface)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <g className="orb-mesh">
            <ellipse cx="220" cy="220" rx="214" ry="72" transform="rotate(-24 220 220)" />
            <ellipse cx="220" cy="220" rx="102" ry="214" transform="rotate(-24 220 220)" />
            <ellipse cx="220" cy="220" rx="166" ry="208" transform="rotate(24 220 220)" />
          </g>
        </g>
        <g className="orb-live" key={current.name}>
          {current.edges.map(([from, to], index) => (
            <line
              key={`${from}-${to}`}
              ref={(el) => {
                lineRefs.current[index] = el
              }}
            />
          ))}
          {current.nodes.map((node, index) => (
            <circle
              key={index}
              ref={(el) => {
                circleRefs.current[index] = el
              }}
              className={node.depth === 0 ? 'orb-live-root' : undefined}
            />
          ))}
          {current.nodes.map((node, index) =>
            node.title ? (
              <text
                key={`label-${index}`}
                ref={(el) => {
                  labelRefs.current[index] = el
                }}
              >
                {node.title.length > 6 ? `${node.title.slice(0, 6)}…` : node.title}
              </text>
            ) : null,
          )}
        </g>
      </svg>
      <span className="orb-caption">正在展出：{current.name}</span>
    </div>
  )
}
