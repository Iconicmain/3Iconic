'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Clock, HeadsetIcon, TrendingUp, Building2, Server } from 'lucide-react'
import { caseStudies } from '@/lib/isp-data'

const slaFeatures = [
  {
    icon: Shield,
    title: '99.9% Uptime SLA',
    description: 'Guaranteed uptime with automatic credits if we fall short',
  },
  {
    icon: Clock,
    title: '2-Hour Response',
    description: 'Priority support with guaranteed response times',
  },
  {
    icon: HeadsetIcon,
    title: 'Dedicated Account Manager',
    description: 'Single point of contact for all your needs',
  },
  {
    icon: Server,
    title: 'Managed Infrastructure',
    description: 'Optional managed firewall, security, and monitoring',
  },
]

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" />
              Enterprise Solutions
            </div>
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              Connectivity Built for
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {' '}Serious Work
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Dedicated links, SLA guarantees, and enterprise-grade support for Kenyan businesses
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="font-semibold">
                Talk to Sales
              </Button>
              <Button size="lg" variant="outline" className="font-semibold">
                View Business Plans
              </Button>
            </div>
          </motion.div>

          {/* SLA Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Enterprise-Grade Reliability
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                SLAs that actually mean something
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {slaFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dedicated Link CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 lg:p-12" gradient>
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                    Need a Dedicated Link?
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Symmetric bandwidth, BGP routing, and redundant paths for mission-critical operations.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>100 Mbps to 10+ Gbps symmetric bandwidth</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>Custom IP allocation and BGP multihoming</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>Dual redundant paths with automatic failover</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>24/7 dedicated NOC monitoring</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/50 p-6">
                  <h3 className="mb-4 font-heading text-xl font-bold">Get a Custom Quote</h3>
                  <form className="space-y-4">
                    <Input placeholder="Company Name" />
                    <Input type="email" placeholder="Email Address" />
                    <Input placeholder="Phone Number" />
                    <Textarea placeholder="Tell us about your requirements..." rows={4} />
                    <Button className="w-full font-semibold">Request Quote</Button>
                  </form>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Case Studies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Trusted by Leading Businesses
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real results from real companies
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {caseStudies.map((study, index) => (
                <motion.div
                  key={study.company}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <TrendingUp className="h-4 w-4" />
                      {study.industry}
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">{study.company}</h3>
                    
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">Challenge</div>
                        <p className="text-muted-foreground">{study.challenge}</p>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Solution</div>
                        <p className="text-muted-foreground">{study.solution}</p>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="font-semibold text-primary">Result</div>
                        <p className="text-foreground">{study.result}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Talk to Sales CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 text-center lg:p-12" gradient>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Ready to Upgrade Your Business Internet?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Speak with our enterprise team to design the perfect solution
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="font-semibold">
                  Schedule a Call
                </Button>
                <Button size="lg" variant="outline" className="font-semibold">
                  Download Brochure
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

