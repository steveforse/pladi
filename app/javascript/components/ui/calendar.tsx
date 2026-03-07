import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export default function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      captionLayout="dropdown"
      navLayout="around"
      startMonth={new Date(1900, 0)}
      endMonth={new Date(new Date().getFullYear() + 5, 11)}
      classNames={{
        root: 'rdp-root',
        months: 'flex flex-col',
        month: 'grid grid-cols-[auto_1fr_auto] items-end gap-y-4',
        month_caption: 'flex h-8 items-stretch justify-center gap-2 self-end',
        dropdowns: 'flex items-center gap-2',
        dropdown_root: 'relative',
        dropdown: 'h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground shadow-sm',
        nav: 'flex h-8 items-stretch gap-1 self-end',
        button_previous: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-8 w-8 self-end p-0'),
        button_next: cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-8 w-8 self-end p-0'),
        month_grid: 'col-span-3 w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.8rem] font-normal text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        today: 'bg-accent text-accent-foreground',
        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => (
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" {...chevronProps} />
            : <ChevronRight className="h-4 w-4" {...chevronProps} />
        ),
        Dropdown: ({ className: dropdownClassName, components, options, ...dropdownProps }) => (
          <span className="relative inline-flex">
            <components.Select
              className={cn(
                'h-8 appearance-none rounded-md border border-border bg-background px-2 pr-8 text-sm text-foreground shadow-sm outline-none transition-colors hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/25',
                dropdownClassName
              )}
              {...dropdownProps}
            >
              {options?.map((option) => (
                <components.Option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </components.Option>
              ))}
            </components.Select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-primary/80" />
          </span>
        ),
      }}
      {...props}
    />
  )
}
