import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'left',
  className,
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  return (
    <div className={cn('flex w-full flex-col gap-3', alignment, className)}>
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          {eyebrow}
        </span>
      ) : null}
      <div className="flex w-full flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl font-[var(--font-jakarta)]">
          {title}
        </h2>
        {description ? <p className="text-base text-slate-600 sm:text-lg">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

