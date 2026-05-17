import { useMemo } from 'react'
import styles from './Panels.module.css'

const NODE_R   = 16
const H_GAP    = 40  // Espacio mínimo libre garantizado entre burbujas vecinas
const V_GAP    = 60  // Distancia vertical fija entre niveles
const TERMINALS = new Set(['+', '-', '*', '/', '(', ')', 'id', '$', 'ϵ', 'λ'])

function isTerminal(label) {
  return TERMINALS.has(label) || /^[a-z$ϵλ]$/.test(label)
}

/**
 * Motor de Layout Jerárquico Avanzado (Basado en Walker / Buchheim & Jünger)
 * Soluciona colisiones en cualquier nivel de profundidad calculando contornos dinámicos.
 */
function perfectTreeLayout(root) {
  // Inicialización de propiedades del layout
  function setup(node, depth = 0) {
    if (!node) return;
    node._y = depth * V_GAP + NODE_R + 25;
    node._x = 0;
    node._mod = 0; // Modificador para empujar subárboles de manera hereditaria
    node.children?.forEach(c => setup(c, depth + 1));
  }

  // Primera fase (Bottom-Up): Calcula X relativas y resuelve colisiones de contornos
  function firstWalk(node, depth = 0) {
    if (!node.children || node.children.length === 0) {
      // Si el nodo es una hoja, su posición inicial es 0 de manera local
      node._x = 0;
      return;
    }

    // Procesar recursivamente toda la descendencia
    node.children.forEach(c => firstWalk(c, depth + 1));

    // Desplazar los hijos para que no se encimen entre sí localmente
    let currentLeftX = 0;
    node.children.forEach((child, i) => {
      if (i > 0) {
        // Dejamos un espacio base basado en el radio de los nodos y el gap horizontal
        currentLeftX += NODE_R * 2 + H_GAP;
      }
      child._x = currentLeftX;
    });

    // Resolver colisiones reales inspeccionando los niveles inferiores de subárboles hermanos
    for (let i = 0; i < node.children.length - 1; i++) {
      const leftChild = node.children[i];
      
      for (let j = i + 1; j < node.children.length; j++) {
        const rightChild = node.children[j];
        
        // Buscamos cuál es el solapamiento máximo en cualquier nivel de profundidad inferior
        const overlap = calculateMaxOverlap(leftChild, rightChild);
        if (overlap > 0) {
          // Empujamos el hijo derecho lo necesario para romper el choque
          rightChild._x += overlap;
          rightChild._mod += overlap;
        }
      }
    }

    // Centrar al padre perfectamente arriba de sus hijos ya reacomodados
    const firstChildX = node.children[0]._x;
    const lastChildX = node.children[node.children.length - 1]._x;
    node._x = (firstChildX + lastChildX) / 2;
  }

  // Segunda fase (Top-Down): Aplica y hereda los modificadores acumulados
  function secondWalk(node, accumulatedMod = 0) {
    if (!node) return;
    node._x += accumulatedMod;
    node.children?.forEach(c => secondWalk(c, accumulatedMod + node._mod));
  }

  // Función auxiliar para escanear y encontrar colisiones en niveles inferiores
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
    // Comparamos los niveles comunes para ver si las ramas chocan abajo
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

// Recolecta los nodos en una lista plana guardando la referencia del padre para el SVG
function collectNodesWithParent(node, parent = null, acc = []) {
  if (!node) return acc;
  node._parent = parent; 
  acc.push(node);
  node.children?.forEach(c => collectNodesWithParent(c, node, acc));
  return acc;
}

export default function TreePanel({ result }) {
  const treeData = result?.tree || result?.root_tree;

  if (!treeData) return <div className={styles.placeholder}>Ejecuta el análisis para ver el árbol.</div>

  const { nodes, edges, width, height } = useMemo(() => {
    const tree = JSON.parse(JSON.stringify(treeData))
    
    // Invocamos el maquetador de contornos dinámicos
    perfectTreeLayout(tree)

    const flatNodes = collectNodesWithParent(tree, null, [])
    
    // Normalización: Asegurar que ningún nodo quede fuera del canvas por la izquierda
    const minX = Math.min(...flatNodes.map(n => n._x))
    const offset = minX < NODE_R + 25 ? (NODE_R + 25) - minX : 25;
    flatNodes.forEach(n => n._x += offset);

    // Generación limpia de aristas directo de la lista plana normalizada
    const flatEdges = [];
    flatNodes.forEach(n => {
      if (n._parent) {
        flatEdges.push({
          x1: n._parent._x,
          y1: n._parent._y,
          x2: n._x,
          y2: n._y
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
  }, [treeData])

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.sectionTitle}>Árbol de derivación</div>
      <div className={styles.treeWrap} style={{ overflowX: 'auto', width: '100%' }}>
        <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
          {/* Renderizado de Líneas */}
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(124,108,255,0.45)"
              strokeWidth={1.5}
            />
          ))}
          
          {/* Renderizado de Nodos */}
          {nodes.map((n, i) => {
            const term = isTerminal(n.label)
            const epsilon = n.label === 'ϵ' || n.label === 'λ'
            const fill   = epsilon ? 'rgba(251,146,60,0.15)'
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