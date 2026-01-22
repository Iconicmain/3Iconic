import Link from 'next/link'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

const footerLinks = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Business', href: '/business' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Residential', href: '/services' },
      { label: 'Business Internet', href: '/services' },
      { label: 'Dedicated Links', href: '/business' },
      { label: 'Coverage Areas', href: '/coverage' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Support Center', href: '/support' },
      { label: 'Status & Uptime', href: '/support' },
      { label: 'Privacy Policy', href: '/legal/privacy-policy' },
      { label: 'Terms of Service', href: '/legal/terms-of-service' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_2fr] lg:px-8">
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <Globe className="h-5 w-5" />
            </span>
            Evercore Networks
          </div>
          <p className="text-sm text-slate-600">
            Enterprise-grade internet infrastructure trusted by public agencies, business
            ecosystems, and essential services across the region.
          </p>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              1200 Meridian Way, San Francisco, CA
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              +1 (800) 280-5520
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600" />
              support@evercorenetworks.com
            </div>
          </div>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {footerLinks.map((group) => (
            <div key={group.title} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">
                {group.title}
              </h3>
              <div className="space-y-3 text-sm text-slate-600">
                {group.links.map((link) => (
                  <Link key={link.label} href={link.href} className="block transition-colors hover:text-emerald-600">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 Evercore Networks. All rights reserved.</span>
          <span>Built for mission-critical connectivity.</span>
        </div>
      </div>
    </footer>
  )
}

