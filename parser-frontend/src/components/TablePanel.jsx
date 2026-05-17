import styles from './Panels.module.css'

export default function TablePanel({ result }) {
  if (!result?.table) return <div className={styles.placeholder}>Ejecuta el análisis para ver la tabla.</div>

  const { table } = result

  // 1. CORRECCIÓN: Capturamos el tipo 'RD' antes de que llegue al error de desconocido
  if (table.type === 'RD') return <RecursiveDescentInfo table={table} />
  if (table.type === 'LL1') return <LL1Table table={table} />
  if (['LR0','SLR1','LALR1','LR1'].includes(table.type)) return <LRTable table={table} />
  
  return <div className={styles.placeholder}>Tipo de tabla desconocido: {table.type}</div>
}

// 2. NUEVO COMPONENTE: Vista pedagógica y limpia para Descenso Recursivo
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
          color: '#9ca3af'
        }}>
          💡 <strong>Nota pedagógica:</strong> Puedes visualizar el rastro exacto de cómo se llamaron, emparejaron y retornaron las funciones matemáticas en la pestaña de <strong>"Pasos"</strong>, y revisar la jerarquía final generada en la pestaña de <strong>"Árbol"</strong>.
        </div>
      </div>
    </div>
  )
}

function LL1Table({ table }) {
  const { non_terminals, terminals, cells } = table
  return (
    <div className={`${styles.panel} animate-in`}>
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
                  const cell = cells[nt]?.[t] ?? ''
                  return (
                    <td key={t} className={cell ? styles.cellFilled : styles.cellEmpty}>
                      {cell || ''}
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
  return (
    <div className={`${styles.panel} animate-in`}>
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
                  return (
                    <td key={t} className={cellClass(v)}>{v}</td>
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