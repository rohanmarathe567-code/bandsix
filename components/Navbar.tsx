'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, Trophy, Calculator, Search, GraduationCap, GitCompare } from 'lucide-react'

const navLinks = [
  {
    label: 'Honour Roll',
    icon: Trophy,
    children: [
      { href: '/honour-roll/schools', label: 'School Rankings' },
      { href: '/honour-roll/courses', label: 'Course Rankings' },
    ],
  },
  { href: '/compare',         label: 'Compare',          icon: GitCompare },
  { href: '/atar-calculator', label: 'ATAR Calculator',  icon: Calculator },
  { href: '/search',          label: 'Search',           icon: Search },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const isActive = (href: string) => pathname.startsWith(href)

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-bg-base/95 backdrop-blur-md border-b border-border shadow-2xl'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow">
              <GraduationCap className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="text-xl font-extrabold tracking-tight gradient-text">
              BandSix
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              if ('children' in link && link.children) {
                const open = dropdownOpen === link.label
                const active = link.children.some(c => isActive(c.href))
                return (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(link.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                  >
                    <button
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'text-primary-light bg-primary/10'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      <link.icon size={15} />
                      {link.label}
                      <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="absolute top-full left-0 mt-1 w-52 bg-bg-elevated border border-border rounded-xl shadow-2xl py-1 animate-fade-in">
                        {link.children.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                              isActive(child.href)
                                ? 'text-primary-light bg-primary/10'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                            }`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              const active = isActive(link.href!)
              return (
                <Link
                  key={link.href}
                  href={link.href!}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'text-primary-light bg-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-bg-surface border-t border-border animate-slide-up">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navLinks.map(link => {
              if ('children' in link && link.children) {
                return (
                  <div key={link.label}>
                    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <link.icon size={13} />
                      {link.label}
                    </div>
                    {link.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center px-6 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? 'text-primary-light bg-primary/10'
                            : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )
              }
              const active = isActive(link.href!)
              return (
                <Link
                  key={link.href}
                  href={link.href!}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'text-primary-light bg-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
