import { cn } from '@/lib/utils'

export const fieldSurfaceClassName = 'rounded-md border border-input bg-background text-foreground shadow-sm outline-none transition-[border-color,background-color,color,box-shadow] hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:border-border focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50'

export const fieldButtonClassName = (...classNames: Array<string | false | null | undefined>) =>
  cn(fieldSurfaceClassName, 'inline-flex items-center gap-2 text-sm', ...classNames)
