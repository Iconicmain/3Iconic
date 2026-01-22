'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  CreditCard,
  Wrench,
  Wifi,
  Router,
  MapPin,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { faqs } from '@/lib/isp-data'

const categories = [
  { icon: CreditCard, title: 'Billing & Payments', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Wrench, title: 'Installation', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Wifi, title: 'Speed Issues', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: Router, title: 'Router Setup', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: MapPin, title: 'Coverage', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: MessageSquare, title: 'General Support', color: 'text-teal-500', bg: 'bg-teal-500/10' },
]

export default function SupportPage() {
  const [search, setSearch] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [networkStatus] = useState<'operational' | 'degraded' | 'outage'>('operational')

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Network Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard
              className={`mb-8 p-4 ${
                networkStatus === 'operational'
                  ? 'border-primary/30 bg-primary/5'
                  : networkStatus === 'degraded'
                    ? 'border-orange-500/30 bg-orange-500/5'
                    : 'border-red-500/30 bg-red-500/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {networkStatus === 'operational' ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <div className="font-semibold">Network Status</div>
                    <div className="text-sm text-muted-foreground">
                      {networkStatus === 'operational'
                        ? 'All systems operational'
                        : networkStatus === 'degraded'
                          ? 'Some areas experiencing slowdowns'
                          : 'Service outage in progress'}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={networkStatus === 'operational' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {networkStatus}
                </Badge>
              </div>
            </GlassCard>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              How can we help?
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              Search for answers or browse categories below
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mx-auto mt-8 max-w-2xl"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-14 pl-12 text-lg"
              />
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-12"
          >
            <h2 className="mb-6 text-center font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Browse by Category
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05, duration: 0.6 }}
                >
                  <GlassCard className="p-6 transition-all hover:scale-105" hover gradient>
                    <div className={`mb-3 inline-flex rounded-xl ${category.bg} p-3`}>
                      <category.icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{category.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Find answers and guides</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="mx-auto mt-10 max-w-3xl space-y-4">
              {filteredFaqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                >
                  <GlassCard className="overflow-hidden" gradient>
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-primary/5"
                    >
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs">
                          {faq.category}
                        </Badge>
                        <h3 className="font-semibold text-foreground">{faq.question}</h3>
                      </div>
                      {expandedFaq === index ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50 px-6 pb-6 pt-4"
                      >
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </motion.div>
                    )}
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Contact Support CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 text-center lg:p-12" gradient>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Still need help?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our support team is available 24/7 to assist you
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="font-semibold">
                  Open a Ticket
                </Button>
                <Button size="lg" variant="outline" className="font-semibold">
                  Call Support
                </Button>
                <Button size="lg" variant="outline" className="font-semibold">
                  WhatsApp Us
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

