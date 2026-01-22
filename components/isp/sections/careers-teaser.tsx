'use client'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Users, TrendingUp, Heart } from 'lucide-react'
import Link from 'next/link'

export function CareersTeaser() {
  return (
    <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <GlassCard className="relative overflow-hidden p-8 lg:p-12" gradient>
            <div className="relative z-10">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                    Join the team building
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {' '}Kenya's connectivity
                    </span>
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    We're hiring field technicians, engineers, and support heroes across Kenya.
                  </p>
                  <Button asChild size="lg" className="mt-6 font-semibold">
                    <Link href="/careers">View Open Positions</Link>
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start gap-4 rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Great Team</div>
                      <div className="text-sm text-muted-foreground">
                        Work with passionate people solving real problems
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Career Growth</div>
                      <div className="text-sm text-muted-foreground">
                        Training, certifications, and clear advancement paths
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-xl border border-border/50 bg-background/50 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Heart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">Competitive Benefits</div>
                      <div className="text-sm text-muted-foreground">
                        Health coverage, equipment, and performance bonuses
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative gradient */}
            <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />
          </GlassCard>
        </motion.div>
      </div>
    </section>
  )
}

