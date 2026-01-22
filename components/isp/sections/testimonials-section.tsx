'use client'

import { motion } from 'framer-motion'
import { GlassCard } from '@/components/isp/glass-card'
import { Quote, Star, MapPin } from 'lucide-react'
import { testimonials } from '@/lib/isp-data'
import Image from 'next/image'

export function TestimonialsSection() {
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
            Trusted by Kenyans
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real stories from real customers across Kenya
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <GlassCard className="group relative h-full overflow-hidden p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10" gradient hover>
                {/* Quote Icon */}
                <div className="absolute right-4 top-4 opacity-10 transition-opacity group-hover:opacity-20">
                  <Quote className="h-16 w-16 text-primary" />
                </div>

                {/* Stars Rating */}
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="relative z-10 mb-6 text-base leading-relaxed text-foreground">
                  "{testimonial.content}"
                </p>

                {/* Author Info */}
                <div className="relative z-10 flex items-center gap-4 border-t border-border/50 pt-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/20">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-heading text-base font-bold text-foreground">
                      {testimonial.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {testimonial.role}
                    </div>
                  </div>
                </div>

                {/* Decorative gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 transition-all duration-300 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-accent/5" />
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-6 py-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <span className="ml-2 text-sm font-medium text-foreground">4.9/5</span>
            <span className="text-sm text-muted-foreground">from 500+ reviews</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
