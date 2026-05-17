import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  Position 
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css'; 

import styles from './Panels.module.css';

export default function TablePanel({ result }) {
  // Guardamos una copia rápida en el objeto window para que los subcomponentes la hereden
  if (result?.error_cell) window.__last_result = result;
  
  const table = result?.table || result;

  if (!table || (!table.type && !result?.table)) {
    return <div className={styles.placeholder}>Ejecuta el análisis para ver la tabla o metadatos.</div>
  }

  // Capturamos el tipo 'RD' de forma segura y blindada
  if (table.type === 'RD') return <RecursiveDescentInfo table={table} />
  
  // Le pasamos también el objeto global 'result' para poder extraer FIRST y FOLLOW
  if (table.type === 'LL1') return <LL1Table table={table} result={result} />
  
  // 🌟 MODIFICACIÓN UNIFICADA: Vista Combinada para la familia LR
  if (['LR0', 'SLR1', 'LALR1', 'LR1', 'LR(0)', 'SLR(1)'].includes(table.type)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <LRTable table={table} />
        </div>
        <div>
          {/* Componente del Autómata que renderiza nodos y flechas de conexión */}
          <LRAutomatonVisualizer table={table} result={result} />
        </div>
      </div>
    );
  }
  
  return <div className={styles.placeholder}>Tipo de tabla desconocido: {table.type || "No especificado"}</div>
}

// Vista pedagógica y limpia para Descenso Recursivo
function RecursiveDescentInfo({ table }) {
  return (
    <div className={`${styles.panel} animate-in`} style={{ padding: '24px' }}>
      <div className={styles.sectionTitle} style={{ color: '#a855f7', marginBottom: '12px' }}>
        Análisis Sintáctico por Descenso Recursivo
      </div>
      <div style={{ color: '#e2e8f0', lineHeight: '1.6', fontSize: '14px' }}>
        <p style={{ marginBottom: '12px' }}>
          {table.info || "El análisis por Descenso Recursivo se ejecuta mediante funciones recursivas dinámicas, por lo que no requiere una tabla fija de estados."}
        </p>
        <div style={{ 
          backgroundColor: 'rgba(168, 85, 247, 0.1)', 
          borderLeft: '4px solid #a855f7', 
          padding: '12px', 
          borderRadius: '4px',
          marginTop: '16px',
          color: '#e2e8f0'
        }}>
          💡 <strong>Nota pedagógica de robustez:</strong> Si la cadena contiene un error, podrás visualizar el rastro exacto de los tokens procesados hasta el colapso en la pestaña de <strong>"Pasos"</strong> con la etiqueta final marcada como error.
        </div>
      </div>
    </div>
  )
}

// Subcomponente para FIRST y FOLLOW
function FirstFollowSets({ nonTerminals, firstData, followData }) {
  if (!firstData && !followData) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div className={styles.sectionTitle} style={{ marginBottom: '12px', fontSize: '10px', color: '#6A717F' }}>
        Conjuntos de Selección (FIRST y FOLLOW)
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.parseTable}>
          <thead>
            <tr>
              <th style={{ width: '20%' }}>No Terminal (NT)</th>
              <th style={{ width: '40%' }}>FIRST (Primeros)</th>
              <th style={{ width: '40%' }}>FOLLOW (Siguientes)</th>
            </tr>
          </thead>
          <tbody>
            {nonTerminals.map(nt => (
              <tr key={nt}>
                <td className={styles.rowHead} style={{ fontWeight: 'bold', color: '#a855f7' }}>{nt}</td>
                <td style={{ color: '#34d399', fontFamily: 'monospace', fontSize: '13px' }}>
                  {`{ ${firstData?.[nt] || 'ϵ'} }`}
                </td>
                <td style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '13px' }}>
                  {`{ ${followData?.[nt] || '$'} }`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LL1Table({ table, result }) {
  const non_terminals = table.non_terminals
  const terminals = table.terminals
  const cells = table.cells || table.action 

  const firstData = result?.first || result?.grammar_info?.first || table?.grammar_info?.first;
  const followData = result?.follow || result?.grammar_info?.follow || table?.grammar_info?.follow;

  const errorCell = table.error_cell || window.__last_result?.error_cell; 

  if (!non_terminals || !terminals) return <div className={styles.placeholder}>Estructura de tabla LL(1) incompleta.</div>
  
  return (
    <div className={`${styles.panel} animate-in`}>
      <FirstFollowSets 
        nonTerminals={non_terminals} 
        firstData={firstData} 
        followData={followData} 
      />

      <div className={styles.sectionTitle}>Tabla predictiva LL(1)</div>
      <div className={styles.tableWrap}>
        <table className={styles.parseTable}>
          <thead>
            <tr>
              <th className={styles.corner}>NT \ T</th>
              {terminals.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {non_terminals.map(nt => (
              <tr key={nt}>
                <td className={styles.rowHead}>{nt}</td>
                {terminals.map(t => {
                  const cell = cells?.[nt]?.[t] ?? ''
                  
                  const isErrorPoint = errorCell && errorCell.nt === nt && errorCell.t === t;
                  const isConflict = typeof cell === 'string' && cell.includes('/')
                  
                  let cellStyle = {}
                  let customClass = cell ? styles.cellFilled : styles.cellEmpty
                  let titleText = ""

                  if (isErrorPoint) {
                    cellStyle = {
                      backgroundColor: 'rgba(239, 68, 68, 0.35)', 
                      color: '#f87171', 
                      fontWeight: 'bold',
                      border: '2px solid #ef4444',
                      textAlign: 'center'
                    }
                    titleText = `Error de parada en (${nt}, ${t}): Estructura inconsistente con el lookahead o tokens sobrantes al final de la expresión.`
                  } else if (isConflict) {
                    cellStyle = {
                      backgroundColor: 'rgba(245, 158, 11, 0.25)', 
                      color: '#f59e0b', 
                      fontWeight: 'bold'
                    }
                    titleText = "Conflicto de ambigüedad detectado"
                  }

                  return (
                    <td 
                      key={t} 
                      className={isErrorPoint ? styles.cellConflict : customClass}
                      style={cellStyle}
                      title={titleText}
                    >
                      {isErrorPoint ? (cell || 'error') : (cell || '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LRTable({ table }) {
  const { states, terminals, non_terminals, action, goto: gotoTable } = table
  if (!states) return <div className={styles.placeholder}>Estructura de tabla LR incompleta o vacía por error sintáctico.</div>

  const errorCell = table.error_cell || window.__last_result?.error_cell;

  return (
    <div className={`${styles.panel} animate-in`}>
      <div className={styles.sectionTitle}>Tabla de Análisis Sintáctico ({table.type || 'LR'})</div>
      <div className={styles.tableWrap}>
        <table className={styles.parseTable}>
          <thead>
            <tr>
              <th className={styles.corner} rowSpan={2}>Estado</th>
              <th colSpan={terminals?.length} className={styles.sectionHeader}>ACTION</th>
              <th colSpan={non_terminals?.length} className={styles.sectionHeader}>GOTO</th>
            </tr>
            <tr>
              {terminals?.map(t => <th key={t}>{t}</th>)}
              {non_terminals?.map(n => <th key={n} className={styles.gotoCol}>{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {states?.map(st => (
              <tr key={st}>
                <td className={styles.stateNum}>{st}</td>
                {terminals?.map(t => {
                  const v = action?.[st]?.[t] ?? ''
                  const isErrorPoint = errorCell && Number(errorCell.state) === Number(st) && errorCell.symbol === t;

                  let cellStyle = {}
                  if (isErrorPoint) {
                    cellStyle = {
                      backgroundColor: 'rgba(239, 68, 68, 0.35)', 
                      color: '#f87171', 
                      fontWeight: 'bold',
                      border: '2px solid #ef4444',
                      textAlign: 'center'
                    }
                  }

                  return (
                    <td 
                      key={t} 
                      className={isErrorPoint ? styles.cellConflict : cellClass(v)}
                      style={cellStyle}
                      title={isErrorPoint ? (errorCell.msg || `Error Sintáctico en Estado ${st}: Símbolo '${t}' no esperado.`) : ""}
                    >
                      {isErrorPoint ? (v || 'error') : v}
                    </td>
                  )
                })}
                {non_terminals?.map(n => {
                  const v = gotoTable?.[st]?.[n] ?? ''
                  return <td key={n} className={v ? styles.cellGoto : styles.cellEmpty}>{v}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function cellClass(v) {
  if (!v) return styles.cellEmpty
  if (v.startsWith('s')) return styles.cellShift
  if (v.startsWith('r')) return styles.cellReduce
  if (v === 'acc') return styles.cellAccept
  return styles.cellFilled
}

// 🌟 SUBCOMPONENTE ACTUALIZADO: Visualizador de Autómatas con Auto-Layout (Dagre)
function LRAutomatonVisualizer({ table, result }) {
  const automatonStatesItems = result?.grammar_info?.automaton_states || table?.grammar_info?.automaton_states;
  const { action, goto: gotoTable } = table;

  if (!automatonStatesItems) return null;

  // 1. Extraer transiciones (Mismo código de antes)
  const transitionsMap = useMemo(() => {
    const map = {};
    if (!action || !gotoTable) return map;
    Object.keys(automatonStatesItems).forEach(stateNum => {
      const transitions = [];
      if (action?.[stateNum]) {
        Object.entries(action[stateNum]).forEach(([term, act]) => {
          if (act && act.startsWith('s')) transitions.push({ symbol: term, target: act.substring(1), type: 'shift' });
        });
      }
      if (gotoTable?.[stateNum]) {
        Object.entries(gotoTable[stateNum]).forEach(([nonTerm, targetState]) => {
          if (targetState !== undefined && targetState !== '') transitions.push({ symbol: nonTerm, target: targetState, type: 'goto' });
        });
      }
      map[stateNum] = transitions;
    });
    return map;
  }, [action, gotoTable, automatonStatesItems]);

  // 2. Crear los Nodos (Mismo JSX, pero sin calcular la posición X, Y a mano)
  const initialNodes = useMemo(() => {
    return Object.entries(automatonStatesItems).map(([stateNum, items]) => {
      const StateBox = (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '2px solid #3b82f6',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          zIndex: 2,
          minWidth: '240px',
          color: '#e2e8f0'
        }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.25)', borderBottom: '2px solid #3b82f6', padding: '6px 12px', fontWeight: 'bold', fontSize: '14px', color: '#60a5fa', fontFamily: 'monospace' }}>
            I{stateNum}
          </div>
          <div style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12.5px', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {items.map((item, idx) => <div key={idx} style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item}</div>)}
          </div>
        </div>
      );

      return {
        id: stateNum,
        type: 'default',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: StateBox },
        position: { x: 0, y: 0 }, // 👈 Dagre lo sobreescribirá en el paso 4
        style: { border: 'none', background: 'none', padding: 0 }
      };
    });
  }, [automatonStatesItems]);

  // 3. Crear Aristas (Igual que antes)
  const initialEdges = useMemo(() => {
    const edgeList = [];
    Object.entries(transitionsMap).forEach(([srcState, transitions]) => {
      transitions.forEach(trans => {
        const isShift = trans.type === 'shift';
        const color = isShift ? '#34d399' : '#c084fc';
        const bgColor = isShift ? '#064e3b' : '#4c1d95';

        edgeList.push({
          id: `e${srcState}-${trans.symbol}-${trans.target}`,
          source: srcState,
          target: trans.target,
          label: trans.symbol,
          type: 'smoothstep', 
          animated: isShift,
          style: { stroke: color, strokeWidth: 2, opacity: 0.85 },
          labelStyle: { fill: '#ffffff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 },
          labelBgStyle: { fill: bgColor, stroke: color, strokeWidth: 1 },
          labelBgPadding: [6, 4],
          labelBgBorderRadius: 4,
          markerEnd: { type: MarkerType.ArrowClosed, color: color }
        });
      });
    });
    return edgeList;
  }, [transitionsMap]);

  // 🌟 4. LA MAGIA DE DAGRE: Calcular el Auto-Layout
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // rankdir: 'LR' (Left to Right), ranksep: espacio horizontal, nodesep: espacio vertical
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 300, nodesep: 80 });

    initialNodes.forEach((node) => {
      // Le damos dimensiones aproximadas a Dagre para que sepa cuánto espacio ocupa cada caja
      dagreGraph.setNode(node.id, { width: 260, height: 180 });
    });

    initialEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const mappedNodes = initialNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        // Ajustamos la posición restando la mitad de la altura/anchura para centrar
        position: {
          x: nodeWithPosition.x - 260 / 2,
          y: nodeWithPosition.y - 180 / 2,
        },
      };
    });

    return { layoutedNodes: mappedNodes, layoutedEdges: initialEdges };
  }, [initialNodes, initialEdges]);


  return (
    <div className={`${styles.panel} animate-in`} style={{ padding: '24px', marginTop: '12px' }}>
      <div className={styles.sectionTitle} style={{ color: '#3b82f6', marginBottom: '24px' }}>
        Diagrama del Autómata LR (Grafo DFA Generado Automáticamente)
      </div>

      <div style={{ width: '100%', height: '750px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: '#0f172a' }}
        >
          <Background color="rgba(255,255,255,0.05)" gap={24} />
          <Controls style={{ color: '#000', backgroundColor: '#fff', borderRadius: '4px' }} />
        </ReactFlow>
      </div>
    </div>
  );
}