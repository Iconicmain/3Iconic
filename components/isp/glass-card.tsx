'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  gradient?: boolean
}

export function GlassCard({ children, className, hover = false, gradient = false }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-xl',
        gradient
          ? 'bg-gradient-to-br from-white/10 to-white/5'
          : 'bg-white/8',
        'shadow-xl shadow-black/5',
        hover && 'transition-shadow hover:shadow-2xl hover:shadow-primary/10',
        className
      )}
    >
      {gradient && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

