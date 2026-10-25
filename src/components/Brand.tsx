/** Modular E and compact signature from the selected B identity. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <path d="M6 6H30V30H6ZM32 6H74V28H32ZM6 32H30V74H6ZM32 32H60V52H32ZM32 54H74V74H32Z" fill="currentColor" />
    <path d="M62 30H78V46H62Z" fill="var(--brand-pop)" />
  </svg>;
}

export function Brand() {
  return <div className="brand" role="img" aria-label="Entrelinhas">
    <BrandMark />
    <div className="wordmark" aria-hidden="true">entre<span>linhas<span className="wordmark-dot">.</span></span></div>
  </div>;
}
