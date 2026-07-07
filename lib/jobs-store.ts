import { jobs } from './isp-data'

interface Job {
  id: string
  title: string
  department: string
  location: string
  type: string
  description: string
  requirements: string[]
  benefits: string[]
  salary?: string
  experience?: string
  applicationDeadline?: string
  responsibilities?: string[]
  skills?: string[]
  applicationEmail?: string
  status?: 'open' | 'closed'
  postedDate?: string
}

// Shared in-memory storage for jobs
// In production, this should be replaced with MongoDB
let jobsData: Job[] = jobs.map((job) => ({
  ...job,
  status: (job as any).status || 'open',
}))

export function getJobs(): Job[] {
  return jobsData
}

export function setJobs(jobs: Job[]): void {
  jobsData = jobs
}

export function getJobById(id: string): Job | undefined {
  return jobsData.find((j) => j.id === id)
}

export function addJob(job: Job): void {
  jobsData.push(job)
}

export function updateJob(id: string, updates: Partial<Job>): Job | null {
  const index = jobsData.findIndex((j) => j.id === id)
  if (index === -1) {
    return null
  }
  jobsData[index] = { ...jobsData[index], ...updates, id }
  return jobsData[index]
}

export function deleteJob(id: string): boolean {
  const index = jobsData.findIndex((j) => j.id === id)
  if (index === -1) {
    return false
  }
  jobsData.splice(index, 1)
  return true
}


