'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'

const sections = [
  {
    title: 'Acceptance of Terms',
    content:
      'By accessing or using Iconic Fibre services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.',
  },
  {
    title: 'Service Description',
    content:
      'Iconic Fibre provides internet connectivity services including fiber and wireless broadband. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time.',
  },
  {
    title: 'Acceptable Use Policy',
    content:
      'You agree not to use our services for any unlawful purpose, to transmit spam or malicious content, to interfere with network operations, or to engage in any activity that could harm our infrastructure or other users.',
  },
  {
    title: 'Service Level Agreement',
    content:
      'We commit to maintaining 99.7% uptime for standard plans and 99.9% for business plans. In the event of service degradation, we will provide service credits as outlined in your service agreement.',
  },
  {
    title: 'Payment Terms',
    content:
      'Services are billed monthly in advance. Payment is due on the date specified in your invoice. Failure to pay may result in service suspension or termination. We accept M-Pesa, bank transfer, and card payments.',
  },
  {
    title: 'Termination',
    content:
      'You may terminate your service at any time with 30 days notice. We reserve the right to terminate or suspend service for violation of these terms or non-payment.',
  },
  {
    title: 'Limitation of Liability',
    content:
      'Iconic Fibre shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use our services.',
  },
]

export default function TermsOfServicePage() {
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
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl">Terms of Service</h1>
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
                  These Terms of Service ("Terms") govern your use of Iconic Fibre's internet services.
                  Please read them carefully.
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

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6"
                >
                  <h3 className="font-heading text-xl font-bold text-foreground">Questions?</h3>
                  <p className="mt-2 text-muted-foreground">
                    If you have any questions about these Terms, please contact us at info@3iconic.co.ke or
                    call +254746089137.
                  </p>
                </motion.div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

