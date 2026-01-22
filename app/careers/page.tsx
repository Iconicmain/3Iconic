'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  MapPin,
  TrendingUp,
  Users,
  Clock,
  GraduationCap,
  Award,
  Laptop,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from 'lucide-react'
import { jobs as defaultJobs } from '@/lib/isp-data'

const benefits = [
  {
    icon: Clock,
    title: 'Flexible Hours',
    description: 'Work when you are most productive. Balance life and work your way',
  },
  {
    icon: TrendingUp,
    title: 'Career Growth',
    description: 'Training, certifications, and clear promotion paths',
  },
  {
    icon: GraduationCap,
    title: 'Learning Budget',
    description: 'Annual allowance for courses and conferences',
  },
  {
    icon: Award,
    title: 'Performance Bonuses',
    description: 'Reward your hard work with competitive performance-based bonuses',
  },
  {
    icon: Laptop,
    title: 'Equipment Provided',
    description: 'Latest tools and tech for your role',
  },
  {
    icon: Users,
    title: 'Team Culture',
    description: 'Collaborative, supportive, and inclusive environment',
  },
]

const cultureAspects = [
  {
    title: 'Innovation First',
    description: 'Build new solutions, do not just maintain old ones',
    stat: '40%',
    statLabel: 'time on new projects',
  },
  {
    title: 'Kenya-Centric',
    description: 'Solve problems for Kenya, by Kenyans',
    stat: '100%',
    statLabel: 'local team',
  },
  {
    title: 'Impact Visible',
    description: 'See your work connect real communities',
    stat: '27+',
    statLabel: 'towns served',
  },
  {
    title: 'Fast Growth',
    description: 'Join a company expanding rapidly',
    stat: '3x',
    statLabel: 'growth in 2 years',
  },
]

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  description: string
  requirements: string[]
  benefits: string[]
  status?: 'open' | 'closed'
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [showClosedPositions, setShowClosedPositions] = useState(false)

  useEffect(() => {
    setLoading(true)
    // Fetch jobs from API, fallback to default data
    fetch('/api/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Show all jobs including closed ones
          setJobs(data)
        } else {
          setJobs([])
        }
      })
      .catch(() => {
        // Fallback to default jobs if API fails
        setJobs(defaultJobs)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const departments = ['all', 'Operations', 'Engineering', 'Support', 'Sales']
  
  // Separate open and closed jobs
  const allFilteredJobs = selectedDept === 'all' ? jobs : jobs.filter((j) => j.department === selectedDept)
  const openJobs = allFilteredJobs.filter((j) => j.status !== 'closed')
  const closedJobs = allFilteredJobs.filter((j) => j.status === 'closed')

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative">
        {/* Hero Section */}
        <section className="relative px-4 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16 lg:px-8 lg:pt-32 lg:pb-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Build the Future of
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Connectivity in Kenya
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Join a team connecting homes, businesses, and communities across Kenya. Make an impact that
                matters.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Culture Stats */}
        <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Life at Iconic Fibre</h2>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {cultureAspects.map((aspect, index) => (
                <motion.div
                  key={aspect.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6 text-center" gradient hover>
                    <div className="font-heading text-4xl font-bold text-primary">{aspect.stat}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {aspect.statLabel}
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-bold text-foreground">{aspect.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{aspect.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Benefits & Perks</h2>
              <p className="mt-4 text-lg text-muted-foreground">We take care of our team</p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-6" gradient hover>
                    <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-12 text-center"
            >
              <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">Open Positions</h2>
              <p className="mt-4 text-lg text-muted-foreground">Find your perfect role</p>
            </motion.div>

            {/* Department Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-10 flex flex-wrap justify-center gap-3"
            >
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`rounded-full border px-5 py-2.5 text-sm font-medium capitalize transition-all ${
                    selectedDept === dept
                      ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'border-border/50 bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </motion.div>

            {/* Open Positions */}
            {openJobs.length > 0 && (
              <div className="mb-12">
                <h2 className="mb-6 font-heading text-2xl font-bold text-foreground">Open Positions</h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  {openJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                    >
                      <GlassCard className="group h-full p-6 transition-all" gradient hover>
                        <div className="mb-4">
                          <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant="secondary" className="gap-1.5">
                              <Briefcase className="h-3.5 w-3.5" />
                              {job.department}
                            </Badge>
                            <Badge variant="outline" className="gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {job.location}
                            </Badge>
                            <Badge>{job.type}</Badge>
                          </div>
                        </div>
                        <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {job.description}
                        </p>
                        <Button
                          onClick={() => setSelectedJob(job)}
                          variant="outline"
                          className="w-full font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          View Details
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Closed Positions Section */}
            {closedJobs.length > 0 && (
              <div className="mb-12">
                <button
                  onClick={() => setShowClosedPositions(!showClosedPositions)}
                  className="mb-6 flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading text-2xl font-bold text-foreground">Closed Positions</h2>
                    <Badge variant="destructive" className="text-xs">
                      {closedJobs.length} {closedJobs.length === 1 ? 'Position' : 'Positions'}
                    </Badge>
                  </div>
                  {showClosedPositions ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {showClosedPositions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-6 lg:grid-cols-2"
                  >
                    {closedJobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                      >
                        <GlassCard 
                          className="group h-full p-6 transition-all opacity-75 border-destructive/30" 
                          gradient={false}
                          hover={false}
                        >
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-heading text-xl font-bold text-foreground">
                                {job.title}
                              </h3>
                              <Badge variant="destructive" className="text-xs font-semibold">
                                CLOSED
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant="destructive" className="gap-1.5 text-xs">
                                <X className="h-3 w-3" />
                                Not Accepting Applications
                              </Badge>
                              <Badge variant="secondary" className="gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                {job.department}
                              </Badge>
                              <Badge variant="outline" className="gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location}
                              </Badge>
                              <Badge>{job.type}</Badge>
                            </div>
                          </div>
                          <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {job.description}
                          </p>
                          <Button
                            onClick={() => setSelectedJob(job)}
                            variant="outline"
                            disabled
                            className="w-full font-semibold opacity-50 cursor-not-allowed"
                          >
                            Position Closed
                          </Button>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 text-center"
              >
                <p className="text-muted-foreground">Loading positions...</p>
              </motion.div>
            )}
            {!loading && openJobs.length === 0 && closedJobs.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-12 text-center"
              >
                <p className="text-muted-foreground">No positions found in this category.</p>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className="p-8 text-center sm:p-12" gradient>
                <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                  Do not see your role?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                  We are always looking for exceptional talent. Send us your CV and tell us what you can bring to
                  Iconic Fibre.
                </p>
                <Button size="lg" className="mt-8 font-semibold">
                  Send Open Application
                </Button>
              </GlassCard>
            </motion.div>
          </div>
        </section>

        {/* Job Detail Modal */}
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl"
            >
              <GlassCard className="p-6 sm:p-8" gradient>
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                        {selectedJob.title}
                      </h2>
                      {selectedJob.status === 'closed' && (
                        <Badge variant="destructive" className="text-xs font-semibold">
                          CLOSED
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {selectedJob.status === 'closed' && (
                        <Badge variant="destructive" className="gap-1.5 text-xs">
                          <X className="h-3 w-3" />
                          Not Accepting Applications
                        </Badge>
                      )}
                      <Badge>{selectedJob.department}</Badge>
                      <Badge variant="outline" className="gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedJob.location}
                      </Badge>
                      <Badge variant="secondary">{selectedJob.type}</Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 font-heading text-lg font-bold text-foreground">About the Role</h3>
                    <p className="leading-relaxed text-muted-foreground">{selectedJob.description}</p>
                  </div>

                  <div>
                    <h3 className="mb-3 font-heading text-lg font-bold text-foreground">Requirements</h3>
                    <ul className="space-y-2.5">
                      {selectedJob.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-3 font-heading text-lg font-bold text-foreground">Benefits</h3>
                    <ul className="space-y-2.5">
                      {selectedJob.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-3 text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full font-semibold"
                    disabled={selectedJob.status === 'closed'}
                  >
                    {selectedJob.status === 'closed' ? 'Position Closed' : 'Apply for this Position'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
