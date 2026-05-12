import Link from 'next/link'
import { GraduationCap, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <GraduationCap size={16} className="text-white" />
              </div>
              <span className="text-lg font-extrabold gradient-text">BandSix</span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              NSW HSC results, reimagined. Explore Distinguished Achievers, school rankings, course rankings and estimate your ATAR.
            </p>
            <p className="mt-4 text-text-muted text-xs">
              Data sourced from{' '}
              <a
                href="https://educationstandards.nsw.edu.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light hover:underline inline-flex items-center gap-0.5"
              >
                NESA <ExternalLink size={10} />
              </a>
              {' '}and{' '}
              <a
                href="https://uac.edu.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-light hover:underline inline-flex items-center gap-0.5"
              >
                UAC <ExternalLink size={10} />
              </a>
              . BandSix is independent and not affiliated with NESA or UAC.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-text-primary text-sm font-semibold mb-3">Features</h4>
            <ul className="space-y-2 text-sm">
              {[
                { href: '/honour-roll/schools', label: 'School Rankings' },
                { href: '/honour-roll/courses', label: 'Course Rankings' },
                { href: '/atar-calculator',     label: 'ATAR Calculator' },
                { href: '/search',              label: 'Search' },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-text-secondary hover:text-text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="text-text-primary text-sm font-semibold mb-3">Disclaimer</h4>
            <p className="text-text-muted text-xs leading-relaxed">
              ATAR estimates are approximations only. The actual UAC scaling process is proprietary. Always consult UAC for official results.
            </p>
            <p className="text-text-muted text-xs leading-relaxed mt-2">
              All student data is sourced from publicly available NESA publications.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>© {new Date().getFullYear()} BandSix. NSW HSC results, reimagined.</span>
          <span className="flex items-center gap-1">
            Built for NSW students &amp; families.
          </span>
        </div>
      </div>
    </footer>
  )
}
