import { useMemo } from 'react'
import styles from './Panels.module.css'

const NODE_R   = 16
const H_GAP    = 40  // Espacio mínimo libre garantizado entre burbujas vecinas
const V_GAP    = 60  // Distancia vertical fija entre niveles
const TERMINALS = new Set(['+', '-', '*', '/', '(', ')', 'id', '$', 'ϵ', 'λ', '✗'])

function isTerminal(label) {
  return TERMINALS.has(label) || /^[a-z$ϵλ✗]$/.test(label)
}

/**
 * Motor de Layout Jerárquico Avanzado (Basado en Walker / Buchheim & Jünger)
 * Soluciona colisiones en cualquier nivel de profundidad calculando contornos dinámicos.
 */
function perfectTreeLayout(root) {
  function setup(node, depth = 0) {
    if (!node) return;
    node._y = depth * V_GAP + NODE_R + 25;
    node._x = 0;
    node._mod = 0; 
    node.children?.forEach(c => setup(c, depth + 1));
  }

  function firstWalk(node, depth = 0) {
    if (!node.children || node.children.length === 0) {
      node._x = 0;
      return;
    }

    node.children.forEach(c => firstWalk(c, depth + 1));

    let currentLeftX = 0;
    node.children.forEach((child, i) => {
      if (i > 0) {
        currentLeftX += NODE_R * 2 + H_GAP;
      }
      child._x = currentLeftX;
    });

    for (let i = 0; i < node.children.length - 1; i++) {
      const leftChild = node.children[i];
      for (let j = i + 1; j < node.children.length; j++) {
        const rightChild = node.children[j];
        const overlap = calculateMaxOverlap(leftChild, rightChild);
        if (overlap > 0) {
          rightChild._x += overlap;
          rightChild._mod += overlap;
        }
      }
    }

    const firstChildX = node.children[0]._x;
    const lastChildX = node.children[node.children.length - 1]._x;
    node._x = (firstChildX + lastChildX) / 2;
  }

  function secondWalk(node, accumulatedMod = 0) {
    if (!node) return;
    node._x += accumulatedMod;
    node.children?.forEach(c => secondWalk(c, accumulatedMod + node._mod));
  }

  function calculateMaxOverlap(leftSubTree, rightSubTree) {
    const leftContour = {};
    const rightContour = {};

    function getRightContour(n, depth = 0, currentX = 0) {
      rightContour[depth] = Math.max(rightContour[depth] ?? -Infinity, currentX + n._x);
      n.children?.forEach(c => getRightContour(c, depth + 1, currentX + n._mod));
    }

    function getLeftContour(n, depth = 0, currentX = 0) {
      leftContour[depth] = Math.min(leftContour[depth] ?? Infinity, currentX + n._x);
      n.children?.forEach(c => getLeftContour(c, depth + 1, currentX + n._mod));
    }

    getRightContour(leftSubTree, 0, 0);
    getLeftContour(rightSubTree, 0, 0);

    let maxOverlap = 0;
    Object.keys(leftContour).forEach(d => {
      if (rightContour[d] !== undefined) {
        const dist = leftContour[d] - rightContour[d];
        const minDistanceRequired = NODE_R * 2 + H_GAP;
        if (dist < minDistanceRequired) {
          const neededShift = minDistanceRequired - dist;
          if (neededShift > maxOverlap) {
            maxOverlap = neededShift;
          }
        }
      }
    });

    return maxOverlap;
  }

  setup(root, 0);
  firstWalk(root, 0);
  secondWalk(root, 0);
}

function collectNodesWithParent(node, parent = null, acc = []) {
  if (!node) return acc;
  node._parent = parent; 
  acc.push(node);
  node.children?.forEach(c => collectNodesWithParent(c, node, acc));
  return acc;
}

export default function TreePanel({ result }) {
  if (result) {
    window.__last_result = result;
  }

  const treeData = result?.tree || 
                   result?.root_tree || 
                   result?.table?.tree || 
                   result?.table?.root_tree ||
                   window.__last_result?.tree || 
                   window.__last_result?.root_tree ||
                   window.__last_result?.table?.tree;
  
  const errorCell = result?.error_cell || 
                    result?.table?.error_cell || 
                    window.__last_result?.error_cell ||
                    window.__last_result?.table?.error_cell;

  if (!treeData) return <div className={styles.placeholder}>Ejecuta el análisis para ver el árbol.</div>

  const { nodes, edges, width, height } = useMemo(() => {
    const tree = JSON.parse(JSON.stringify(treeData))
    
    perfectTreeLayout(tree)

    const flatNodes = collectNodesWithParent(tree, null, [])
    
    const minX = Math.min(...flatNodes.map(n => n._x))
    const offset = minX < NODE_R + 25 ? (NODE_R + 25) - minX : 25;
    flatNodes.forEach(n => n._x += offset);

    // 1. Identificamos los NODOS reales que tienen error de forma única e inequívoca
    flatNodes.forEach(n => {
      const term = isTerminal(n.label)
      
      // 🌟 DETECTOR ROBUSTO: Se activa si es la marca literal '✗', el token del choque,
      // o el No Terminal padre que contiene el colapso de Descenso Recursivo.
      n.isActualErrorNode = n.label === '✗' || (errorCell && (
        (term && n.label === errorCell.t) || 
        (!term && n.label === errorCell.nt && (
          !n.children || 
          n.children.length === 0 || 
          n.children.some(c => c.label === '✗' || c.label === errorCell.t)
        ))
      ));
    });

    // 2. Generamos las aristas basándonos en la propiedad única del nodo hijo
    const flatEdges = [];
    flatNodes.forEach(n => {
      if (n._parent) {
        // La arista se colorea si conecta hacia un nodo marcado como crítico de error
        const isErrorEdge = n.isActualErrorNode;

        flatEdges.push({
          x1: n._parent._x,
          y1: n._parent._y,
          x2: n._x,
          y2: n._y,
          isError: isErrorEdge
        });
      }
    });

    const maxX = Math.max(...flatNodes.map(n => n._x)) + NODE_R + 35
    const maxY = Math.max(...flatNodes.map(n => n._y)) + NODE_R + 35

    return { 
      nodes: flatNodes, 
      edges: flatEdges, 
      width: Math.max(maxX, 300), 
      height: maxY 
    }
  }, [treeData, errorCell])

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.sectionTitle}>Árbol de derivación parcial</div>
      <div className={styles.treeWrap} style={{ overflowX: 'auto', width: '100%' }}>
        <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
          {/* Renderizado de Líneas */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={e.isError ? "rgba(239, 68, 68, 0.6)" : "rgba(124,108,255,0.45)"}
              strokeWidth={e.isError ? 2 : 1.5}
              strokeDasharray={e.isError ? "4 2" : "none"}
            />
          ))}
          
          {/* Renderizado de Nodos */}
          {nodes.map((n, i) => {
            const term = isTerminal(n.label)
            const epsilon = n.label === 'ϵ' || n.label === 'λ'
            
            // 🌟 CONSUMO DE MEMORIA PRECALCULADA: Sincroniza la vista con el mapa del useMemo
            const isErrorNode = n.isActualErrorNode;

            let fill = epsilon ? 'rgba(251,146,60,0.15)'
                     : term    ? 'rgba(93,232,168,0.12)'
                     :           'rgba(124,108,255,0.18)';
                     
            let stroke = epsilon ? '#fb923c'
                       : term    ? 'var(--accent2)'
                       :           'var(--accent)';
                       
            let textColor = epsilon ? '#fb923c'
                          : term    ? 'var(--accent2)'
                          :           '#c4b5fd';

            if (isErrorNode) {
              fill = 'rgba(239, 68, 68, 0.25)';
              stroke = '#ef4444';
              textColor = '#f87171';
            }

            return (
              <g key={i} style={{ cursor: isErrorNode ? 'help' : 'default' }}>
                <title>{isErrorNode ? `Punto crítico de error sintáctico: Choque con el símbolo '${n.label}'` : ''}</title>
                <circle
                  cx={n._x} cy={n._y} r={NODE_R}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isErrorNode ? 2.5 : (term ? 1 : 1.5)}
                />
                <text
                  x={n._x} y={n._y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'JetBrains Mono', monospace"
                  fontSize={11}
                  fontWeight={isErrorNode || !term ? 700 : 400}
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
        <span style={{color:'#ef4444', fontWeight: 'bold'}}>● Nodo con Error</span>
      </div>
    </div>
  )
}