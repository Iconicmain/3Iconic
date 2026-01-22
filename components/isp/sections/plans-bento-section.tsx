'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap } from 'lucide-react'
import { homePlans, businessPlans } from '@/lib/isp-data'

export function PlansBentoSection() {
  const [planType, setPlanType] = useState<'home' | 'business'>('home')
  const plans = planType === 'home' ? homePlans : businessPlans

  // Define gradient backgrounds for each card
  const cardBackgrounds = [
    'bg-gradient-to-br from-emerald-50 to-teal-50',
    'bg-gradient-to-br from-green-50 to-emerald-100',
    'bg-gradient-to-br from-teal-50 to-cyan-50',
    'bg-gradient-to-br from-lime-50 to-green-50',
  ]

  return (
    <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Plans Built for Kenya
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No hidden fees. No data caps. Just reliable internet.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="mt-8 flex justify-center"
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
          </div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
              className="relative"
            >
              <GlassCard
                className={`relative h-full p-6 ${cardBackgrounds[index % cardBackgrounds.length]} ${
                  plan.popular ? 'ring-2 ring-primary shadow-2xl shadow-primary/20 !from-emerald-100 !to-green-100' : ''
                }`}
                gradient
                hover
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent">
                    <Zap className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                )}

                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <div className="font-heading text-4xl font-bold text-foreground">{plan.speed}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">KES {plan.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
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

                <Button className="w-full font-semibold" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-8 text-center"
        >
          <Button variant="link" size="lg" className="font-semibold">
            View All Plans & Pricing →
          </Button>
        </motion.div>
      </div>
    </section>
  )
}

