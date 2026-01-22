'use client'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/isp/glass-card'
import { Server, Shield, Activity, Clock } from 'lucide-react'

const metrics = [
  {
    icon: Server,
    label: 'Redundancy',
    value: '99.9%',
    description: 'Dual path routing for critical connections',
  },
  {
    icon: Shield,
    label: 'DDoS Protection',
    value: '24/7',
    description: 'Enterprise-grade threat monitoring',
  },
  {
    icon: Activity,
    label: 'NOC Monitoring',
    value: 'Real-time',
    description: 'Proactive issue detection and resolution',
  },
  {
    icon: Clock,
    label: 'SLA Guarantee',
    value: '99.7%',
    description: 'Uptime commitment with credit protection',
  },
]

export function InfrastructureSection() {
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
            Enterprise Infrastructure
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Built on redundant fiber backbone and monitored 24/7
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <GlassCard className="h-full p-6 text-center" gradient hover>
                <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
                  <metric.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="font-heading text-3xl font-bold text-foreground">{metric.value}</div>
                <div className="mt-2 font-semibold text-foreground">{metric.label}</div>
                <p className="mt-2 text-sm text-muted-foreground">{metric.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

