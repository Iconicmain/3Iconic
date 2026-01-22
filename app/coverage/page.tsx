'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { kenyaTowns, counties } from '@/lib/isp-data'

export default function CoveragePage() {
  const [search, setSearch] = useState('')
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredTowns = kenyaTowns.filter((town) => {
    const matchesSearch = town.name.toLowerCase().includes(search.toLowerCase()) ||
      town.county.toLowerCase().includes(search.toLowerCase())
    const matchesCounty = !selectedCounty || town.county === selectedCounty
    const matchesStatus = statusFilter === 'all' || town.status === statusFilter
    return matchesSearch && matchesCounty && matchesStatus
  })

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
              Coverage Across Kenya
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Fiber and wireless connectivity in 27+ towns and expanding
            </p>
          </motion.div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {/* Left Panel: Search & Filters */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-6"
            >
              <GlassCard className="p-6" gradient>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground">Find Your Area</h2>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search town or county..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-foreground">Status</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                        statusFilter === 'all'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      All Areas
                    </button>
                    <button
                      onClick={() => setStatusFilter('available')}
                      className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                        statusFilter === 'available'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Available Now
                    </button>
                    <button
                      onClick={() => setStatusFilter('expanding')}
                      className={`flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all ${
                        statusFilter === 'expanding'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 hover:border-primary/30'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Expanding Soon
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Request Coverage CTA */}
              <GlassCard className="p-6" gradient>
                <AlertCircle className="h-10 w-10 text-primary" />
                <h3 className="mt-4 font-heading text-lg font-bold text-foreground">
                  Don't see your area?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Register your interest and we'll notify you when Iconic Fibre arrives.
                </p>
                <Button className="mt-4 w-full font-semibold">Request Coverage</Button>
              </GlassCard>
            </motion.div>

            {/* Right Panel: Map & List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="lg:col-span-2"
            >
              {/* Map Visual */}
              <GlassCard className="mb-6 p-6" gradient>
                <div className="relative h-80 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                  {/* Abstract Kenya Map */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-full w-full">
                      {/* Legend */}
                      <div className="absolute left-4 top-4 z-10 space-y-2 rounded-lg border border-border/50 bg-background/80 p-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-3 w-3 rounded-full bg-primary"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-3 w-3 rounded-full bg-accent"></div>
                          <span>Expanding</span>
                        </div>
                      </div>

                      {/* Central Content */}
                      <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.6 }}
                          className="relative rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-accent/20 p-10 backdrop-blur-md border-2 border-primary/40 shadow-lg"
                        >
                          {/* Central Icon/Logo */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                              className="absolute h-16 w-16 rounded-full border-2 border-primary/50"
                            >
                              <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"></div>
                            </motion.div>
                          </div>
                          
                          <div className="relative z-10">
                            <div className="font-heading text-4xl font-bold text-primary mb-1">27+</div>
                            <div className="text-sm font-semibold text-foreground">Towns Covered</div>
                            <div className="mt-2 text-xs text-muted-foreground">Across Kenya</div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Connection Lines - Curved paths connecting to center */}
                      <svg className="absolute inset-0 z-0 w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                        {kenyaTowns.slice(0, 8).map((town, i) => {
                          const angle = (i / 8) * Math.PI * 2
                          const radius = 120
                          const centerX = 50
                          const centerY = 50
                          const startX = centerX + Math.cos(angle) * (radius / 100) * 30
                          const startY = centerY + Math.sin(angle) * (radius / 100) * 30
                          const endX = centerX
                          const endY = centerY
                          const controlX = centerX + Math.cos(angle) * (radius / 100) * 15
                          const controlY = centerY + Math.sin(angle) * (radius / 100) * 15
                          
                          return (
                            <motion.path
                              key={town.name}
                              d={`M ${startX}% ${startY}% Q ${controlX}% ${controlY}% ${endX}% ${endY}%`}
                              stroke={town.status === 'available' ? '#0B6B3A' : '#22C55E'}
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray="5 5"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 0.4 }}
                              transition={{ duration: 2, delay: i * 0.15, ease: "easeOut" }}
                            />
                          )
                        })}
                      </svg>

                      {/* Concentric Circles */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute h-32 w-32 rounded-full border-2 border-dashed border-primary/30 -translate-x-1/2 -translate-y-1/2"
                        ></motion.div>
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute h-48 w-48 rounded-full border-2 border-dashed border-primary/20 -translate-x-1/2 -translate-y-1/2"
                        ></motion.div>
                      </div>

                      {/* Map Pins */}
                      {kenyaTowns.slice(0, 15).map((town, i) => (
                        <motion.div
                          key={town.name}
                          animate={{
                            y: [0, -5, 0],
                          }}
                          transition={{
                            duration: 2 + i * 0.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="absolute z-10"
                          style={{
                            top: `${20 + Math.sin(i) * 30}%`,
                            left: `${25 + Math.cos(i) * 35}%`,
                          }}
                        >
                          <div
                            className={`group relative h-4 w-4 cursor-pointer rounded-full ${
                              town.status === 'available' ? 'bg-primary' : 'bg-accent'
                            } shadow-lg`}
                          >
                            <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background group-hover:block">
                              {town.name}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Towns List */}
              <GlassCard className="p-6" gradient>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
                  {filteredTowns.length} Location{filteredTowns.length !== 1 ? 's' : ''} Found
                </h2>
                <div className="max-h-[600px] space-y-3 overflow-y-auto">
                  {filteredTowns.map((town) => (
                    <div
                      key={town.name}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-full p-2 ${
                            town.status === 'available' ? 'bg-primary/10' : 'bg-accent/10'
                          }`}
                        >
                          {town.status === 'available' ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Clock className="h-5 w-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{town.name}</div>
                          <div className="text-sm text-muted-foreground">{town.county} County</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={town.status === 'available' ? 'default' : 'secondary'}>
                          {town.status === 'available' ? 'Available' : 'Expanding'}
                        </Badge>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Install: {town.installDays} days
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Expansion Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Expansion Roadmap
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                We're constantly expanding to new areas
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {counties.filter((c) => c.status === 'expanding').map((county, index) => (
                <motion.div
                  key={county.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="p-6" gradient hover>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-foreground">{county.name}</h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          {county.coverage}% coverage planned
                        </div>
                      </div>
                      <Badge variant="secondary">Q2 2026</Badge>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${county.coverage}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        className="h-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

