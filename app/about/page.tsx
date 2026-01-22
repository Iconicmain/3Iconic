'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Target, Eye, Zap, Users, Heart, TrendingUp } from 'lucide-react'
import { counties } from '@/lib/isp-data'

const values = [
  {
    icon: Zap,
    title: 'Speed Matters',
    description: 'We believe fast internet is a right, not a luxury',
  },
  {
    icon: Users,
    title: 'Kenya First',
    description: 'Built by Kenyans, for Kenyans, solving local challenges',
  },
  {
    icon: Heart,
    title: 'Customer Obsessed',
    description: 'Every decision starts with "how does this help our customers?"',
  },
  {
    icon: TrendingUp,
    title: 'Always Improving',
    description: 'Continuous investment in infrastructure and innovation',
  },
]

const timeline = [
  { year: '2020', title: 'Founded', description: 'Started with 3 towns in Central Kenya' },
  { year: '2021', title: 'Expansion', description: 'Reached 10 towns, 2,000+ customers' },
  { year: '2022', title: 'Fiber Backbone', description: 'Built redundant fiber infrastructure' },
  { year: '2023', title: 'Business Solutions', description: 'Launched enterprise and dedicated links' },
  { year: '2024', title: 'Regional Growth', description: 'Expanded to Rift Valley and Eastern' },
  { year: '2026', title: 'Today', description: '27+ towns, 15,000+ happy customers' },
]

export default function AboutPage() {
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
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              Connecting Kenya,
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {' '}One Town at a Time
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              We're on a mission to bring fast, reliable internet to every corner of Kenya
            </p>
          </motion.div>

          {/* Mission & Vision */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 grid gap-8 lg:grid-cols-2"
          >
            <GlassCard className="p-8" gradient>
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Our Mission</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                To democratize internet access across Kenya by delivering fiber-speed connectivity at prices
                everyone can afford, without sacrificing quality or service.
              </p>
            </GlassCard>

            <GlassCard className="p-8" gradient>
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Our Vision</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                A Kenya where location doesn't limit opportunity. Where a student in Nyeri has the same internet
                speed as a startup in Nairobi. Where connectivity enables dreams, not restricts them.
              </p>
            </GlassCard>
          </motion.div>

          {/* Values */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <h2 className="mb-8 text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Our Values
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6 text-center" gradient hover>
                    <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-4">
                      <value.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{value.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <h2 className="mb-12 text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Our Journey
            </h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary via-accent to-primary lg:block"></div>

              <div className="space-y-12">
                {timeline.map((item, index) => (
                  <motion.div
                    key={item.year}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    className={`flex items-center gap-8 ${
                      index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                    }`}
                  >
                    <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                      <GlassCard className="inline-block p-6" gradient>
                        <div className="font-heading text-3xl font-bold text-primary">{item.year}</div>
                        <h3 className="mt-2 font-heading text-xl font-bold text-foreground">{item.title}</h3>
                        <p className="mt-2 text-muted-foreground">{item.description}</p>
                      </GlassCard>
                    </div>
                    <div className="hidden h-4 w-4 rounded-full border-4 border-primary bg-background lg:block"></div>
                    <div className="hidden flex-1 lg:block"></div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Footprint */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 lg:p-12" gradient>
              <div className="text-center">
                <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                  Our Footprint
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Serving communities across Kenya
                </p>
              </div>

              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="text-center">
                  <div className="font-heading text-5xl font-bold text-primary">27+</div>
                  <div className="mt-2 text-muted-foreground">Towns Covered</div>
                </div>
                <div className="text-center">
                  <div className="font-heading text-5xl font-bold text-primary">15K+</div>
                  <div className="mt-2 text-muted-foreground">Active Customers</div>
                </div>
                <div className="text-center">
                  <div className="font-heading text-5xl font-bold text-primary">12</div>
                  <div className="mt-2 text-muted-foreground">Counties</div>
                </div>
                <div className="text-center">
                  <div className="font-heading text-5xl font-bold text-primary">99.8%</div>
                  <div className="mt-2 text-muted-foreground">Uptime</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

