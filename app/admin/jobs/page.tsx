import { checkPagePermission } from '@/lib/permissions'
import { Header } from '@/components/layout/header'
import { JobsManagement } from '@/components/jobs/jobs-management'

export default async function JobsPage() {
  await checkPagePermission('/admin/jobs')

  return (
    <>
      <Header />
      <main className="mt-32 md:mt-0 px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
        <JobsManagement />
      </main>
    </>
  )
}

