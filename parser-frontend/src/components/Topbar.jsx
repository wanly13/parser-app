import styles from './Topbar.module.css'

export default function Topbar({ algorithms, active, onSelect, connected }) {
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>
        El <span className={styles.accent2}>Parserito</span>{' '}
        <span className={styles.accent}>App</span>
      </div>

      <nav className={styles.tabs}>
        {algorithms.map(algo => (
          <button
            key={algo}
            className={`${styles.tab} ${active === algo ? styles.tabActive : ''}`}
            onClick={() => onSelect(algo)}
          >
            {algo}
          </button>
        ))}
      </nav>

      <div
        className={styles.dot}
        title={connected ? 'Backend conectado' : 'Usando datos mock'}
        style={{ background: connected ? 'var(--accent2)' : 'var(--warn)' }}
      />
    </header>
  )
}
