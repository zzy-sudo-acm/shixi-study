import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function MathText({ text }: { text: string }) {
  // Only KaTeX's untrusted, bounded output becomes HTML; other text is escaped by React.
  const parts = text.split(/(\$\$[\s\S]+?\$\$|(?<!\\)\$[^\n$]+?(?<!\\)\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g)
  return (
    <div className="formula-text">
      {parts.map((part, i) => {
        const display = part.startsWith('$$') || part.startsWith('\\[')
        const inline = !display && (part.startsWith('$') || part.startsWith('\\('))
        if (!display && !inline) return <span key={i}>{part.replace(/\\\$/g, '$')}</span>
        const trim = display || part.startsWith('\\(') ? 2 : 1
        try {
          const html = katex.renderToString(part.slice(trim, -trim), {
            displayMode: display,
            throwOnError: true,
            trust: false,
            strict: 'ignore',
            maxExpand: 500,
            maxSize: 15,
            output: 'htmlAndMathml',
          })
          return (
            <span
              className={display ? 'math-block' : 'math-inline'}
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch {
          return (
            <span className="formula-fallback" key={i} title="公式格式有误，显示原文">
              {part}
            </span>
          )
        }
      })}
    </div>
  )
}
