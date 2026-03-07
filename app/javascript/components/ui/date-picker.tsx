import * as React from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import Calendar from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  buttonClassName,
  defaultOpen = false,
  allowClear = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
  defaultOpen?: boolean
  allowClear?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const selectedDate = parseDate(value)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
              buttonClassName
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedDate ? format(selectedDate, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? new Date()}
            onSelect={(date) => {
              onChange(date ? format(date, 'yyyy-MM-dd') : '')
              if (date) setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>

      {allowClear && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange('')}
          aria-label="Clear date"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function parseDate(value: string) {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
}
