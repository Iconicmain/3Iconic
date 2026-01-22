'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { kenyaTowns } from '@/lib/isp-data'
import { Badge } from '@/components/ui/badge'

export function CoverageFinderSection() {
  const [search, setSearch] = useState('')
  const [selectedTown, setSelectedTown] = useState<typeof kenyaTowns[0] | null>(null)

  const filteredTowns = kenyaTowns.filter((town) =>
    town.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Check Your Coverage
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See if Iconic Fibre is available in your area
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-10"
        >
          <GlassCard className="p-6 sm:p-8" gradient>
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your town (e.g., Nyeri, Nakuru, Thika...)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedTown(null)
                }}
                className="h-14 pl-12 text-lg"
              />
            </div>

            {/* Suggestions */}
            {search && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/50 bg-background/50 p-4"
              >
                {filteredTowns.length > 0 ? (
                  filteredTowns.map((town) => (
                    <button
                      key={town.name}
                      onClick={() => {
                        setSelectedTown(town)
                        setSearch(town.name)
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent p-3 text-left transition-colors hover:border-primary/20 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">{town.name}</div>
                          <div className="text-sm text-muted-foreground">{town.county} County</div>
                        </div>
                      </div>
                      <Badge
                        variant={town.status === 'available' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {town.status}
                      </Badge>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    <p>No towns found. Try another search.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Selected Result */}
            {selectedTown && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedTown.status === 'available' ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Clock className="h-6 w-6 text-accent" />
                      )}
                      <h3 className="font-heading text-xl font-bold">
                        {selectedTown.status === 'available'
                          ? '✅ Available in ' + selectedTown.name
                          : '🚧 Expanding to ' + selectedTown.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {selectedTown.status === 'available'
                        ? `We can typically install within ${selectedTown.installDays} business days.`
                        : 'We\'re working hard to bring Iconic Fibre to your area. Register your interest below.'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button size="lg" className="font-semibold">
                    {selectedTown.status === 'available' ? 'Get Connected' : 'Register Interest'}
                  </Button>
                  <Button size="lg" variant="outline" className="font-semibold">
                    View Plans
                  </Button>
                </div>
              </motion.div>
            )}
          </GlassCard>

          {/* Popular Towns Quick Links */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {kenyaTowns.slice(0, 6).map((town) => (
              <button
                key={town.name}
                onClick={() => {
                  setSelectedTown(town)
                  setSearch(town.name)
                }}
                className="rounded-full border border-border/50 bg-background/50 px-3 py-1 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                {town.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

