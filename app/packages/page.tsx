'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Info } from 'lucide-react'
import { homePlans, businessPlans, dedicatedPlans, addOns } from '@/lib/isp-data'

const filters = [
  { id: 'all', label: 'All Plans' },
  { id: 'streaming', label: 'Best for Streaming' },
  { id: 'gaming', label: 'Best for Gaming' },
  { id: 'sme', label: 'Best for SMEs' },
]

export default function PackagesPage() {
  const [planType, setPlanType] = useState<'home' | 'business' | 'dedicated'>('home')
  const [filter, setFilter] = useState('all')

  const currentPlans = planType === 'home' ? homePlans : planType === 'business' ? businessPlans : dedicatedPlans

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              No hidden fees. No data caps. No surprises.
            </p>
          </motion.div>

          {/* Plan Type Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mt-10 flex justify-center"
          >
            <div className="inline-flex rounded-full border border-border/50 bg-muted/30 p-1">
              <button
                onClick={() => setPlanType('home')}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  planType === 'home'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setPlanType('business')}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  planType === 'business'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => setPlanType('dedicated')}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
                  planType === 'dedicated'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dedicated
              </button>
            </div>
          </motion.div>

          {/* Filters */}
          {planType !== 'dedicated' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-6 flex flex-wrap justify-center gap-2"
            >
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    filter === f.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Plans Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {currentPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                className="relative"
              >
                <GlassCard
                  className={`relative h-full p-6 ${
                    'popular' in plan && plan.popular ? 'ring-2 ring-primary shadow-2xl shadow-primary/20' : ''
                  }`}
                  gradient
                  hover
                >
                  {'popular' in plan && plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent">
                      <Zap className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  )}

                  <div className="mb-4">
                    <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                    {'sla' in plan && (
                      <div className="mt-2 flex items-center gap-1 text-sm text-primary">
                        <Info className="h-4 w-4" />
                        {plan.sla}
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="font-heading text-4xl font-bold text-foreground">{plan.speed}</div>
                    {'bandwidth' in plan && (
                      <div className="mt-1 text-sm text-muted-foreground">{plan.bandwidth}</div>
                    )}
                    <div className="mt-3 flex items-baseline gap-1">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-2xl font-bold text-foreground">
                            KES {plan.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                      )}
                    </div>
                  </div>

                  <ul className="mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full font-semibold"
                    variant={'popular' in plan && plan.popular ? 'default' : 'outline'}
                  >
                    {typeof plan.price === 'number' ? 'Get Started' : 'Contact Sales'}
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          {/* Add-ons Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Enhance Your Connection
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Optional add-ons to get more from your internet
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {addOns.map((addon, index) => (
                <motion.div
                  key={addon.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <h3 className="font-heading text-lg font-bold text-foreground">{addon.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">
                        KES {addon.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{addon.description}</p>
                    <Button variant="outline" className="mt-4 w-full font-semibold">
                      Add to Plan
                    </Button>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 lg:p-12" gradient>
              <h2 className="text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
                Questions about pricing?
              </h2>
              <p className="mt-2 text-center text-muted-foreground">
                All plans include unlimited data, no throttling, and 24/7 support. Need help choosing?
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/contact">
                  <Button size="lg" className="font-semibold w-full sm:w-auto">
                    Talk to Sales
                  </Button>
                </Link>
                <Link href="/support">
                  <Button size="lg" variant="outline" className="font-semibold w-full sm:w-auto">
                    View FAQ
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

