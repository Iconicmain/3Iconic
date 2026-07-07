'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavBar } from '@/components/isp/nav-bar'
import { Footer } from '@/components/isp/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle2,
  Mail,
  Briefcase,
  MapPin,
  User,
  Phone,
  FileText,
  Link as LinkIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const expertiseAreas = [
  'Fibre Technician',
  'Network Engineer',
  'NOC / Support',
  'Sales & Marketing',
  'Customer Support',
  'Administration',
  'IT / Software',
  'Other',
]

const experienceLevels = [
  { value: '0-1', label: '0-1 years' },
  { value: '2-4', label: '2-4 years' },
  { value: '5+', label: '5+ years' },
]

export default function OpenApplicationPage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    location: '',
    expertise: [] as string[],
    otherExpertise: '',
    yearsExperience: '',
    briefDescription: '',
    cvFile: null as File | null,
    certificatesFile: null as File | null,
    portfolioLink: '',
  })

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleExpertiseToggle = (area: string) => {
    setFormData((prev) => {
      const isSelected = prev.expertise.includes(area)
      if (isSelected) {
        return {
          ...prev,
          expertise: prev.expertise.filter((e) => e !== area),
          otherExpertise: area === 'Other' ? '' : prev.otherExpertise,
        }
      } else {
        return {
          ...prev,
          expertise: [...prev.expertise, area],
        }
      }
    })
  }

  const handleFileChange = (field: 'cvFile' | 'certificatesFile', file: File | null) => {
    if (file) {
      if (field === 'cvFile' && !file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('CV must be a PDF file')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
    }
    handleInputChange(field, file)
  }

  const validateStep = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        if (!formData.fullName || !formData.phoneNumber || !formData.email || !formData.location) {
          toast.error('Please fill in all basic details')
          return false
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          toast.error('Please enter a valid email address')
          return false
        }
        return true
      case 2:
        if (formData.expertise.length === 0) {
          toast.error('Please select at least one area of expertise')
          return false
        }
        if (formData.expertise.includes('Other') && !formData.otherExpertise.trim()) {
          toast.error('Please specify your area of expertise')
          return false
        }
        return true
      case 3:
        if (!formData.yearsExperience) {
          toast.error('Please select your years of experience')
          return false
        }
        if (!formData.briefDescription.trim()) {
          toast.error('Please tell us what you can bring to Iconic Fibre')
          return false
        }
        if (formData.briefDescription.length > 300) {
          toast.error('Description must be 300 characters or less')
          return false
        }
        return true
      case 4:
        if (!formData.cvFile) {
          toast.error('Please upload your CV')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePrevious = () => {
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)
    try {
      const submitFormData = new FormData()
      submitFormData.append('fullName', formData.fullName)
      submitFormData.append('phoneNumber', formData.phoneNumber)
      submitFormData.append('email', formData.email)
      submitFormData.append('location', formData.location)
      submitFormData.append('expertise', JSON.stringify(formData.expertise))
      submitFormData.append('otherExpertise', formData.otherExpertise)
      submitFormData.append('yearsExperience', formData.yearsExperience)
      submitFormData.append('briefDescription', formData.briefDescription)
      submitFormData.append('portfolioLink', formData.portfolioLink)

      if (formData.cvFile) {
        submitFormData.append('cvFile', formData.cvFile)
      }
      if (formData.certificatesFile) {
        submitFormData.append('certificatesFile', formData.certificatesFile)
      }

      const response = await fetch('/api/careers/open-application', {
        method: 'POST',
        body: submitFormData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      setSubmitted(true)
      toast.success('Application submitted successfully!')
    } catch (error) {
      console.error('Error submitting application:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to submit application. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
        <NavBar />
        <main className="relative">
          <section className="relative py-20 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                    <CheckCircle2 className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl mb-4">
                  Thank You!
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  Thank you for your interest in Iconic Fibre.
                </p>
                <p className="text-lg text-muted-foreground mb-2">
                  We've added your profile to our talent pool.
                </p>
                <p className="text-lg text-muted-foreground mb-8">
                  If a suitable role opens up, our team will contact you.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/careers">
                    <Button variant="outline" size="lg">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Careers
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button size="lg">
                      Go to Homepage
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <NavBar />
      <main className="relative">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <Link href="/careers">
                <Button variant="ghost" size="sm" className="mb-6">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Careers
                </Button>
              </Link>
              <h1 className="font-heading text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl mb-4">
                Didn't see a role that fits?
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We're always open to exceptional talent.
              </p>
              <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
                Tell us what you do best. If your skills align with future opportunities at Iconic
                Fibre, we'll reach out.
              </p>
            </motion.div>

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {step} of 4
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {Math.round((step / 4) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Form Steps */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 sm:p-8 lg:p-10">
              {/* Step 1: Basic Details */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                      Basic Details
                    </h2>
                    <p className="text-muted-foreground">Tell us who you are</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name *
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number *
                      </Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        placeholder="+254700000000"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="john@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Current Location *
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="County / Town"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Area of Expertise */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                      Area of Expertise
                    </h2>
                    <p className="text-muted-foreground">
                      Select all that apply (you can select multiple)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {expertiseAreas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleExpertiseToggle(area)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.expertise.includes(area)
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{area}</span>
                          {formData.expertise.includes(area) && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {formData.expertise.includes('Other') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <Label htmlFor="otherExpertise">Please specify *</Label>
                      <Input
                        id="otherExpertise"
                        value={formData.otherExpertise}
                        onChange={(e) => handleInputChange('otherExpertise', e.target.value)}
                        placeholder="Your area of expertise"
                        required
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Experience Snapshot */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                      Experience Snapshot
                    </h2>
                    <p className="text-muted-foreground">Tell us about your experience</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsExperience">Years of Experience *</Label>
                    <select
                      id="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={(e) => handleInputChange('yearsExperience', e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">Select experience level</option>
                      {experienceLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="briefDescription">
                      Briefly tell us what you can bring to Iconic Fibre * (max 300 characters)
                    </Label>
                    <Textarea
                      id="briefDescription"
                      value={formData.briefDescription}
                      onChange={(e) => handleInputChange('briefDescription', e.target.value)}
                      placeholder="What makes you a great fit for Iconic Fibre?"
                      rows={5}
                      maxLength={300}
                      required
                    />
                    <p className="text-sm text-muted-foreground text-right">
                      {formData.briefDescription.length}/300 characters
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Attach CV */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
                      Attach Documents
                    </h2>
                    <p className="text-muted-foreground">Upload your CV and optional documents</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cvFile" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CV/Resume * (PDF only)
                      </Label>
                      <div className="flex items-center gap-4">
                        <Input
                          id="cvFile"
                          type="file"
                          accept=".pdf"
                          onChange={(e) =>
                            handleFileChange('cvFile', e.target.files?.[0] || null)
                          }
                          className="cursor-pointer"
                          required
                        />
                        {formData.cvFile && (
                          <span className="text-sm text-muted-foreground">
                            {formData.cvFile.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificatesFile" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Certificates (Optional - PDF, JPG, PNG)
                      </Label>
                      <Input
                        id="certificatesFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileChange('certificatesFile', e.target.files?.[0] || null)
                        }
                        className="cursor-pointer"
                      />
                      {formData.certificatesFile && (
                        <span className="text-sm text-muted-foreground">
                          {formData.certificatesFile.name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portfolioLink" className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Portfolio / LinkedIn Link (Optional)
                      </Label>
                      <Input
                        id="portfolioLink"
                        type="url"
                        value={formData.portfolioLink}
                        onChange={(e) => handleInputChange('portfolioLink', e.target.value)}
                        placeholder="https://linkedin.com/in/yourprofile or https://yourportfolio.com"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={step === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {step < 4 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

