import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function KatexSpan({ tex, display = false }: { tex: string; display?: boolean }) {
  // Only KaTeX's untrusted, bounded output becomes HTML; the source text itself never becomes HTML.
  try {
    const html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 500,
      maxSize: 15,
      output: 'htmlAndMathml',
    })
    return (
      <span className={display ? 'math-block' : 'math-inline'} dangerouslySetInnerHTML={{ __html: html }} />
    )
  } catch {
    return (
      <span className="formula-fallback" title="公式格式有误，显示原文">
        {tex}
      </span>
    )
  }
}
