import Link from 'next/link'
import { Wifi, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Home Plans', href: '/packages' },
    { label: 'Business Plans', href: '/packages' },
    { label: 'Coverage Map', href: '/coverage' },
    { label: 'Speed Test', href: '/#speed-test' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
    { label: 'News', href: '/#' },
  ],
  Support: [
    { label: 'Help Center', href: '/support' },
    { label: 'Installation', href: '/support' },
    { label: 'Billing', href: '/support' },
    { label: 'Network Status', href: '/support' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/legal/privacy-policy' },
    { label: 'Terms of Service', href: '/legal/terms-of-service' },
    { label: 'Acceptable Use', href: '/legal/terms-of-service' },
    { label: 'SLA', href: '/legal/terms-of-service' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold text-primary">
              <Wifi className="h-6 w-6" />
              <span>Iconic Fibre</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Fast. Reliable. Kenyan-built Internet. Fiber and wireless connectivity for homes and businesses
              across Kenya.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-heading text-sm font-semibold text-foreground">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Bar */}
        <div className="mt-12 grid gap-4 border-t border-border/50 pt-8 sm:grid-cols-3">
          <a href="tel:+254746089137" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Call Us</div>
              <div className="text-muted-foreground">+254746089137</div>
            </div>
          </a>
          <a href="mailto:info@3iconic.co.ke" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Email</div>
              <div className="text-muted-foreground">info@3iconic.co.ke</div>
            </div>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">Headquarters</div>
              <div className="text-muted-foreground">Nyeri, Kenya</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Iconic Fibre. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

