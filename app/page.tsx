'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { HeroSection } from '@/components/isp/sections/hero-section'
import { CoverageFinderSection } from '@/components/isp/sections/coverage-finder-section'
import { PlansBentoSection } from '@/components/isp/sections/plans-bento-section'
import { WhyUsSection } from '@/components/isp/sections/why-us-section'
import { SpeedTestSection } from '@/components/isp/sections/speed-test-section'
import { InfrastructureSection } from '@/components/isp/sections/infrastructure-section'
import { TestimonialsSection } from '@/components/isp/sections/testimonials-section'
import { CareersTeaser } from '@/components/isp/sections/careers-teaser'

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background">
      {/* Ambient gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute -right-1/4 top-1/4 h-[800px] w-[800px] rounded-full bg-accent/20 blur-3xl"
        />
      </div>

      <NavBar />

      <main className="relative">
        <HeroSection />
        <CoverageFinderSection />
        <PlansBentoSection />
        <WhyUsSection />
        <SpeedTestSection />
        <InfrastructureSection />
        <TestimonialsSection />
        <CareersTeaser />
      </main>

      <Footer />
    </div>
  )
}
