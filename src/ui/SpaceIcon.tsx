import { useId, useRef, useState, type CSSProperties } from 'react'
import { Icon, type IconName } from './shared'

const options: { name: IconName; label: string }[] = [
  { name: 'book', label: '书本' },
  { name: 'code', label: '代码' },
  { name: 'calculator', label: '计算器' },
  { name: 'globe', label: '地球' },
  { name: 'leaf', label: '植物' },
  { name: 'languages', label: '语言' },
  { name: 'lightbulb', label: '灵感' },
  { name: 'flask', label: '实验' },
  { name: 'music', label: '音乐' },
  { name: 'palette', label: '绘画' },
  { name: 'target', label: '目标' },
  { name: 'folder', label: '文件夹' },
]
const emojis = ['📐', '🌱', '🐱', '📚', '💻', '🌍', '🎨', '🎵', '🔬', '✨']
function preset(value?: string) {
  return value ? options.find((option) => value === `icon:${option.name}`) : options[0]
}

export function SpaceIcon({ value, size = 24 }: { value?: string; size?: number }) {
  const option = preset(value)
  return (
    <span className="space-icon-glyph" data-icon={option?.name ?? 'custom'}>
      {option ? <Icon name={option.name} size={size} /> : value}
    </span>
  )
}

export function SpaceIconPicker({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false),
    [custom, setCustom] = useState(Boolean(value && !preset(value)))
  const trigger = useRef<HTMLButtonElement>(null),
    panelId = useId(),
    customId = useId()
  const selected = preset(value)
  function choose(next: string) {
    onChange(next)
    setCustom(!preset(next))
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <fieldset
      className="icon-picker"
      style={{ '--icon-color': color } as CSSProperties}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(false)
          trigger.current?.focus()
        }
      }}
    >
      <legend>图标（可选）</legend>
      <div className="icon-picker-control">
        <span className="icon-preview" aria-hidden="true">
          <SpaceIcon value={value} size={28} />
        </span>
        <span className="icon-picker-current" aria-live="polite">
          {selected?.label ?? '自定义符号'}
        </span>
        <button
          ref={trigger}
          type="button"
          className="secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? '收起图标' : '选择图标'}
        </button>
      </div>
      {open ? (
        <div className="icon-choice-panel" id={panelId}>
          <div className="icon-choice-grid" role="group" aria-label="线条图标">
            {options.map((option) => (
              <button
                key={option.name}
                type="button"
                className="icon-choice"
                aria-label={`选择图标 ${option.label}`}
                aria-pressed={selected?.name === option.name}
                onClick={() => choose(`icon:${option.name}`)}
              >
                <Icon name={option.name} size={24} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-button icon-custom-trigger"
            aria-expanded={custom}
            aria-controls={customId}
            onClick={() => setCustom((current) => !current)}
          >
            {custom ? '收起自定义 emoji' : '自定义 emoji'}
          </button>
          {custom ? (
            <div className="icon-custom" id={customId}>
              <div className="emoji-choice-grid" role="group" aria-label="常用 emoji">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`选择 emoji ${emoji}`}
                    aria-pressed={value === emoji}
                    onClick={() => choose(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <label>
                其他 emoji 或符号
                <input
                  maxLength={16}
                  value={selected ? '' : value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="粘贴或输入你喜欢的符号"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  )
}
