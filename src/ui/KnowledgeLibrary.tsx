import { lazy, Suspense, useMemo, useState, type CSSProperties } from 'react'
import type { KnowledgeNode, Snapshot } from '../core/model'
import { descendants } from '../core/workspace'
import { Empty, Icon, PageHead } from './shared'
import { Markdown } from './Markdown'

const KnowledgeGraph = lazy(() =>
  import('./KnowledgeGraph').then((module) => ({ default: module.KnowledgeGraph })),
)

function rootsOf(data: Snapshot) {
  const byId = new Map(data.knowledgeNodes.map((node) => [node.id, node]))
  return data.knowledgeNodes
    .filter((node) => !node.parentId || !byId.has(node.parentId))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function branchOf(data: Snapshot, root: KnowledgeNode) {
  const inside = descendants(root.id, data.knowledgeNodes, (node) => node.parentId)
  const nodes = data.knowledgeNodes.filter((node) => inside.has(node.id))
  return {
    ...data,
    knowledgeNodes: nodes,
    knowledgeRelations: data.knowledgeRelations.filter(
      (relation) => inside.has(relation.sourceNodeId) && inside.has(relation.targetNodeId),
    ),
  }
}

export function KnowledgeLibrary({ data, rootId }: { data: Snapshot; rootId: string }) {
  const roots = useMemo(() => rootsOf(data), [data])
  const root = roots.find((node) => node.id === rootId) ?? null
  const [selected, setSelected] = useState('')
  if (root) {
    const space = data.spaces.find((item) => item.id === root.spaceId)
    const branch = branchOf(data, root)
    const active = branch.knowledgeNodes.find((node) => node.id === selected) ?? null
    return (
      <div className="knowledge-library-detail">
        <a className="text-button space-back" href="#library">
          <Icon name="chevron" size={16} />
          返回知识库
        </a>
        <PageHead
          title={root.title}
          description={`${space?.name ?? '未知领域'} · 这棵树共 ${branch.knowledgeNodes.length} 个节点`}
          action={
            <a className="button primary" href={`#space/${root.spaceId}/tree?node=${root.id}`}>
              编辑这棵知识树
            </a>
          }
        />
        <section className="library-graph-card" aria-label="单棵知识树图谱">
          <Suspense fallback={<p role="status">正在打开知识图谱…</p>}>
            <KnowledgeGraph
              embedded
              data={branch}
              spaceId={root.spaceId}
              selected={selected}
              onSelect={setSelected}
              onAdd={() => {}}
            />
          </Suspense>
          {active ? (
            <article className="node-point" aria-label={`知识点 ${active.title}`}>
              <h3>{active.title}</h3>
              {active.note ? (
                <Markdown text={active.note} />
              ) : (
                <p className="muted">这个节点还没有知识点。进入编辑界面，在左侧写下自己的理解。</p>
              )}
            </article>
          ) : (
            <p className="library-graph-hint">点击节点，查看里面的知识点。</p>
          )}
        </section>
      </div>
    )
  }
  return (
    <>
      <PageHead title="知识库" description="每一张卡片，都是一棵知识树的根。" />
      {roots.length ? (
        <div className="library-root-grid">
          {roots.map((node, index) => {
            const space = data.spaces.find((item) => item.id === node.spaceId)
            const size = descendants(node.id, data.knowledgeNodes, (item) => item.parentId).size
            return (
              <a
                key={node.id}
                className="library-root-card"
                href={`#library/${node.id}`}
                style={{ '--stagger': Math.min(index, 8) } as CSSProperties}
                aria-label={`查看知识树 ${node.title}`}
              >
                <span className="library-root-space">
                  <i aria-hidden="true" style={{ background: space?.color ?? '#456785' }} />
                  {space?.name ?? '未知领域'}
                </span>
                <h2>{node.title}</h2>
                <span className="library-root-meta">
                  {size} 个节点{node.note ? ' · 有知识点' : ''}
                </span>
              </a>
            )
          })}
        </div>
      ) : (
        <Empty title="还没有知识树">
          <p>在领域里新建根节点，知识树会一张一张出现在这里。</p>
          <a className="button primary" href="#home">
            去学习空间建立
          </a>
        </Empty>
      )}
    </>
  )
}
