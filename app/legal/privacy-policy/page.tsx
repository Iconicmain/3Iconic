'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'

const sections = [
  {
    title: 'Information We Collect',
    content:
      'We collect information you provide directly to us, such as when you sign up for service, contact support, or use our website. This includes your name, email address, phone number, physical address, and payment information.',
  },
  {
    title: 'How We Use Your Information',
    content:
      'We use the information we collect to provide, maintain, and improve our services; process your transactions; send you technical notices and support messages; respond to your comments and questions; and communicate with you about products, services, and events.',
  },
  {
    title: 'Information Sharing',
    content:
      'We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who perform services on our behalf, or when required by law.',
  },
  {
    title: 'Data Security',
    content:
      'We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.',
  },
  {
    title: 'Your Rights',
    content:
      'You have the right to access, update, or delete your personal information. You may also opt-out of receiving promotional communications from us at any time.',
  },
  {
    title: 'Contact Us',
    content:
      'If you have any questions about this Privacy Policy, please contact us at info@3iconic.co.ke or call +254746089137.',
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl">Privacy Policy</h1>
            <p className="mt-4 text-muted-foreground">Last updated: January 22, 2026</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-12"
          >
            <GlassCard className="p-8 lg:p-12" gradient>
              <div className="prose prose-lg max-w-none">
                <p className="text-muted-foreground">
                  Iconic Fibre ("we," "our," or "us") is committed to protecting your privacy. This Privacy
                  Policy explains how we collect, use, disclose, and safeguard your information when you use our
                  internet services.
                </p>

                <div className="mt-8 space-y-8">
                  {sections.map((section, index) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                    >
                      <h2 className="font-heading text-2xl font-bold text-foreground">{section.title}</h2>
                      <p className="mt-3 text-muted-foreground">{section.content}</p>
                    </motion.div>
                  ))}
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

