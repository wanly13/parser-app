import { useMemo } from 'react'
import styles from './Panels.module.css'

const NODE_R   = 16
const H_GAP    = 10
const V_GAP    = 60
const TERMINALS = new Set(['+', '-', '*', '/', '(', ')', 'id', '$', 'ϵ', 'λ'])

function isTerminal(label) {
  return TERMINALS.has(label) || /^[a-z$ϵλ]$/.test(label)
}

/** Compute (x, y, width) for every node via post-order */
function layout(node, depth = 0) {
  if (!node.children?.length) {
    node._w = NODE_R * 2 + H_GAP
    node._x = 0
    node._y = depth * V_GAP + NODE_R + 20
    return node
  }
  node.children.forEach(c => layout(c, depth + 1))
  const totalW = node.children.reduce((s, c) => s + c._w, 0)
  node._w = Math.max(totalW, NODE_R * 2 + H_GAP)
  node._y = depth * V_GAP + NODE_R + 20

  let cx = 0
  node.children.forEach(c => {
    c._x += cx
    cx += c._w
  })
  node._x = totalW / 2
  return node
}

function shiftX(node, dx) {
  node._x += dx
  node.children?.forEach(c => shiftX(c, dx))
}

function collectNodes(node, acc = []) {
  acc.push(node)
  node.children?.forEach(c => collectNodes(c, acc))
  return acc
}

function collectEdges(node, acc = []) {
  node.children?.forEach(c => {
    acc.push({ x1: node._x, y1: node._y, x2: c._x, y2: c._y })
    collectEdges(c, acc)
  })
  return acc
}

export default function TreePanel({ result }) {
  if (!result?.tree) return <div className={styles.placeholder}>Ejecuta el análisis para ver el árbol.</div>

  const { root, width, height } = useMemo(() => {
    const tree = JSON.parse(JSON.stringify(result.tree))
    layout(tree)
    shiftX(tree, 20)

    const nodes = collectNodes(tree)
    const maxX = Math.max(...nodes.map(n => n._x)) + NODE_R + 20
    const maxY = Math.max(...nodes.map(n => n._y)) + NODE_R + 20

    return { root: tree, width: Math.max(maxX, 300), height: maxY }
  }, [result.tree])

  const nodes = collectNodes(root)
  const edges = collectEdges(root)

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.sectionTitle}>Árbol de derivación</div>
      <div className={styles.treeWrap}>
        <svg width={width} height={height} style={{ display: 'block' }}>
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(124,108,255,0.35)"
              strokeWidth={1}
            />
          ))}
          {nodes.map((n, i) => {
            const term = isTerminal(n.label)
            const epsilon = n.label === 'ϵ' || n.label === 'λ'
            const fill  = epsilon ? 'rgba(251,146,60,0.15)'
                        : term   ? 'rgba(93,232,168,0.12)'
                        :          'rgba(124,108,255,0.18)'
            const stroke = epsilon ? '#fb923c'
                         : term   ? 'var(--accent2)'
                         :          'var(--accent)'
            const textColor = epsilon ? '#fb923c'
                            : term   ? 'var(--accent2)'
                            :          '#c4b5fd'
            return (
              <g key={i}>
                <circle
                  cx={n._x} cy={n._y} r={NODE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={term ? 1 : 1.5}
                />
                <text
                  x={n._x} y={n._y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize={11}
                  fontWeight={term ? 400 : 700}
                  fill={textColor}
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className={styles.treeLegend}>
        <span style={{color:'#c4b5fd'}}>● No terminal</span>
        <span style={{color:'var(--accent2)'}}>● Terminal</span>
        <span style={{color:'#fb923c'}}>● ϵ / λ</span>
      </div>
    </div>
  )
}
