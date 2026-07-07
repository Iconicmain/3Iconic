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
  Users,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Upload,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { jobs as defaultJobs } from '@/lib/isp-data'
import { toast } from 'sonner'

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
  /** When set from API/admin: true = use eligibilityQuestions; false = skip check. When omitted, legacy jobs use title/department heuristics. */
  eligibilityCheckEnabled?: boolean
  eligibilityQuestions?: string[]
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

    // Track page visit
    fetch('/api/careers/visit', {
      method: 'POST',
    }).catch((error) => {
      // Silently fail - don't interrupt user experience
      console.error('Failed to track visit:', error)
    })
  }, [])

  useEffect(() => {
    if (!selectedJob) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [selectedJob])

  const departments = ['all', 'Operations', 'Engineering', 'Support', 'Sales']
  
  // Separate open and closed jobs
  const allFilteredJobs = selectedDept === 'all' ? jobs : jobs.filter((j) => j.department === selectedDept)
  const openJobs = allFilteredJobs.filter((j) => j.status !== 'closed')
  const closedJobs = allFilteredJobs.filter((j) => j.status === 'closed')

  const getEligibilityQuestionsHeuristic = (job: Job) => {
    const title = job.title.toLowerCase()
    const dept = job.department.toLowerCase()

    const looksLikeCustomerCare =
      /customer care|care representative|client care|call center|help\s*desk|service desk|reception/.test(title)
    const looksLikeFieldRole =
      /field\s*tech|fibre\s*tech|fiber\s*tech|\bftth\b|\bfttb\b|installer|splicer|pole|linesman|rigger/.test(title) ||
      (/\btechnician\b/.test(title) && !looksLikeCustomerCare)

    if (looksLikeCustomerCare || (dept === 'support' && !looksLikeFieldRole)) {
      return [
        { id: 'support', label: 'I have customer support experience' },
        { id: 'communication', label: 'I am comfortable communicating with customers' },
        { id: 'technical', label: 'I can troubleshoot technical issues' },
      ]
    }
    if (looksLikeFieldRole) {
      return [
        { id: 'poles', label: 'I am comfortable climbing poles' },
        { id: 'fibre', label: 'I have worked with fibre before' },
        { id: 'field', label: 'I am willing to work in the field' },
      ]
    }
    if (title.includes('network engineer') || (title.includes('engineer') && !looksLikeFieldRole) || dept === 'engineering') {
      return [
        { id: 'network', label: 'I have network engineering experience' },
        { id: 'xpon', label: 'I have XPON / MikroTik experience' },
        { id: 'infrastructure', label: 'I am comfortable working with network infrastructure' },
      ]
    }
    if (title.includes('sales') || dept === 'sales') {
      return [
        { id: 'sales', label: 'I have sales experience' },
        { id: 'b2b', label: 'I have B2B sales experience' },
        { id: 'targets', label: 'I am comfortable meeting sales targets' },
      ]
    }
    return [
      { id: 'relevant', label: 'I have relevant experience for this role' },
      { id: 'committed', label: 'I am committed to this position' },
      { id: 'available', label: 'I am available to start' },
    ]
  }

  const getEligibilityQuestions = (job: Job) => {
    if (typeof job.eligibilityCheckEnabled === 'boolean') {
      if (!job.eligibilityCheckEnabled) return []
      const custom = (job.eligibilityQuestions || [])
        .map((q) => q.trim())
        .filter(Boolean)
      return custom.map((label, i) => ({ id: `q${i}`, label }))
    }
    return getEligibilityQuestionsHeuristic(job)
  }

  const startApplicationFlow = () => {
    if (!selectedJob) return
    const questions = getEligibilityQuestions(selectedJob)
    if (questions.length > 0) {
      setShowEligibilityCheck(true)
      setShowApplicationForm(false)
    } else {
      setShowEligibilityCheck(false)
      setShowApplicationForm(true)
    }
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

        {/* Job detail + apply: responsive full-viewport to large desktop */}
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="presentation"
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-[6px] sm:items-center sm:p-3 md:p-5 lg:p-8"
              onClick={() => {
                resetApplicationForm()
                setSelectedJob(null)
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="job-modal-title"
                className="relative flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden border border-border/30 bg-background shadow-2xl sm:h-auto sm:max-h-[min(92dvh,52rem)] sm:max-w-[min(100vw-1.5rem,42rem)] md:max-h-[min(92dvh,56rem)] md:max-w-[min(100vw-2rem,56rem)] lg:max-w-[min(100vw-2.5rem,72rem)] xl:max-w-[min(100vw-3rem,80rem)] 2xl:max-w-[88rem] sm:rounded-2xl lg:rounded-3xl rounded-t-2xl sm:rounded-b-2xl"
              >
              {/* Header */}
              <header className="shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-md">
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.14] via-primary/[0.06] to-background px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pb-5 sm:pt-6 lg:px-10 lg:pb-8 lg:pt-10">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,var(--primary)_0%,transparent_65%)] opacity-[0.12]" />

                  <button
                    type="button"
                    onClick={() => {
                      resetApplicationForm()
                      setSelectedJob(null)
                    }}
                    className="absolute right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/90 text-muted-foreground shadow-sm transition-all hover:bg-background hover:text-foreground active:scale-95 sm:right-4 sm:top-4 sm:h-11 sm:w-11 lg:right-6 lg:top-6"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="relative pr-12 sm:pr-14 lg:pr-16">
                    <div className="mx-auto max-w-5xl">
                      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
                        {selectedJob.status === 'closed' ? (
                          <Badge variant="destructive" className="gap-1.5 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide sm:text-xs sm:px-3">
                            <X className="h-3 w-3" />
                            Closed
                          </Badge>
                        ) : (
                          <Badge className="gap-1.5 border border-primary/35 bg-primary/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-primary sm:text-xs sm:px-3">
                            <Briefcase className="h-3 w-3" />
                            Open
                          </Badge>
                        )}
                      </div>

                      <h2
                        id="job-modal-title"
                        className="font-heading text-xl font-bold leading-[1.2] tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.75rem] xl:leading-[1.15]"
                      >
                        {selectedJob.title}
                      </h2>

                      <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-2.5">
                        <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium sm:text-sm">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          {selectedJob.department}
                        </Badge>
                        <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs font-medium sm:text-sm">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {selectedJob.location}
                        </Badge>
                        <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium sm:text-sm">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {selectedJob.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Scrollable body */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background [-webkit-overflow-scrolling:touch]">
                {showEligibilityCheck ? (
                  <div className="flex min-h-[min(100%,28rem)] items-stretch justify-center px-4 py-6 sm:min-h-0 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex w-full max-w-xl flex-col sm:max-w-2xl lg:max-w-2xl"
                    >
                      <div className="mb-6 text-center sm:mb-8">
                        <div className="mb-3 flex justify-center sm:mb-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 sm:h-16 sm:w-16">
                            <CheckCircle2 className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
                          </div>
                        </div>
                        <h3 className="font-heading text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                          Quick eligibility check
                        </h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                          Confirm each item below so we know this role is a good fit before you continue.
                        </p>
                      </div>

                      <ul className="mb-6 space-y-2.5 sm:mb-8 sm:space-y-3">
                        {getEligibilityQuestions(selectedJob).map((question, index) => (
                          <motion.li
                            key={question.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.06 }}
                          >
                            <label
                              htmlFor={question.id}
                              className="flex min-h-[3.25rem] cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.06] has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/[0.08] sm:min-h-0 sm:gap-4 sm:p-4"
                            >
                              <Checkbox
                                id={question.id}
                                checked={eligibilityAnswers[question.id] || false}
                                onCheckedChange={(checked) =>
                                  setEligibilityAnswers({
                                    ...eligibilityAnswers,
                                    [question.id]: checked === true,
                                  })
                                }
                                className="mt-0.5 h-5 w-5 shrink-0 border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary sm:h-6 sm:w-6"
                              />
                              <span className="text-sm font-medium leading-snug text-foreground sm:text-base sm:leading-relaxed">
                                {question.label}
                              </span>
                            </label>
                          </motion.li>
                        ))}
                      </ul>

                      <div className="mt-auto flex flex-col-reverse gap-2.5 sm:flex-row sm:gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowEligibilityCheck(false)}
                          className="h-12 w-full shrink-0 border-2 font-semibold sm:h-11 sm:flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          type="button"
                          onClick={handleEligibilityCheck}
                          className="h-12 w-full shrink-0 bg-gradient-to-r from-primary to-accent font-bold shadow-md shadow-primary/15 sm:h-11 sm:flex-1 sm:shadow-lg sm:shadow-primary/20"
                        >
                          Continue
                          <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                ) : !showApplicationForm ? (
                  <div className="px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 xl:px-12">
                    <div className="mx-auto max-w-6xl 2xl:max-w-7xl">
                      {/* Mobile: summary + benefits first; desktop: main | sidebar */}
                      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-12">
                        {/* Main column */}
                        <div className="order-2 space-y-6 sm:space-y-7 lg:order-1 lg:col-span-8 lg:space-y-8">
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

                        <aside className="order-1 lg:order-2 lg:col-span-4">
                          <div className="space-y-5 sm:space-y-6 lg:sticky lg:top-4 lg:space-y-8">
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

                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6 }}
                              className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm sm:p-5 lg:border-2 lg:p-6"
                            >
                              <h4 className="font-heading text-base font-bold uppercase tracking-wide text-foreground mb-5 lg:text-lg">
                                Quick Info
                              </h4>
                              <div className="space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <MapPin className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.location}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Clock className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.type}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Department</p>
                                    <p className="text-sm font-semibold text-foreground lg:text-base">{selectedJob.department}</p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </aside>
                      </div>
                    </div>
                  </div>
                ) : applicationSubmitted ? (
                  <div className="flex min-h-[50vh] items-center justify-center px-4 py-10 sm:min-h-0 sm:px-6 sm:py-12 md:py-16">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto w-full max-w-md text-center"
                    >
                      <div className="mb-5 flex justify-center sm:mb-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 sm:h-20 sm:w-20">
                          <CheckCircle2 className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
                        </div>
                      </div>
                      <h3 className="font-heading text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                        Thank you for applying
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
                        Our team will review your application within <strong className="text-foreground">7–14 days</strong>.
                        Shortlisted candidates will be contacted by phone or email.
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          resetApplicationForm()
                          setSelectedJob(null)
                        }}
                        className="mt-8 h-11 w-full max-w-xs font-semibold sm:mt-10"
                      >
                        Close
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <div className="px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-9 lg:px-12">
                    <div className="mx-auto w-full max-w-lg md:max-w-xl lg:max-w-2xl">
                      <div className="mb-6 text-center sm:mb-8">
                        <p className="text-xs font-medium uppercase tracking-wider text-primary">Application</p>
                        <h3 className="font-heading mt-1 text-xl font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">
                          {selectedJob.title}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                          Three quick steps — your progress is saved as you go.
                        </p>
                      </div>

                      <div className="mb-6 sm:mb-8">
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold sm:text-sm">
                          <span className="text-foreground">Step {applicationStep} of 3</span>
                          <span className="tabular-nums text-primary">{Math.round((applicationStep / 3) * 100)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${(applicationStep / 3) * 100}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
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
                          
                          <div className="space-y-4 sm:space-y-5">
                            <div>
                              <Label htmlFor="fullName" className="mb-2 block text-sm font-semibold">
                                Full name *
                              </Label>
                              <Input
                                id="fullName"
                                value={applicationData.fullName}
                                onChange={(e) => setApplicationData({ ...applicationData, fullName: e.target.value })}
                                className="h-12 text-base sm:h-11"
                                placeholder="Enter your full name"
                                autoComplete="name"
                              />
                            </div>

                            <div>
                              <Label htmlFor="phoneNumber" className="mb-2 block text-sm font-semibold">
                                Phone number *
                              </Label>
                              <Input
                                id="phoneNumber"
                                type="tel"
                                inputMode="tel"
                                value={applicationData.phoneNumber}
                                onChange={(e) => setApplicationData({ ...applicationData, phoneNumber: e.target.value })}
                                className="h-12 text-base sm:h-11"
                                placeholder="e.g. 0712345678 or +254712345678"
                                autoComplete="tel"
                              />
                              <p className="mt-1.5 text-xs text-muted-foreground">We may contact you by phone about your application.</p>
                            </div>

                            <div>
                              <Label htmlFor="email" className="mb-2 block text-sm font-semibold">
                                Email *
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                value={applicationData.email}
                                onChange={(e) => setApplicationData({ ...applicationData, email: e.target.value })}
                                className="h-12 text-base sm:h-11"
                                placeholder="your.email@example.com"
                                autoComplete="email"
                              />
                            </div>

                            <div>
                              <Label htmlFor="countyTown" className="mb-2 block text-sm font-semibold">
                                County / town *
                              </Label>
                              <Input
                                id="countyTown"
                                value={applicationData.countyTown}
                                onChange={(e) => setApplicationData({ ...applicationData, countyTown: e.target.value })}
                                className="h-12 text-base sm:h-11"
                                placeholder="e.g. Nairobi, Nakuru, Mombasa"
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
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-11 sm:text-sm"
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
                                  className="flex min-h-[10rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 transition-all hover:border-primary/50 hover:bg-primary/5 sm:min-h-[9rem]"
                                >
                                  <div className="flex flex-col items-center justify-center text-center">
                                    <Upload className="mb-3 h-9 w-9 text-muted-foreground sm:h-10 sm:w-10" />
                                    <p className="text-sm font-medium text-foreground">
                                      <span className="text-primary">Tap to upload</span>
                                      <span className="text-muted-foreground"> — PDF, max 5MB</span>
                                    </p>
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
                                  className="flex min-h-[10rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 transition-all hover:border-primary/50 hover:bg-primary/5 sm:min-h-[9rem]"
                                >
                                  <div className="flex flex-col items-center justify-center text-center">
                                    <Upload className="mb-3 h-9 w-9 text-muted-foreground sm:h-10 sm:w-10" />
                                    <p className="text-sm font-medium text-foreground">
                                      <span className="text-primary">Certificates</span>
                                      <span className="text-muted-foreground"> — optional, PDF or image</span>
                                    </p>
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

                      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            if (applicationStep > 1) {
                              setApplicationStep(applicationStep - 1)
                            }
                          }}
                          disabled={applicationStep === 1}
                          className="h-12 w-full gap-2 font-semibold sm:h-11 sm:w-auto sm:px-6"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        {applicationStep < 3 ? (
                          <Button
                            type="button"
                            onClick={() => {
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
                            className="h-12 w-full gap-2 bg-gradient-to-r from-primary to-accent font-semibold sm:h-11 sm:w-auto sm:px-8"
                          >
                            Next
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleApplicationSubmit}
                            disabled={!applicationData.cvFile}
                            className="h-12 w-full gap-2 bg-gradient-to-r from-primary to-accent font-bold shadow-md shadow-primary/20 sm:h-11 sm:w-auto sm:px-8 sm:shadow-lg"
                          >
                            Submit
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <footer className="shrink-0 border-t border-border/50 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md sm:pt-4">
                {selectedJob.status === 'closed' ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 text-destructive sm:px-6 sm:py-4">
                    <X className="h-5 w-5 shrink-0" />
                    <span className="text-center text-sm font-medium sm:text-base">This position is no longer accepting applications</span>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
                    {!showApplicationForm && !showEligibilityCheck && (
                      <div className="min-w-0 sm:max-w-[55%] lg:max-w-md">
                        <p className="text-xs text-muted-foreground">Applying for</p>
                        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{selectedJob.title}</p>
                      </div>
                    )}
                    <div className="flex w-full gap-2 sm:ml-auto sm:w-auto sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (showApplicationForm || showEligibilityCheck) {
                            resetApplicationForm()
                          } else {
                            setSelectedJob(null)
                          }
                        }}
                        className="h-11 flex-1 border-2 font-semibold sm:h-12 sm:min-w-[6.5rem] sm:flex-initial sm:px-6"
                      >
                        {showApplicationForm || showEligibilityCheck ? 'Cancel' : 'Close'}
                      </Button>
                      {!showApplicationForm && !showEligibilityCheck && (
                        <Button
                          type="button"
                          onClick={startApplicationFlow}
                          className="h-11 flex-[1.2] bg-gradient-to-r from-primary to-accent font-bold shadow-md shadow-primary/20 sm:h-12 sm:min-w-[10rem] sm:flex-initial sm:px-8 lg:px-10"
                        >
                          Apply now
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </footer>
              </motion.div>
            </motion.div>
          )}
      </main>

      <Footer />
    </div>
  )
}
