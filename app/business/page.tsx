'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Clock, HeadsetIcon, TrendingUp, Building2, Server } from 'lucide-react'
import { caseStudies } from '@/lib/isp-data'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const slaFeatures = [
  {
    icon: Shield,
    title: '99.9% Uptime SLA',
    description: 'Guaranteed uptime with automatic credits if we fall short',
  },
  {
    icon: Clock,
    title: '2-Hour Response',
    description: 'Priority support with guaranteed response times',
  },
  {
    icon: HeadsetIcon,
    title: 'Dedicated Account Manager',
    description: 'Single point of contact for all your needs',
  },
  {
    icon: Server,
    title: 'Managed Infrastructure',
    description: 'Optional managed firewall, security, and monitoring',
  },
]

export default function BusinessPage() {
  const [quoteData, setQuoteData] = useState({
    companyName: '',
    email: '',
    phone: '',
    requirements: '',
  })
  const [loading, setLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleData, setScheduleData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    preferredDate: '',
    preferredTime: '',
    message: '',
  })
  const [scheduleLoading, setScheduleLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setQuoteData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!quoteData.companyName || !quoteData.email || !quoteData.phone || !quoteData.requirements) {
      toast.error('Please fill in all fields')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quoteData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/business/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit quote request')
      }

      toast.success('Quote request submitted! Our team will contact you soon.')
      
      // Reset form
      setQuoteData({
        companyName: '',
        email: '',
        phone: '',
        requirements: '',
      })
    } catch (error) {
      console.error('Error submitting quote request:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit request. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleInputChange = (field: string, value: string) => {
    setScheduleData((prev) => ({ ...prev, [field]: value }))
  }

  const handleScheduleCall = async () => {
    // Validate form
    if (!scheduleData.fullName || !scheduleData.email || !scheduleData.phone) {
      toast.error('Please fill in all required fields')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(scheduleData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setScheduleLoading(true)
    try {
      const response = await fetch('/api/business/schedule-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule call')
      }

      toast.success('Call request submitted! Our team will contact you to schedule.')
      
      // Reset form and close modal
      setScheduleData({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        preferredDate: '',
        preferredTime: '',
        message: '',
      })
      setShowScheduleModal(false)
    } catch (error) {
      console.error('Error scheduling call:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to schedule call. Please try again.'
      )
    } finally {
      setScheduleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Building2 className="h-4 w-4" />
              Enterprise Solutions
            </div>
            <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
              Connectivity Built for
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {' '}Serious Work
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Dedicated links, SLA guarantees, and enterprise-grade support for Kenyan businesses
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="font-semibold"
                onClick={() => setShowScheduleModal(true)}
              >
                Talk to Sales
              </Button>
              <Link href="/packages">
                <Button size="lg" variant="outline" className="font-semibold">
                  View Business Plans
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* SLA Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Enterprise-Grade Reliability
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                SLAs that actually mean something
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {slaFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Dedicated Link CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 lg:p-12" gradient>
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                    Need a Dedicated Link?
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Symmetric bandwidth, BGP routing, and redundant paths for mission-critical operations.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>100 Mbps to 10+ Gbps symmetric bandwidth</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>Custom IP allocation and BGP multihoming</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>Dual redundant paths with automatic failover</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 p-1">
                        <div className="h-full w-full rounded-full bg-primary"></div>
                      </div>
                      <span>24/7 dedicated NOC monitoring</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/50 p-6">
                  <h3 className="mb-4 font-heading text-xl font-bold">Get a Custom Quote</h3>
                  <form onSubmit={handleSubmitQuote} className="space-y-4">
                    <Input
                      placeholder="Company Name"
                      value={quoteData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={quoteData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                    <Input
                      type="tel"
                      placeholder="Phone Number"
                      value={quoteData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                    <Textarea
                      placeholder="Tell us about your requirements..."
                      rows={4}
                      value={quoteData.requirements}
                      onChange={(e) => handleInputChange('requirements', e.target.value)}
                      required
                    />
                    <Button type="submit" className="w-full font-semibold" disabled={loading}>
                      {loading ? 'Submitting...' : 'Request Quote'}
                    </Button>
                  </form>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Case Studies */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center">
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Trusted by Leading Businesses
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real results from real companies
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {caseStudies.map((study, index) => (
                <motion.div
                  key={study.company}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <TrendingUp className="h-4 w-4" />
                      {study.industry}
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">{study.company}</h3>
                    
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">Challenge</div>
                        <p className="text-muted-foreground">{study.challenge}</p>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Solution</div>
                        <p className="text-muted-foreground">{study.solution}</p>
                      </div>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="font-semibold text-primary">Result</div>
                        <p className="text-foreground">{study.result}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Talk to Sales CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24"
          >
            <GlassCard className="p-8 text-center lg:p-12" gradient>
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
                Ready to Upgrade Your Business Internet?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Speak with our enterprise team to design the perfect solution
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg" 
                  className="font-semibold"
                  onClick={() => setShowScheduleModal(true)}
                >
                  Schedule a Call
                </Button>
                <Link href="/business/brochure">
                  <Button size="lg" variant="outline" className="font-semibold">
                    Download Brochure
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </main>

      <Footer />

      {/* Schedule Call Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Schedule a Call</DialogTitle>
            <DialogDescription>
              Let's discuss how Iconic Fibre can transform your business connectivity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleFullName">Full Name *</Label>
              <Input
                id="scheduleFullName"
                value={scheduleData.fullName}
                onChange={(e) => handleScheduleInputChange('fullName', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleCompany">Company Name</Label>
              <Input
                id="scheduleCompany"
                value={scheduleData.companyName}
                onChange={(e) => handleScheduleInputChange('companyName', e.target.value)}
                placeholder="Your Company Ltd"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleEmail">Email Address *</Label>
              <Input
                id="scheduleEmail"
                type="email"
                value={scheduleData.email}
                onChange={(e) => handleScheduleInputChange('email', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedulePhone">Phone Number *</Label>
              <Input
                id="schedulePhone"
                type="tel"
                value={scheduleData.phone}
                onChange={(e) => handleScheduleInputChange('phone', e.target.value)}
                placeholder="+254700000000"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduleDate">Preferred Date</Label>
                <Input
                  id="scheduleDate"
                  type="date"
                  value={scheduleData.preferredDate}
                  onChange={(e) => handleScheduleInputChange('preferredDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduleTime">Preferred Time</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={scheduleData.preferredTime}
                  onChange={(e) => handleScheduleInputChange('preferredTime', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduleMessage">Additional Notes (Optional)</Label>
              <Textarea
                id="scheduleMessage"
                value={scheduleData.message}
                onChange={(e) => handleScheduleInputChange('message', e.target.value)}
                placeholder="Tell us what you'd like to discuss..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
                className="flex-1"
                disabled={scheduleLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleCall}
                className="flex-1"
                disabled={scheduleLoading}
              >
                {scheduleLoading ? 'Submitting...' : 'Request Call'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

