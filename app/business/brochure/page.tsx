'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Wifi,
  Shield,
  Zap,
  Globe,
  Clock,
  TrendingUp,
  Building2,
  Server,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Download,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { stats } from '@/lib/isp-data'

export default function BusinessBrochurePage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block fixed top-0 left-0 right-0 bg-primary text-white p-4 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Iconic Fibre - Business Solutions</h1>
          <p className="text-sm opacity-90">www.3iconic.co.ke</p>
        </div>
      </div>

      {/* Non-print Header */}
      <div className="print:hidden bg-gradient-to-b from-background via-muted/20 to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/business">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Business
              </Button>
            </Link>
            <Button onClick={handlePrint} className="gap-2">
              <Download className="h-4 w-4" />
              Download / Print
            </Button>
          </div>
        </div>
      </div>

      {/* Brochure Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 print:py-4">
        {/* Cover Page */}
        <div className="mb-16 print:mb-8 print:page-break-after-always">
          <div className="bg-gradient-to-br from-primary via-primary/90 to-accent rounded-3xl p-12 sm:p-16 lg:p-20 text-center text-white print:rounded-none print:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm">
                <Wifi className="h-10 w-10" />
              </div>
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold mb-4">
                Iconic Fibre
              </h1>
              <p className="text-2xl sm:text-3xl font-semibold mb-2 opacity-95">
                Business Internet Solutions
              </p>
              <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto mt-6">
                Enterprise-grade connectivity built for Kenyan businesses
              </p>
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
                <div>
                  <div className="text-3xl font-bold">{stats.uptime}</div>
                  <div className="text-sm opacity-90 mt-1">Uptime SLA</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.avgLatency}</div>
                  <div className="text-sm opacity-90 mt-1">Avg Latency</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.townsCovered}+</div>
                  <div className="text-sm opacity-90 mt-1">Towns Covered</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{stats.activeCustomers}</div>
                  <div className="text-sm opacity-90 mt-1">Active Customers</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Why Iconic Fibre */}
        <div className="mb-16 print:mb-8 print:page-break-inside-avoid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h2 className="font-heading text-4xl font-bold text-foreground mb-6">
              Why Choose Iconic Fibre?
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  icon: Zap,
                  title: 'True Fiber Technology',
                  description:
                    'Dedicated fiber connections, not shared wireless. Symmetric speeds up to 10+ Gbps for mission-critical operations.',
                },
                {
                  icon: Shield,
                  title: '99.9% Uptime SLA',
                  description:
                    'Guaranteed reliability with automatic service credits. Redundant paths and 24/7 NOC monitoring.',
                },
                {
                  icon: Globe,
                  title: 'BGP Multihoming',
                  description:
                    'Custom IP allocation, BGP routing, and multiple upstream providers for optimal global connectivity.',
                },
                {
                  icon: Clock,
                  title: '2-Hour Response SLA',
                  description:
                    'Priority support with guaranteed response times. Dedicated account manager for enterprise clients.',
                },
                {
                  icon: Server,
                  title: 'Managed Infrastructure',
                  description:
                    'Optional managed firewall, security services, and network monitoring. Focus on your business, not IT.',
                },
                {
                  icon: TrendingUp,
                  title: 'Scalable Solutions',
                  description:
                    'From 20 Mbps to 10+ Gbps. Grow your bandwidth as your business grows. No long-term lock-ins.',
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl border border-border/50 bg-card/50 hover:border-primary/50 transition-all"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Business Solutions */}
        <div className="mb-16 print:mb-8 print:page-break-inside-avoid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h2 className="font-heading text-4xl font-bold text-foreground mb-6">
              Solutions for Every Business
            </h2>
            <div className="space-y-6">
              {[
                {
                  title: 'Business Starter',
                  speed: '20 Mbps',
                  price: 'KES 6,999/month',
                  features: [
                    'Unlimited data',
                    'Static IP included',
                    'Business-grade router',
                    'Priority support',
                    'Email & web hosting ready',
                  ],
                },
                {
                  title: 'Business Growth',
                  speed: '50 Mbps',
                  price: 'KES 12,999/month',
                  features: [
                    'Unlimited data',
                    '2 Static IPs',
                    'Managed firewall',
                    '4-hour response SLA',
                    'Free installation',
                    'Cloud services ready',
                  ],
                  popular: true,
                },
                {
                  title: 'Business Enterprise',
                  speed: '100 Mbps',
                  price: 'KES 24,999/month',
                  features: [
                    'Unlimited data',
                    'Up to 8 Static IPs',
                    'Managed security',
                    '2-hour response SLA',
                    'Redundant connection option',
                    'Dedicated account manager',
                  ],
                },
                {
                  title: 'Dedicated Link',
                  speed: '100 Mbps - 10+ Gbps',
                  price: 'Custom Quote',
                  features: [
                    'Symmetric bandwidth',
                    'BGP multihoming',
                    'Dual redundant paths',
                    '24/7 NOC monitoring',
                    'Custom IP allocation',
                    'Automatic failover',
                  ],
                },
              ].map((plan) => (
                <div
                  key={plan.title}
                  className={`p-6 rounded-xl border-2 ${
                    plan.popular
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 bg-card/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-2xl font-bold text-foreground">
                        {plan.title}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary">{plan.speed}</span>
                        {plan.price !== 'Custom Quote' && (
                          <span className="text-muted-foreground">- {plan.price}</span>
                        )}
                      </div>
                    </div>
                    {plan.popular && (
                      <span className="mt-2 sm:mt-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <Zap className="h-4 w-4" />
                        Most Popular
                      </span>
                    )}
                  </div>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Coverage & Infrastructure */}
        <div className="mb-16 print:mb-8 print:page-break-inside-avoid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="font-heading text-4xl font-bold text-foreground mb-6">
              Coverage & Infrastructure
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                <MapPin className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  {stats.townsCovered}+ Towns Across Kenya
                </h3>
                <p className="text-muted-foreground mb-4">
                  We're expanding rapidly across Kenya. From Nairobi to Mombasa, Nyeri to Kisumu,
                  we're bringing reliable fiber connectivity to businesses nationwide.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Fiber-to-the-Business (FTTB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Wireless backup options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Rapid expansion program</span>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-xl border border-border/50 bg-card/50">
                <Server className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  Enterprise-Grade Network
                </h3>
                <p className="text-muted-foreground mb-4">
                  Our infrastructure is built for reliability and performance. Multiple upstream
                  providers, redundant paths, and 24/7 monitoring ensure your business stays
                  connected.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Multiple upstream providers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Redundant core network</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>24/7 NOC monitoring</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Use Cases */}
        <div className="mb-16 print:mb-8 print:page-break-inside-avoid">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <h2 className="font-heading text-4xl font-bold text-foreground mb-6">
              Perfect For
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: Building2,
                  title: 'SMEs & Retail',
                  description:
                    'POS systems, inventory management, and customer WiFi. Reliable connectivity for day-to-day operations.',
                },
                {
                  icon: Server,
                  title: 'IT Companies',
                  description:
                    'Cloud services, remote teams, and data backups. High-speed symmetric bandwidth for tech businesses.',
                },
                {
                  icon: Globe,
                  title: 'E-commerce',
                  description:
                    'Online stores, payment gateways, and inventory sync. Low latency for real-time transactions.',
                },
                {
                  icon: Zap,
                  title: 'Gaming Lounges',
                  description:
                    'Ultra-low latency for competitive gaming. Multiple connections for peak hours.',
                },
                {
                  icon: TrendingUp,
                  title: 'Financial Services',
                  description:
                    'Banking, forex trading, and fintech. Redundant connections and SLA guarantees.',
                },
                {
                  icon: Shield,
                  title: 'Healthcare',
                  description:
                    'Telemedicine, patient records, and medical imaging. HIPAA-ready secure connectivity.',
                },
              ].map((useCase) => (
                <div
                  key={useCase.title}
                  className="p-6 rounded-xl border border-border/50 bg-card/50 text-center"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                    <useCase.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Contact & CTA */}
        <div className="mb-16 print:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-gradient-to-br from-primary via-primary/90 to-accent rounded-3xl p-12 sm:p-16 text-center text-white print:rounded-none print:p-8"
          >
            <h2 className="font-heading text-4xl font-bold mb-4">
              Ready to Transform Your Business Connectivity?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Let's discuss how Iconic Fibre can power your business operations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Schedule a Call
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Request Quote
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto pt-8 border-t border-white/20">
              <div>
                <Phone className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Call Us</div>
                <div className="text-sm opacity-90">+254746089137</div>
              </div>
              <div>
                <Mail className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Email Us</div>
                <div className="text-sm opacity-90">info@3iconic.co.ke</div>
              </div>
              <div>
                <Globe className="h-6 w-6 mx-auto mb-2" />
                <div className="font-semibold">Visit Us</div>
                <div className="text-sm opacity-90">www.3iconic.co.ke</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-muted-foreground print:text-xs">
          <p className="mb-2">
            © {new Date().getFullYear()} Iconic Fibre. All rights reserved.
          </p>
          <p>
            This brochure is for informational purposes. Pricing and availability subject to
            change. Contact us for current rates and coverage in your area.
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            background: white;
          }
          .print\\:page-break-after-always {
            page-break-after: always;
          }
          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
          }
          .print\\:mb-8 {
            margin-bottom: 2rem;
          }
          .print\\:py-4 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .print\\:p-8 {
            padding: 2rem;
          }
          .print\\:rounded-none {
            border-radius: 0;
          }
          .print\\:hidden {
            display: none;
          }
          .print\\:block {
            display: block;
          }
        }
      `}</style>
    </div>
  )
}

