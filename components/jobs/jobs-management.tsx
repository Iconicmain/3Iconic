'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Briefcase, MapPin, Clock, X, Eye, EyeOff } from 'lucide-react'
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
  salary?: string
  experience?: string
  applicationDeadline?: string
  responsibilities?: string[]
  skills?: string[]
  applicationEmail?: string
  safetyNote?: string
  status?: 'open' | 'closed'
  applications?: number
  postedDate?: string
}

const DEPARTMENTS = ['Operations', 'Engineering', 'Support', 'Sales']
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']
const LOCATIONS = ['Nairobi', 'Mombasa', 'Nyeri', 'Nakuru', 'Thika', 'Nanyuki', 'Embu', 'Kirinyaga', 'Muranga', 'Remote']
const EXPERIENCE_LEVELS = ['Entry Level', '1-2 years', '3-5 years', '5+ years', 'Senior', 'Executive']

export function JobsManagement() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [filterDept, setFilterDept] = useState<string>('all')
  const [newRequirement, setNewRequirement] = useState('')
  const [newBenefit, setNewBenefit] = useState('')
  const [newResponsibility, setNewResponsibility] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [newMinimumReq, setNewMinimumReq] = useState('')
  const [newNiceToHave, setNewNiceToHave] = useState('')
  const [formData, setFormData] = useState<Partial<Job>>({
    title: '',
    department: 'Operations',
    location: 'Nairobi',
    type: 'Full-time',
    description: '',
    roleOverview: '',
    requirements: [],
    minimumRequirements: [],
    niceToHave: [],
    benefits: [],
    salary: '',
    experience: '',
    applicationDeadline: '',
    responsibilities: [],
    skills: [],
    applicationEmail: '',
    safetyNote: '',
    status: 'open',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      } else {
        // Fallback to dummy data
        const { jobs } = await import('@/lib/isp-data')
        setJobs(jobs)
      }
    } catch (error) {
      // Fallback to dummy data
      const { jobs } = await import('@/lib/isp-data')
      setJobs(jobs)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs'
      const method = editingJob ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success(editingJob ? 'Job updated successfully' : 'Job created successfully')
        setIsDialogOpen(false)
        resetForm()
        fetchJobs()
      } else {
        toast.error('Failed to save job')
      }
    } catch (error) {
      toast.error('Error saving job')
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!deleteJobId) return

    try {
      const response = await fetch(`/api/jobs/${deleteJobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Job deleted successfully')
        setDeleteJobId(null)
        fetchJobs()
      } else {
        toast.error('Failed to delete job')
      }
    } catch (error) {
      toast.error('Error deleting job')
      console.error(error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      department: 'Operations',
      location: 'Nairobi',
      type: 'Full-time',
      description: '',
      roleOverview: '',
      requirements: [],
      minimumRequirements: [],
      niceToHave: [],
      benefits: [],
      salary: '',
      experience: '',
      applicationDeadline: '',
      responsibilities: [],
      skills: [],
      applicationEmail: '',
      safetyNote: '',
      status: 'open',
    })
    setEditingJob(null)
    setNewRequirement('')
    setNewBenefit('')
    setNewResponsibility('')
    setNewSkill('')
    setNewMinimumReq('')
    setNewNiceToHave('')
  }

  const openEditDialog = (job: Job) => {
    setEditingJob(job)
    setFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description,
      roleOverview: job.roleOverview || '',
      requirements: [...(job.requirements || [])],
      minimumRequirements: [...(job.minimumRequirements || [])],
      niceToHave: [...(job.niceToHave || [])],
      benefits: [...(job.benefits || [])],
      salary: job.salary || '',
      experience: job.experience || '',
      applicationDeadline: job.applicationDeadline || '',
      responsibilities: [...(job.responsibilities || [])],
      skills: [...(job.skills || [])],
      applicationEmail: job.applicationEmail || '',
      safetyNote: job.safetyNote || '',
      status: job.status || 'open',
    })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({
        ...formData,
        requirements: [...(formData.requirements || []), newRequirement.trim()],
      })
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    const updated = [...(formData.requirements || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, requirements: updated })
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...(formData.benefits || []), newBenefit.trim()],
      })
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    const updated = [...(formData.benefits || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, benefits: updated })
  }

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      setFormData({
        ...formData,
        responsibilities: [...(formData.responsibilities || []), newResponsibility.trim()],
      })
      setNewResponsibility('')
    }
  }

  const removeResponsibility = (index: number) => {
    const updated = [...(formData.responsibilities || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, responsibilities: updated })
  }

  const addSkill = () => {
    if (newSkill.trim()) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill.trim()],
      })
      setNewSkill('')
    }
  }

  const removeSkill = (index: number) => {
    const updated = [...(formData.skills || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, skills: updated })
  }

  const addMinimumRequirement = () => {
    if (newMinimumReq.trim()) {
      setFormData({
        ...formData,
        minimumRequirements: [...(formData.minimumRequirements || []), newMinimumReq.trim()],
      })
      setNewMinimumReq('')
    }
  }

  const removeMinimumRequirement = (index: number) => {
    const updated = [...(formData.minimumRequirements || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, minimumRequirements: updated })
  }

  const addNiceToHave = () => {
    if (newNiceToHave.trim()) {
      setFormData({
        ...formData,
        niceToHave: [...(formData.niceToHave || []), newNiceToHave.trim()],
      })
      setNewNiceToHave('')
    }
  }

  const removeNiceToHave = (index: number) => {
    const updated = [...(formData.niceToHave || [])]
    updated.splice(index, 1)
    setFormData({ ...formData, niceToHave: updated })
  }

  const toggleJobStatus = async (job: Job) => {
    const newStatus = job.status === 'closed' ? 'open' : 'closed'
    try {
      console.log('Toggling job status:', { jobId: job.id, currentStatus: job.status, newStatus })
      
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const responseText = await response.text()
      console.log('Response status:', response.status, 'Response:', responseText)

      if (response.ok) {
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch (e) {
          console.warn('Failed to parse response, but status was OK. Refreshing jobs list...')
          // Even if parsing fails, if status is OK, the update likely succeeded
          fetchJobs()
          toast.success(`Job ${newStatus === 'open' ? 'opened' : 'closed'} successfully`)
          return
        }
        
        toast.success(`Job ${newStatus === 'open' ? 'opened' : 'closed'} successfully`)
        fetchJobs()
      } else {
        // If we get an error, try to verify if the update actually succeeded
        // by checking the job status after a short delay
        let errorData = {}
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          console.error('Failed to parse error response:', responseText)
        }
        
        console.error('Failed to update job status:', errorData, 'Status:', response.status)
        
        // Wait a bit and then refresh to check if the update actually went through
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch(`/api/jobs/${job.id}`)
            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json()
              // If the status actually changed, treat it as success
              if (verifyData.status === newStatus) {
                toast.success(`Job ${newStatus === 'open' ? 'opened' : 'closed'} successfully`)
                fetchJobs()
                return
              }
            }
          } catch (verifyError) {
            console.error('Error verifying job status:', verifyError)
          }
          
          // If verification failed, show the original error
          toast.error(errorData.error || `Failed to update job status (${response.status})`)
        }, 500)
      }
    } catch (error) {
      console.error('Error updating job status:', error)
      // On network errors, still try to refresh to see if it worked
      setTimeout(() => {
        fetchJobs()
      }, 1000)
      toast.error('Error updating job status. Please refresh to verify.')
    }
  }

  const [showClosed, setShowClosed] = useState(true) // Default to showing closed jobs in admin panel
  
  const filteredJobs = (filterDept === 'all' ? jobs : jobs.filter((j) => j.department === filterDept))
    .filter((j) => {
      // In admin panel, always show all jobs (both open and closed)
      // The showClosed toggle can be used to filter if needed, but by default show all
      if (showClosed) return true
      return j.status !== 'closed'
    })

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Positions</h1>
          <p className="text-muted-foreground">Manage open positions and job listings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? 'Edit Job' : 'Add New Job'}</DialogTitle>
              <DialogDescription>
                {editingJob ? 'Update job details' : 'Create a new job position'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="e.g., Field Technician"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Job Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input
                    id="salary"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., KES 50,000 - 80,000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Level</Label>
                  <Select
                    value={formData.experience || ''}
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationDeadline">Application Deadline</Label>
                  <Input
                    id="applicationDeadline"
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationEmail">Application Email *</Label>
                  <Input
                    id="applicationEmail"
                    type="email"
                    value={formData.applicationEmail}
                    onChange={(e) => setFormData({ ...formData, applicationEmail: e.target.value })}
                    required
                    placeholder="careers@iconicfibre.co.ke"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'open'}
                    onValueChange={(value) => setFormData({ ...formData, status: value as 'open' | 'closed' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleOverview">Role Overview *</Label>
                <Textarea
                  id="roleOverview"
                  value={formData.roleOverview}
                  onChange={(e) => setFormData({ ...formData, roleOverview: e.target.value })}
                  required
                  rows={3}
                  placeholder="Brief overview of the role and what makes it unique..."
                />
                <p className="text-xs text-muted-foreground">This appears at the top of the job posting</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Job Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Additional details about the role, company culture, etc..."
                />
              </div>

              <div className="space-y-2">
                <Label>Key Responsibilities</Label>
                <div className="flex gap-2">
                  <Input
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                    placeholder="Add responsibility..."
                  />
                  <Button type="button" onClick={addResponsibility} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.responsibilities?.map((resp, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {resp}
                      <button
                        type="button"
                        onClick={() => removeResponsibility(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>What We're Looking For (Requirements)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                    placeholder="Add requirement (e.g., Proven experience, Skills, etc.)..."
                  />
                  <Button type="button" onClick={addRequirement} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.requirements?.map((req, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {req}
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Requirements *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newMinimumReq}
                    onChange={(e) => setNewMinimumReq(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMinimumRequirement())}
                    placeholder="Add minimum requirement (e.g., 1 year experience, Valid ID, etc.)..."
                  />
                  <Button type="button" onClick={addMinimumRequirement} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.minimumRequirements?.map((req, index) => (
                    <Badge key={index} variant="default" className="gap-1">
                      {req}
                      <button
                        type="button"
                        onClick={() => removeMinimumRequirement(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nice to Have (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newNiceToHave}
                    onChange={(e) => setNewNiceToHave(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNiceToHave())}
                    placeholder="Add nice-to-have qualification..."
                  />
                  <Button type="button" onClick={addNiceToHave} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.niceToHave?.map((req, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      {req}
                      <button
                        type="button"
                        onClick={() => removeNiceToHave(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills & Competencies</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add skill (e.g., JavaScript, Project Management, etc.)..."
                  />
                  <Button type="button" onClick={addSkill} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills?.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>What We Offer (Benefits)</Label>
                <div className="flex gap-2">
                  <Input
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    placeholder="Add benefit..."
                  />
                  <Button type="button" onClick={addBenefit} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.benefits?.map((benefit, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {benefit}
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="safetyNote">Safety Note (Optional)</Label>
                <Textarea
                  id="safetyNote"
                  value={formData.safetyNote}
                  onChange={(e) => setFormData({ ...formData, safetyNote: e.target.value })}
                  rows={2}
                  placeholder="Any safety considerations or requirements for this role..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingJob ? 'Update' : 'Create'} Job</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterDept === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterDept('all')}
            size="sm"
          >
            All
          </Button>
          {DEPARTMENTS.map((dept) => (
            <Button
              key={dept}
              variant={filterDept === dept ? 'default' : 'outline'}
              onClick={() => setFilterDept(dept)}
              size="sm"
            >
              {dept}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={showClosed ? 'default' : 'outline'}
            onClick={() => setShowClosed(!showClosed)}
            size="sm"
          >
            {showClosed ? 'Show All' : 'Show Open Only'}
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredJobs.map((job) => (
          <Card 
            key={job.id}
            className={job.status === 'closed' ? 'border-destructive/50 bg-muted/30 opacity-75' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {job.title}
                    {job.status === 'closed' ? (
                      <Badge variant="destructive" className="text-xs font-semibold">CLOSED</Badge>
                    ) : (
                      <Badge variant="default" className="text-xs font-semibold bg-green-600 hover:bg-green-700">ACTIVE</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                    {job.status === 'closed' && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <EyeOff className="h-3 w-3" />
                        Not Accepting Applications
                      </Badge>
                    )}
                    {job.status === 'open' && (
                      <Badge variant="default" className="gap-1 text-xs bg-green-600 hover:bg-green-700">
                        <Eye className="h-3 w-3" />
                        Accepting Applications
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {job.department}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                    <Badge className="gap-1">
                      <Clock className="h-3 w-3" />
                      {job.type}
                    </Badge>
                    <Badge variant="outline" className="gap-1 font-semibold">
                      📄 {job.applications || 0} Application{(job.applications || 0) !== 1 ? 's' : ''}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(job)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleJobStatus(job)}
                  className={job.status === 'closed' ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}
                >
                  {job.status === 'closed' ? (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Open
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Close
                    </>
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteJobId(job.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Job Position?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the job position "{job.title}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No jobs found in this category.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

