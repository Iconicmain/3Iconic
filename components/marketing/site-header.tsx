import Link from 'next/link'
import { ArrowRight, ShieldCheck, Wifi } from 'lucide-react'

import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Coverage', href: '/coverage' },
  { label: 'Business', href: '/business' },
  { label: 'Careers', href: '/careers' },
  { label: 'Support', href: '/support' },
  { label: 'Contact', href: '/contact' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
            <Wifi className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Evercore <span className="text-emerald-600">Networks</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Client Portal
          </Button>
          <Button className="gap-2 rounded-full bg-emerald-600 px-5 shadow-sm hover:bg-emerald-500">
            Check Coverage
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex lg:hidden">
          <Button variant="outline" size="sm" className="rounded-full border-slate-300 bg-white text-slate-900 px-4">
            Menu
          </Button>
        </div>
      </div>
    </header>
  )
}

