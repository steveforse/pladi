import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { fieldButtonClassName } from '@/components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type ParsedOption = {
  type: 'option'
  value: string
  label: string
  disabled: boolean
}

type ParsedGroup = {
  type: 'group'
  label: string
  options: ParsedOption[]
}

type ParsedItem = ParsedOption | ParsedGroup

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  children: React.ReactNode
  onValueChange?: (value: string) => void
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { className, children, disabled, onChange, onValueChange, value, 'aria-label': ariaLabel, ...props },
  ref
) {
  const [open, setOpen] = React.useState(false)
  const items = React.useMemo(() => parseItems(children), [children])
  const selectedValue = value == null ? '' : String(value)
  const selectedOption = findOption(items, selectedValue)
  const triggerLabel = selectedOption?.label ?? ''

  function handleSelect(nextValue: string) {
    if (disabled) return
    onValueChange?.(nextValue)
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <button
          {...buttonLikeProps(props)}
          ref={ref}
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={fieldButtonClassName(
            'group h-9 justify-between px-3 py-1.5 text-sm',
            open && 'bg-accent text-accent-foreground',
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-current group-focus-visible:text-current" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-36 border-border bg-popover p-1" align="start">
        <div className="max-h-80 overflow-y-auto">
          {items.map((item) => (
            item.type === 'group'
              ? (
                <div key={`group-${item.label}`} className="py-1">
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </div>
                  {item.options.map((option) => renderOption(option, selectedValue, handleSelect))}
                </div>
              )
              : renderOption(item, selectedValue, handleSelect)
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
})

function renderOption(
  option: ParsedOption,
  selectedValue: string,
  onSelect: (value: string) => void
) {
  const selected = option.value === selectedValue

  return (
    <button
      key={option.value}
      type="button"
      disabled={option.disabled}
      onPointerDown={(event) => {
        if (event.button !== 0 || option.disabled) return
        event.preventDefault()
        onSelect(option.value)
      }}
      onKeyDown={(event) => {
        if (option.disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(option.value)
        }
      }}
      className={cn(
        'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
        selected
          ? 'bg-muted text-foreground'
          : 'text-popover-foreground hover:bg-muted/70 hover:text-popover-foreground',
        option.disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span>{option.label}</span>
      {selected && <Check className="h-4 w-4 shrink-0" />}
    </button>
  )
}

function parseItems(children: React.ReactNode): ParsedItem[] {
  const items: ParsedItem[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === 'option') {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>
      items.push({
        type: 'option',
        value: String(props.value ?? ''),
        label: stringifyLabel(props.children),
        disabled: Boolean(props.disabled),
      })
      return
    }

    if (child.type === 'optgroup') {
      const props = child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement>
      const options: ParsedOption[] = []
      React.Children.forEach(props.children, (optionChild) => {
        if (!React.isValidElement(optionChild) || optionChild.type !== 'option') return
        const optionProps = optionChild.props as React.OptionHTMLAttributes<HTMLOptionElement>
        options.push({
          type: 'option',
          value: String(optionProps.value ?? ''),
          label: stringifyLabel(optionProps.children),
          disabled: Boolean(optionProps.disabled),
        })
      })
      items.push({
        type: 'group',
        label: String(props.label ?? ''),
        options,
      })
    }
  })

  return items
}

function findOption(items: ParsedItem[], value: string): ParsedOption | null {
  for (const item of items) {
    if (item.type === 'option' && item.value === value) return item
    if (item.type === 'group') {
      const option = item.options.find((entry) => entry.value === value)
      if (option) return option
    }
  }
  return null
}

function stringifyLabel(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  return React.Children.toArray(children).join('')
}

function buttonLikeProps(
  props: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'disabled' | 'onChange' | 'value'>
) {
  const {
    name,
    required,
    autoFocus,
    form,
    ...rest
  } = props

  return {
    'data-name': name,
    'data-required': required,
    autoFocus,
    form,
    ...rest,
  }
}
