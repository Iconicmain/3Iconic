'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { GlassCard } from '@/components/isp/glass-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  Mail,
  Upload,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { jobs as defaultJobs } from '@/lib/isp-data'
import { toast } from 'sonner'

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
  roleOverview?: string
  requirements: string[]
  minimumRequirements?: string[]
  niceToHave?: string[]
  benefits: string[]
  responsibilities?: string[]
  safetyNote?: string
  status?: 'open' | 'closed'
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [showClosedPositions, setShowClosedPositions] = useState(false)
  
  // Application form state
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [showEligibilityCheck, setShowEligibilityCheck] = useState(false)
  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, boolean>>({})
  const [applicationStep, setApplicationStep] = useState(1)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)
  const [applicationData, setApplicationData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    countyTown: '',
    yearsExperience: '',
    cvFile: null as File | null,
    certificatesFile: null as File | null,
  })

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

  // Get eligibility check questions based on job title/department
  const getEligibilityQuestions = (job: Job) => {
    const title = job.title.toLowerCase()
    const dept = job.department.toLowerCase()
    
    if (title.includes('field tech') || title.includes('technician') || title.includes('fibre tech') || dept === 'operations') {
      return [
        { id: 'poles', label: 'I am comfortable climbing poles' },
        { id: 'fibre', label: 'I have worked with fibre before' },
        { id: 'field', label: 'I am willing to work in the field' },
      ]
    }
    if (title.includes('network engineer') || title.includes('engineer') || dept === 'engineering') {
      return [
        { id: 'network', label: 'I have network engineering experience' },
        { id: 'xpon', label: 'I have XPON / MikroTik experience' },
        { id: 'infrastructure', label: 'I am comfortable working with network infrastructure' },
      ]
    }
    if (title.includes('support') || dept === 'support') {
      return [
        { id: 'support', label: 'I have customer support experience' },
        { id: 'communication', label: 'I am comfortable communicating with customers' },
        { id: 'technical', label: 'I can troubleshoot technical issues' },
      ]
    }
    if (title.includes('sales') || dept === 'sales') {
      return [
        { id: 'sales', label: 'I have sales experience' },
        { id: 'b2b', label: 'I have B2B sales experience' },
        { id: 'targets', label: 'I am comfortable meeting sales targets' },
      ]
    }
    // Default questions
    return [
      { id: 'relevant', label: 'I have relevant experience for this role' },
      { id: 'committed', label: 'I am committed to this position' },
      { id: 'available', label: 'I am available to start' },
    ]
  }

  const handleEligibilityCheck = () => {
    const questions = getEligibilityQuestions(selectedJob!)
    const allChecked = questions.every(q => eligibilityAnswers[q.id] === true)
    
    if (allChecked) {
      setShowEligibilityCheck(false)
      setShowApplicationForm(true)
    } else {
      toast.error('Please confirm all eligibility requirements to proceed')
    }
  }

  const handleApplicationSubmit = async () => {
    // Validate Step 3
    if (applicationStep === 3) {
      if (!applicationData.cvFile) {
        toast.error('Please upload your CV/Resume')
        return
      }
    }

    // If not on final step, move to next step
    if (applicationStep < 3) {
      setApplicationStep(applicationStep + 1)
      return
    }

    // Final submission
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('jobId', selectedJob!.id) // Add job ID to increment application count
      formData.append('jobTitle', selectedJob!.title)
      formData.append('fullName', applicationData.fullName)
      formData.append('phoneNumber', applicationData.phoneNumber)
      formData.append('email', applicationData.email)
      formData.append('countyTown', applicationData.countyTown)
      formData.append('yearsExperience', applicationData.yearsExperience)
      
      if (applicationData.cvFile) {
        formData.append('cvFile', applicationData.cvFile)
      }
      if (applicationData.certificatesFile) {
        formData.append('certificatesFile', applicationData.certificatesFile)
      }

      // Show loading state
      toast.loading('Submitting your application...', { id: 'submitting' })

      // Submit to API
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to submit application'
        const details = result.details ? ` ${result.details}` : ''
        throw new Error(errorMsg + details)
      }

      // Success
      toast.success('Application submitted successfully!', { id: 'submitting' })
      setApplicationSubmitted(true)
    } catch (error) {
      console.error('Error submitting application:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit application. Please try again.',
        { id: 'submitting' }
      )
    }
  }

  const resetApplicationForm = () => {
    setShowApplicationForm(false)
    setShowEligibilityCheck(false)
    setApplicationStep(1)
    setApplicationSubmitted(false)
    setEligibilityAnswers({})
    setApplicationData({
      fullName: '',
      phoneNumber: '',
      email: '',
      countyTown: '',
      yearsExperience: '',
      cvFile: null,
      certificatesFile: null,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />

      <main className="relative">
        {/* Hero Section */}
        <section className="relative px-4 pt-16 pb-8 sm:px-6 sm:pt-20 sm:pb-12 md:pt-24 md:pb-16 lg:px-8 lg:pt-32 lg:pb-24">
          <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
              <h1 className="font-heading text-3xl font-bold leading-tight text-foreground xs:text-4xl sm:text-5xl md:text-5xl lg:text-6xl">
              Build the Future of
                <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Connectivity in Kenya
              </span>
            </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
                Join a team connecting homes, businesses, and communities across Kenya. Make an impact that
                matters.
            </p>
          </motion.div>
          </div>
        </section>

        {/* Culture Stats */}
        <section className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
              className="mb-8 text-center sm:mb-12"
            >
              <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Life at Iconic Fibre</h2>
            </motion.div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {cultureAspects.map((aspect, index) => (
                <motion.div
                  key={aspect.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-5 text-center sm:p-6" gradient hover>
                    <div className="font-heading text-3xl font-bold text-primary sm:text-4xl">{aspect.stat}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {aspect.statLabel}
                    </div>
                    <h3 className="mt-3 font-heading text-base font-bold text-foreground sm:text-lg sm:mt-4">{aspect.title}</h3>
                    <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{aspect.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
              className="mb-8 text-center sm:mb-12"
            >
              <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Benefits & Perks</h2>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">We take care of our team</p>
            </motion.div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <GlassCard className="h-full p-5 sm:p-6" gradient hover>
                    <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 sm:p-3">
                      <benefit.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">{benefit.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{benefit.description}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

          {/* Open Positions */}
        <section className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
              className="mb-8 text-center sm:mb-12"
            >
              <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">Open Positions</h2>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">Find your perfect role</p>
            </motion.div>

            {/* Department Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-8 flex flex-wrap justify-center gap-2 sm:mb-10 sm:gap-3"
            >
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium capitalize transition-all sm:px-5 sm:py-2.5 sm:text-sm ${
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
              <div className="mb-8 sm:mb-12">
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground sm:mb-6 sm:text-2xl">Open Positions</h2>
                <div className="grid gap-4 grid-cols-1 sm:gap-6 lg:grid-cols-2">
                  {openJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                      <GlassCard className="group h-full p-5 transition-all sm:p-6" gradient hover>
                        <div className="mb-4">
                          <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors sm:text-xl">
                            {job.title}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm">
                              <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {job.department}
                            </Badge>
                            <Badge variant="outline" className="gap-1.5 text-xs sm:text-sm">
                              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {job.location}
                            </Badge>
                            <Badge className="text-xs sm:text-sm">{job.type}</Badge>
                        </div>
                      </div>
                        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:mb-6 sm:text-sm">
                          {job.description}
                        </p>
                    <Button
                      onClick={() => setSelectedJob(job)}
                      variant="outline"
                          className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors sm:text-sm"
                    >
                      View Details
                          <ChevronRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
              </div>
            )}

            {/* Closed Positions Section */}
            {closedJobs.length > 0 && (
              <div className="mb-8 sm:mb-12">
                <button
                  onClick={() => setShowClosedPositions(!showClosedPositions)}
                  className="mb-4 flex w-full items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 sm:mb-6 sm:p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="font-heading text-lg font-bold text-foreground sm:text-2xl">Closed Positions</h2>
                    <Badge variant="destructive" className="text-xs">
                      {closedJobs.length} {closedJobs.length === 1 ? 'Position' : 'Positions'}
                    </Badge>
                  </div>
                  {showClosedPositions ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                  )}
                </button>

                {showClosedPositions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid gap-4 grid-cols-1 sm:gap-6 lg:grid-cols-2"
                  >
                    {closedJobs.map((job, index) => (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                      >
                        <GlassCard 
                          className="group h-full p-5 transition-all opacity-75 border-destructive/30 sm:p-6" 
                          gradient={false}
                          hover={false}
                        >
                          <div className="mb-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-heading text-lg font-bold text-foreground sm:text-xl">
                                {job.title}
                              </h3>
                              <Badge variant="destructive" className="text-xs font-semibold">
                                CLOSED
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                              <Badge variant="destructive" className="gap-1.5 text-xs">
                                <X className="h-3 w-3" />
                                Not Accepting Applications
                              </Badge>
                              <Badge variant="secondary" className="gap-1.5 text-xs sm:text-sm">
                                <Briefcase className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {job.department}
                              </Badge>
                              <Badge variant="outline" className="gap-1.5 text-xs sm:text-sm">
                                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {job.location}
                              </Badge>
                              <Badge className="text-xs sm:text-sm">{job.type}</Badge>
                            </div>
                          </div>
                          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:mb-6 sm:text-sm">
                            {job.description}
                          </p>
                          <Button
                            onClick={() => setSelectedJob(job)}
                            variant="outline"
                            disabled
                            className="w-full text-xs font-semibold opacity-50 cursor-not-allowed sm:text-sm"
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
        <section className="relative px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className="p-6 text-center sm:p-8 md:p-12" gradient>
                <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                  Do not see your role?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
                  We are always looking for exceptional talent. Send us your CV and tell us what you can bring to
                  Iconic Fibre.
                </p>
                <Link href="/careers/open-application">
                  <Button size="lg" className="mt-6 text-sm font-semibold sm:mt-8 sm:text-base">
                    Send Open Application
                  </Button>
                </Link>
              </GlassCard>
          </motion.div>
          </div>
        </section>

        {/* Job Detail Modal - Premium Desktop Redesign */}
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => {
              resetApplicationForm()
              setSelectedJob(null)
            }}
            >
              <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full h-[95vh] lg:h-auto lg:max-h-[92vh] lg:max-w-7xl lg:rounded-3xl overflow-hidden bg-background shadow-2xl flex flex-col"
            >
              {/* Premium Header - Sticky */}
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b-2 border-border/40">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/12 via-primary/6 to-background p-4 sm:p-6 lg:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--primary)_0%,_transparent_70%)] opacity-15" />
                  
                  {/* Close Button */}
                  <button
                    onClick={() => {
                      resetApplicationForm()
                      setSelectedJob(null)
                    }}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm text-muted-foreground transition-all hover:bg-background hover:text-foreground active:scale-95 lg:right-6 lg:top-6 lg:h-11 lg:w-11"
                  >
                    <X className="h-4 w-4 lg:h-5 lg:w-5" />
                  </button>

                  <div className="relative pr-10 lg:pr-16">
                    <div className="max-w-6xl mx-auto">
                      {/* Status Badge */}
                      <div className="mb-4 flex items-center gap-2">
                        {selectedJob.status === 'closed' ? (
                          <Badge variant="destructive" className="gap-1.5 text-xs font-bold px-3 py-1.5 lg:text-sm lg:px-4">
                            <X className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                            CLOSED
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/25 text-primary border-2 border-primary/40 gap-1.5 text-xs font-bold px-3 py-1.5 lg:text-sm lg:px-4">
                            <Briefcase className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                            OPEN
                          </Badge>
                        )}
                      </div>

                      {/* Job Title */}
                      <h2 className="font-heading text-2xl font-bold leading-tight text-foreground mb-4 sm:text-3xl md:text-4xl lg:text-5xl lg:mb-5">
                        {selectedJob.title}
                      </h2>

                      {/* Quick Info Pills */}
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                        <Badge variant="secondary" className="gap-1.5 text-xs font-medium px-2.5 py-1 lg:text-sm lg:px-3 lg:py-1.5">
                          <Briefcase className="h-3 w-3 lg:h-4 lg:w-4" />
                          {selectedJob.department}
                        </Badge>
                        <Badge variant="outline" className="gap-1.5 text-xs font-medium px-2.5 py-1 lg:text-sm lg:px-3 lg:py-1.5">
                          <MapPin className="h-3 w-3 lg:h-4 lg:w-4" />
                          {selectedJob.location}
                        </Badge>
                        <Badge variant="secondary" className="gap-1.5 text-xs font-medium px-2.5 py-1 lg:text-sm lg:px-3 lg:py-1.5">
                          <Clock className="h-3 w-3 lg:h-4 lg:w-4" />
                          {selectedJob.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto bg-background">
                {showEligibilityCheck ? (
                  /* Quick Eligibility Check */
                  <div className="p-6 sm:p-8 lg:p-12 flex items-center justify-center min-h-[400px]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full max-w-2xl"
                    >
                      <div className="mb-6 text-center">
                        <div className="mb-4 flex justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                        <h3 className="font-heading text-2xl font-bold text-foreground mb-2 sm:text-3xl">
                          Quick Eligibility Check
                        </h3>
                        <p className="text-sm text-muted-foreground sm:text-base">
                          Please confirm the following to proceed with your application
                        </p>
                      </div>

                      <div className="space-y-3 mb-8">
                        {getEligibilityQuestions(selectedJob).map((question, index) => (
                          <motion.div
                            key={question.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center gap-4 rounded-xl border-2 border-border/50 bg-background p-5 hover:border-primary/50 hover:bg-primary/5 transition-all"
                          >
                            <Checkbox
                              id={question.id}
                              checked={eligibilityAnswers[question.id] || false}
                              onCheckedChange={(checked) => setEligibilityAnswers({
                                ...eligibilityAnswers,
                                [question.id]: checked === true
                              })}
                              className="h-6 w-6 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <label
                              htmlFor={question.id}
                              className="flex-1 text-base font-medium text-foreground cursor-pointer leading-6"
                            >
                              {question.label}
                            </label>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setShowEligibilityCheck(false)}
                          className="flex-1 font-semibold px-6 py-6 border-2"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleEligibilityCheck}
                          className="flex-1 bg-gradient-to-r from-primary to-accent font-bold px-8 py-6 shadow-lg shadow-primary/20 hover:shadow-xl"
                        >
                          Continue to Application
                          <ChevronRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                ) : !showApplicationForm ? (
                  <div className="p-4 sm:p-6 md:p-8 lg:p-8 xl:p-12">
                    <div className="max-w-7xl mx-auto">
                      {/* Desktop: Two-Column Layout, Mobile: Single Column */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                        {/* Main Content - Left Column (Desktop) */}
                        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                          {/* Role Overview */}
                          {(selectedJob.roleOverview || selectedJob.description) && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="border-b border-border/30 pb-6 lg:pb-8"
                            >
                              <h3 className="font-heading text-xl font-bold text-foreground mb-4 lg:text-2xl">Role Overview</h3>
                              <p className="text-sm leading-7 text-foreground/90 sm:text-base sm:leading-8 lg:text-lg lg:leading-8">
                                {selectedJob.roleOverview || selectedJob.description}
                              </p>
                            </motion.div>
                          )}

                          {/* What You'll Do - Responsibilities */}
                          {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 }}
                            >
                              <h3 className="font-heading text-xl font-bold text-foreground mb-5 lg:text-2xl">What You'll Do</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                                {selectedJob.responsibilities.map((resp, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.05 }}
                                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 lg:p-5 hover:border-primary/50 hover:bg-primary/5 transition-all"
                                  >
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 lg:h-7 lg:w-7">
                                      <Check className="h-3.5 w-3.5 text-primary lg:h-4 lg:w-4" />
                                    </div>
                                    <span className="text-sm leading-6 text-foreground font-medium sm:text-base lg:text-base lg:leading-7">{resp}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* What We're Looking For - Requirements */}
                          {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <h3 className="font-heading text-xl font-bold text-foreground mb-5 lg:text-2xl">What We're Looking For</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                                {selectedJob.requirements.map((req, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.25 + i * 0.05 }}
                                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4 lg:p-5 hover:border-primary/50 hover:bg-primary/5 transition-all"
                                  >
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 lg:h-7 lg:w-7">
                                      <Check className="h-3.5 w-3.5 text-primary lg:h-4 lg:w-4" />
                                    </div>
                                    <span className="text-sm leading-6 text-foreground font-medium sm:text-base lg:text-base lg:leading-7">{req}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Minimum Requirements & Nice to Have - Side by Side on Desktop */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {/* Minimum Requirements */}
                            {selectedJob.minimumRequirements && selectedJob.minimumRequirements.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 lg:p-6"
                              >
                                <h3 className="font-heading text-lg font-bold text-foreground mb-4 lg:text-xl">Minimum Requirements</h3>
                                <div className="space-y-3">
                                  {selectedJob.minimumRequirements.map((req, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.35 + i * 0.05 }}
                                      className="flex items-start gap-3"
                                    >
                                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                                        <Check className="h-3.5 w-3.5 text-primary font-bold" />
                                      </div>
                                      <span className="text-sm leading-6 text-foreground font-medium lg:text-base">{req}</span>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}

                            {/* Nice to Have */}
                            {selectedJob.niceToHave && selectedJob.niceToHave.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="rounded-xl border-2 border-border/50 bg-muted/20 p-5 lg:p-6"
                              >
                                <h3 className="font-heading text-lg font-bold text-foreground mb-4 lg:text-xl">Nice to Have</h3>
                                <div className="space-y-3">
                                  {selectedJob.niceToHave.map((item, i) => (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.45 + i * 0.05 }}
                                      className="flex items-start gap-3"
                                    >
                                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                        <Check className="h-3.5 w-3.5 text-accent" />
                                      </div>
                                      <span className="text-sm leading-6 text-foreground/80 font-medium lg:text-base">{item}</span>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Safety First */}
                          {selectedJob.safetyNote && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 }}
                              className="rounded-xl border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-5 lg:p-6"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                                  <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-heading text-lg font-bold text-foreground mb-2 lg:text-xl">Safety First</h3>
                                  <p className="text-sm leading-6 text-foreground/90 lg:text-base">{selectedJob.safetyNote}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Sidebar - Right Column (Desktop) */}
                        <div className="lg:col-span-4">
                          <div className="lg:sticky lg:top-24 space-y-6 lg:space-y-8">
                            {/* What We Offer - Benefits */}
                            {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/8 via-primary/5 to-background p-5 lg:p-6 shadow-lg"
                              >
                                <div className="flex items-center gap-3 mb-5">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                                    <Award className="h-5 w-5 text-primary" />
                                  </div>
                                  <h3 className="font-heading text-xl font-bold text-foreground">What We Offer</h3>
                                </div>
                                <ul className="space-y-3">
                                  {selectedJob.benefits.map((benefit, i) => (
                                    <motion.li
                                      key={i}
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: 0.55 + i * 0.05 }}
                                      className="flex items-start gap-3"
                                    >
                                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                                        <Check className="h-3.5 w-3.5 text-accent" />
                                      </div>
                                      <span className="text-sm leading-6 text-foreground font-medium lg:text-base">{benefit}</span>
                                    </motion.li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}

                            {/* Quick Info Card */}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 }}
                              className="rounded-xl border-2 border-border/60 bg-background p-5 lg:p-6 shadow-sm"
                            >
                              <h4 className="font-heading text-base font-bold uppercase tracking-wide text-foreground mb-5 lg:text-lg">
                                Quick Info
                              </h4>
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <MapPin className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.location}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                  </div>
                    <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Department</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.department}</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : applicationSubmitted ? (
                  /* Confirmation Screen */
                  <div className="p-8 sm:p-12 flex items-center justify-center min-h-[400px]">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center max-w-md"
                    >
                      <div className="mb-6 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                          <CheckCircle2 className="h-10 w-10 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-heading text-2xl font-bold text-foreground mb-3 sm:text-3xl">
                        Thank you for applying!
                      </h3>
                      <p className="text-sm leading-6 text-foreground/80 sm:text-base">
                        Our team will review your application within <strong>7–14 days</strong>.
                        <br /><br />
                        Shortlisted candidates will be contacted via phone or email.
                      </p>
                      <Button
                        onClick={() => {
                          resetApplicationForm()
                          setSelectedJob(null)
                        }}
                        className="mt-6 font-semibold"
                      >
                        Close
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  /* Application Form */
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="max-w-2xl mx-auto">
                      {/* Header */}
                      <div className="mb-6 text-center">
                        <h3 className="font-heading text-2xl font-bold text-foreground mb-2 sm:text-3xl">
                          Apply for {selectedJob.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Complete the form below to submit your application
                        </p>
                      </div>

                      {/* Progress Indicator */}
                      <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">Step {applicationStep} of 3</span>
                          <span className="text-xs font-semibold text-primary">{Math.round((applicationStep / 3) * 100)}% Complete</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${(applicationStep / 3) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                      </div>
                    </div>

                      {/* Step 1: Basic Info */}
                      {applicationStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-5"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-heading text-xl font-bold text-foreground">Basic Information</h3>
                          </div>
                          
                          <div className="space-y-5">
                            <div>
                              <Label htmlFor="fullName" className="text-sm font-semibold mb-2 block">Full Name *</Label>
                              <Input
                                id="fullName"
                                value={applicationData.fullName}
                                onChange={(e) => setApplicationData({ ...applicationData, fullName: e.target.value })}
                                className="h-11"
                                placeholder="Enter your full name"
                              />
                            </div>

                            <div>
                              <Label htmlFor="phoneNumber" className="text-sm font-semibold mb-2 block">Phone Number *</Label>
                              <Input
                                id="phoneNumber"
                                type="tel"
                                value={applicationData.phoneNumber}
                                onChange={(e) => setApplicationData({ ...applicationData, phoneNumber: e.target.value })}
                                className="h-11"
                                placeholder="e.g., 0712345678 or +254712345678"
                              />
                              <p className="text-xs text-muted-foreground mt-1.5">Important: We'll contact you via phone</p>
                  </div>

                    <div>
                              <Label htmlFor="email" className="text-sm font-semibold mb-2 block">Email *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={applicationData.email}
                                onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                                className="h-11"
                                placeholder="your.email@example.com"
                              />
                    </div>

                    <div>
                              <Label htmlFor="countyTown" className="text-sm font-semibold mb-2 block">County / Town *</Label>
                              <Input
                                id="countyTown"
                                value={applicationData.countyTown}
                                onChange={(e) => setApplicationData({ ...applicationData, countyTown: e.target.value })}
                                className="h-11"
                                placeholder="e.g., Nairobi, Mombasa, Nyeri"
                              />
                      </div>
                    </div>
                        </motion.div>
                      )}

                      {/* Step 2: Experience */}
                      {applicationStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-5"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
                              <Briefcase className="h-5 w-5 text-accent" />
                            </div>
                            <h3 className="font-heading text-xl font-bold text-foreground">Experience</h3>
                          </div>
                          
                          <div className="space-y-5">
                            <div>
                              <Label htmlFor="yearsExperience" className="text-sm font-semibold mb-2 block">Years of Experience *</Label>
                              <select
                                id="yearsExperience"
                                value={applicationData.yearsExperience}
                                onChange={(e) => setApplicationData({ ...applicationData, yearsExperience: e.target.value })}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <option value="">Select years of experience</option>
                                <option value="0-1">0-1 years</option>
                                <option value="2-3">2-3 years</option>
                                <option value="4-5">4-5 years</option>
                                <option value="6-10">6-10 years</option>
                                <option value="10+">10+ years</option>
                              </select>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Attachments */}
                      {applicationStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-5"
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                              <Upload className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-heading text-xl font-bold text-foreground">Attachments</h3>
                          </div>
                          
                          <div className="space-y-5">
                            <div>
                              <Label htmlFor="cvFile" className="text-sm font-semibold mb-2 block">CV / Resume (PDF only) *</Label>
                              <div>
                                <label
                                  htmlFor="cvFile"
                                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-muted/30"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="h-10 w-10 mb-3 text-muted-foreground" />
                                    <p className="mb-1 text-sm font-medium text-foreground">
                                      <span className="text-primary">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF only (Max 5MB)</p>
                                  </div>
                                  <input
                                    id="cvFile"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) setApplicationData({ ...applicationData, cvFile: file })
                                    }}
                                  />
                                </label>
                                {applicationData.cvFile && (
                                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                    <Check className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-medium text-foreground">
                                      {applicationData.cvFile.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                    </div>

                    <div>
                              <Label htmlFor="certificatesFile" className="text-sm font-semibold mb-2 block">
                                Certificates <span className="text-muted-foreground font-normal">(Optional)</span>
                              </Label>
                              <div>
                                <label
                                  htmlFor="certificatesFile"
                                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-muted/30"
                                >
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="h-10 w-10 mb-3 text-muted-foreground" />
                                    <p className="mb-1 text-sm font-medium text-foreground">
                                      <span className="text-primary">Click to upload</span> certificates
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (Max 5MB)</p>
                                  </div>
                                  <input
                                    id="certificatesFile"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) setApplicationData({ ...applicationData, certificatesFile: file })
                                    }}
                                  />
                                </label>
                                {applicationData.certificatesFile && (
                                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                    <Check className="h-4 w-4 text-primary" />
                                    <p className="text-sm font-medium text-foreground">
                                      {applicationData.certificatesFile.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Navigation Buttons */}
                      <div className="flex justify-between gap-3 mt-8 pt-6 border-t-2 border-border/50">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (applicationStep > 1) {
                              setApplicationStep(applicationStep - 1)
                            }
                          }}
                          disabled={applicationStep === 1}
                          className="flex items-center gap-2 font-semibold px-6"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        {applicationStep < 3 ? (
                          <Button
                            onClick={() => {
                              // Basic validation
                              if (applicationStep === 1) {
                                if (!applicationData.fullName || !applicationData.phoneNumber || !applicationData.email || !applicationData.countyTown) {
                                  toast.error('Please fill in all required fields')
                                  return
                                }
                              }
                              if (applicationStep === 2) {
                                if (!applicationData.yearsExperience) {
                                  toast.error('Please fill in all required fields')
                                  return
                                }
                              }
                              setApplicationStep(applicationStep + 1)
                            }}
                            className="flex items-center gap-2 font-semibold px-6 bg-gradient-to-r from-primary to-accent"
                          >
                            Next
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleApplicationSubmit}
                            disabled={!applicationData.cvFile}
                            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent font-bold px-8 shadow-lg shadow-primary/20 hover:shadow-xl"
                          >
                            Submit Application
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                    </div>

              {/* Sticky Footer with Easy Apply */}
              <div className="sticky bottom-0 border-t-2 border-border/40 bg-background/95 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                {selectedJob.status === 'closed' ? (
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-destructive">
                      <X className="h-5 w-5" />
                      <span className="text-sm font-medium sm:text-base lg:text-lg">This position is no longer accepting applications</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-6 lg:p-8">
                  <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Desktop: Show job title reminder */}
                      {!showApplicationForm && !showEligibilityCheck && (
                        <div className="hidden lg:block">
                          <p className="text-sm text-muted-foreground">Applying for</p>
                          <p className="text-base font-semibold text-foreground">{selectedJob.title}</p>
                        </div>
                      )}
                      
                      {/* Main Apply Button */}
                      <div className="flex gap-3 sm:flex-row sm:ml-auto">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (showApplicationForm || showEligibilityCheck) {
                              resetApplicationForm()
                            } else {
                              setSelectedJob(null)
                            }
                          }}
                          className="font-semibold px-6 py-6 border-2 lg:px-8"
                        >
                          {showApplicationForm || showEligibilityCheck ? 'Cancel' : 'Close'}
                        </Button>
                        {!showApplicationForm && !showEligibilityCheck && (
                          <Button
                            size="lg"
                            onClick={() => setShowEligibilityCheck(true)}
                            className="flex-1 bg-gradient-to-r from-primary to-accent font-bold text-sm shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95 sm:flex-initial sm:px-8 lg:px-10 py-6"
                          >
                            Apply Now
                            <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                  </div>
              </motion.div>
            </motion.div>
          )}
      </main>

      <Footer />
    </div>
  )
}
