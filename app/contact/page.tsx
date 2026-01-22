'use client'

import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react'

const contactMethods = [
  {
    icon: Phone,
    title: 'Call Us',
    value: '0700 123 456',
    description: 'Available 24/7',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    value: '+254 700 123 456',
    description: 'Chat anytime',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'hello@iconicfibre.co.ke',
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
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
              >
                <GlassCard className="h-full p-6 text-center" gradient hover>
                  <div className={`mx-auto mb-4 inline-flex rounded-xl ${method.bg} p-3`}>
                    <method.icon className={`h-6 w-6 ${method.color}`} />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground">{method.title}</h3>
                  <div className="mt-2 font-semibold text-primary">{method.value}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
                </GlassCard>
              </motion.div>
            ))}
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
                <form className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input placeholder="First Name" />
                    <Input placeholder="Last Name" />
                  </div>
                  <Input type="email" placeholder="Email Address" />
                  <Input placeholder="Phone Number" />
                  <Input placeholder="Subject" />
                  <Textarea placeholder="Your message..." rows={5} />
                  <Button size="lg" className="w-full font-semibold">
                    Send Message
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

