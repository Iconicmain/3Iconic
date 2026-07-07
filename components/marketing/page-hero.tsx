import { ReactNode } from 'react'

import { SectionHeading } from '@/components/marketing/section-heading'

type PageHeroProps = {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHero({ eyebrow, title, description, actions }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,157,88,0.08),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,157,88,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,157,88,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          className="max-w-3xl"
        />
        {actions ? <div className="flex flex-wrap gap-4">{actions}</div> : null}
      </div>
    </section>
  )
}

