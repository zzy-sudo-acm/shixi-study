import { useId, useRef, type PointerEvent } from 'react'

export function KnowledgeOrb({ onCreate, empty }: { onCreate: () => void; empty: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  const id = useId()
  function follow(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const box = event.currentTarget.getBoundingClientRect()
    ref.current?.style.setProperty('--orb-x', `${((event.clientX - box.left) / box.width - 0.5) * 20}px`)
    ref.current?.style.setProperty('--orb-y', `${((event.clientY - box.top) / box.height - 0.5) * 20}px`)
  }
  function reset() {
    ref.current?.style.setProperty('--orb-x', '0px')
    ref.current?.style.setProperty('--orb-y', '0px')
  }
  return (
    <button
      ref={ref}
      className="knowledge-orb"
      onClick={onCreate}
      onPointerMove={follow}
      onPointerLeave={reset}
      aria-label={empty ? '创建第一个学习领域' : '在学习空间新建领域'}
    >
      <svg viewBox="0 0 440 440" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-surface`} cx="32%" cy="22%" r="85%">
            <stop offset="0" stopColor="#343434" />
            <stop offset="0.55" stopColor="#151515" />
            <stop offset="1" stopColor="#050505" />
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
          <g className="orb-symbol">
            <path d="M139 273 208 133 299 250" />
            <circle cx="139" cy="273" r="19" />
            <circle cx="208" cy="133" r="24" />
            <circle cx="299" cy="250" r="19" />
          </g>
        </g>
      </svg>
      <span className="orb-create-mark" aria-hidden="true">
        +
      </span>
      <span className="orb-caption">从一个想法开始</span>
    </button>
  )
}
