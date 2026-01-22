'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/isp/glass-card'
import { Activity, Clock, MapPin, Headset, Wifi, Globe } from 'lucide-react'
import Link from 'next/link'
import { stats } from '@/lib/isp-data'

const statCards = [
  { icon: Activity, label: 'Uptime', value: stats.uptime },
  { icon: Clock, label: 'Avg Latency', value: stats.avgLatency },
  { icon: MapPin, label: 'Towns', value: stats.townsCovered.toString() },
  { icon: Headset, label: 'Support', value: stats.supportResponse },
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-12 sm:pt-24 sm:pb-16 sm:px-6 lg:px-8 lg:pt-32 lg:pb-24">
      {/* Mobile-only subtle background decoration */}
      <div className="absolute inset-0 lg:hidden">
        <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute left-0 top-40 h-48 w-48 rounded-full bg-accent/5 blur-3xl"></div>
      </div>
      
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Network Status: Operational
            </motion.div>

            <h1 className="font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Fast. Reliable.{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kenyan-built
              </span>{' '}
              Internet.
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground">
              Fiber & wireless connectivity for homes and businesses across Kenya. Experience speeds that
              actually deliver.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto font-semibold">
                <Link href="/coverage">Check Coverage</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                <Link href="/packages">View Packages</Link>
              </Button>
            </div>

            {/* Live Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-8 sm:mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
            >
              {statCards.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                >
                  <GlassCard className="p-3 sm:p-4" gradient>
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <div className="mt-1 sm:mt-2 font-heading text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Animated Fiber Wave - Hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative h-[400px] w-full lg:h-[500px]">
              {/* Abstract fiber visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Outer rotating circles */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="h-64 w-64 rounded-full border-2 border-dashed border-primary/30 lg:h-80 lg:w-80"
                />
                <motion.div
                  animate={{
                    rotate: [360, 0],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute h-48 w-48 rounded-full border-2 border-dashed border-accent/30 lg:h-64 lg:w-64"
                />
                
                {/* Central gradient blob */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl lg:h-40 lg:w-40"
                />

                {/* Central Content - WiFi/Global Icon */}
                <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="relative rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-accent/20 p-8 lg:p-10 backdrop-blur-md border-2 border-primary/40 shadow-lg"
                  >
                    {/* Rotating indicator ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="h-20 w-20 lg:h-24 lg:w-24 rounded-full border-2 border-primary/50">
                        <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"></div>
                      </div>
                    </motion.div>
                    
                    {/* WiFi Icon */}
                    <div className="relative z-10 flex items-center justify-center">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          opacity: [0.8, 1, 0.8]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                      >
                        <Wifi className="h-12 w-12 lg:h-16 lg:w-16 text-primary" strokeWidth={2} />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                {/* Connection lines - curved paths */}
                <svg className="absolute inset-0 z-0 w-full h-full" style={{ overflow: 'visible', pointerEvents: 'none' }}>
                  {[...Array(6)].map((_, i) => {
                    const angle = (i / 6) * Math.PI * 2
                    const radius = 100
                    const centerX = 50
                    const centerY = 50
                    const startX = centerX + Math.cos(angle) * (radius / 100) * 25
                    const startY = centerY + Math.sin(angle) * (radius / 100) * 25
                    const endX = centerX
                    const endY = centerY
                    const controlX = centerX + Math.cos(angle) * (radius / 100) * 12
                    const controlY = centerY + Math.sin(angle) * (radius / 100) * 12
                    
                    return (
                      <motion.path
                        key={i}
                        d={`M ${startX}% ${startY}% Q ${controlX}% ${controlY}% ${endX}% ${endY}%`}
                        stroke="#0B6B3A"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5 5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.4 }}
                        transition={{ duration: 2, delay: 0.8 + i * 0.15, ease: "easeOut" }}
                      />
                    )
                  })}
                </svg>
              </div>

              {/* Floating connection dots */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.2,
                  }}
                  className="absolute h-3 w-3 rounded-full bg-primary"
                  style={{
                    top: `${Math.round((20 + Math.sin(i) * 30) * 100) / 100}%`,
                    left: `${Math.round((30 + Math.cos(i) * 35) * 100) / 100}%`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

