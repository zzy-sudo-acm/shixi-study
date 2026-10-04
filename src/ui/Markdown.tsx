import { Fragment, Suspense, lazy, type ReactNode } from 'react'
import { ImageView } from './shared'

const KatexSpan = lazy(() => import('./KatexSpan'))

const INLINE_SOURCE =
  /!\[([^\]]*)\]\(img:([\w-]+)\)|(\$\$[^\n$]+?\$\$|(?<!\\)\$[^\n$]+?(?<!\\)\$)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/
    .source

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = new RegExp(INLINE_SOURCE, 'g')
  let last = 0,
    key = 0,
    match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index))
    if (match[2] !== undefined)
      out.push(<ImageView key={`${keyPrefix}-${key++}`} id={match[2]} label={match[1] || '知识点图片'} />)
    else if (match[3] !== undefined) {
      const display = match[3].startsWith('$$')
      const tex = match[3].slice(display ? 2 : 1, display ? -2 : -1)
      out.push(
        <Suspense key={`${keyPrefix}-${key++}`} fallback={<span className="formula-fallback">{tex}</span>}>
          <KatexSpan tex={tex} display={display} />
        </Suspense>,
      )
    } else if (match[5] !== undefined)
      out.push(
        <a key={`${keyPrefix}-${key++}`} href={match[5]} target="_blank" rel="noreferrer">
          {match[4]}
        </a>,
      )
    else if (match[6] !== undefined) out.push(<code key={`${keyPrefix}-${key++}`}>{match[6]}</code>)
    else if (match[7] !== undefined) out.push(<strong key={`${keyPrefix}-${key++}`}>{match[7]}</strong>)
    else if (match[8] !== undefined) out.push(<em key={`${keyPrefix}-${key++}`}>{match[8]}</em>)
    last = match.index + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const BLOCK_START = /^(```|#{1,3}\s|>\s?|[-*]\s+|\d+\.\s+)/

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let i = 0,
    key = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
      i++
      blocks.push(
        <pre key={key++}>
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      const Tag = ['h4', 'h5', 'h6'][heading[1].length - 1] as 'h4'
      blocks.push(<Tag key={key++}>{inline(heading[2], `h${key}`)}</Tag>)
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(
        <blockquote key={key++}>
          {buf.map((item, j) => (
            <p key={j}>{inline(item, `q${key}-${j}`)}</p>
          ))}
        </blockquote>,
      )
      continue
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line)
      const itemRe = ordered ? /^\d+\.\s+/ : /^[-*]\s+/
      const buf: string[] = []
      while (i < lines.length && itemRe.test(lines[i])) buf.push(lines[i++].replace(itemRe, ''))
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(
        <Tag key={key++}>
          {buf.map((item, j) => (
            <li key={j}>{inline(item, `l${key}-${j}`)}</li>
          ))}
        </Tag>,
      )
      continue
    }
    const buf: string[] = []
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) buf.push(lines[i++])
    blocks.push(
      <p key={key++}>
        {buf.map((item, j) => (
          <Fragment key={j}>
            {inline(item, `p${key}-${j}`)}
            {j < buf.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>,
    )
  }
  return <div className="markdown">{blocks}</div>
}
