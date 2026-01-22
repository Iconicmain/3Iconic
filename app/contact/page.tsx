'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    value: '+254746089137',
    description: 'Available 24/7',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    value: '+254746089137',
    description: 'Chat anytime',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'info@3iconic.co.ke',
    description: 'Response within 2 hours',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
]

const offices = [
  {
    name: 'Nyeri Headquarters',
    address: 'Kimathi Way, Nyeri Town',
    hours: 'Mon-Fri: 8am-6pm, Sat: 9am-2pm',
  },
  {
    name: 'Nakuru Office',
    address: 'Kenyatta Avenue, Nakuru',
    hours: 'Mon-Fri: 8am-6pm, Sat: 9am-2pm',
  },
  {
    name: 'Thika Office',
    address: 'Commercial Street, Thika',
    hours: 'Mon-Fri: 8am-6pm',
  },
]

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      toast.error('Please fill in all fields')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      toast.success('Message sent successfully! We\'ll get back to you soon.')
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

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
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              We're here to help. Reach out anytime.
            </p>
          </motion.div>

          {/* Contact Methods */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mt-12 grid gap-6 sm:grid-cols-3"
          >
            {contactMethods.map((method, index) => {
              const getLink = () => {
                if (method.title === 'Call Us') {
                  return `tel:+254746089137`
                }
                if (method.title === 'WhatsApp') {
                  return `https://wa.me/254746089137`
                }
                if (method.title === 'Email') {
                  return `mailto:info@3iconic.co.ke`
                }
                return '#'
              }

              return (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                >
                  <a href={getLink()} target={method.title === 'WhatsApp' ? '_blank' : '_self'} rel={method.title === 'WhatsApp' ? 'noopener noreferrer' : undefined}>
                    <GlassCard className="h-full p-6 text-center cursor-pointer" gradient hover>
                      <div className={`mx-auto mb-4 inline-flex rounded-xl ${method.bg} p-3`}>
                        <method.icon className={`h-6 w-6 ${method.color}`} />
                      </div>
                      <h3 className="font-heading text-lg font-bold text-foreground">{method.title}</h3>
                      <div className="mt-2 font-semibold text-primary">{method.value}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
                    </GlassCard>
                  </a>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Main Content: Form + Info */}
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <GlassCard className="p-8" gradient>
                <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    required
                  />
                  <Textarea
                    placeholder="Your message..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    required
                  />
                  <Button type="submit" size="lg" className="w-full font-semibold" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </GlassCard>
            </motion.div>

            {/* Offices */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="font-heading text-2xl font-bold text-foreground">Our Offices</h2>
              {offices.map((office, index) => (
                <GlassCard key={office.name} className="p-6" gradient hover>
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">{office.name}</h3>
                      <p className="mt-1 text-muted-foreground">{office.address}</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {office.hours}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}

              {/* Map Placeholder */}
              <GlassCard className="p-6" gradient>
                <div className="h-64 overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <MapPin className="mx-auto h-12 w-12 text-primary" />
                      <p className="mt-2 text-sm text-muted-foreground">Interactive map</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

