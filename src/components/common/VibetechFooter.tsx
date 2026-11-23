import { BRAND_CONFIG } from '@/config/brand';

export function VibetechFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={
        compact
          ? 'border-t border-white/[0.06] py-4 px-4 text-center text-xs text-ink-dim'
          : 'border-t border-white/[0.08] bg-deep/80 py-6 px-4 mt-12'
      }
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-dim">
        <span>
          © {new Date().getFullYear()} {BRAND_CONFIG.appName} — Uma solução{' '}
          <span className="text-gold font-semibold">{BRAND_CONFIG.developerName}</span>
        </span>
        <a
          href={BRAND_CONFIG.developerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink-muted hover:text-gold transition-colors"
        >
          <span>Desenvolvido por</span>
          <strong className="text-gold font-semibold hover:underline">
            {BRAND_CONFIG.developerName}
          </strong>
        </a>
      </div>
    </footer>
  );
}
