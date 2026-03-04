import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TokenInput } from '@/components/ui/TokenInput'

describe('TokenInput', () => {
  it('renders password input by default and toggles visibility', async () => {
    const view = render(
      <TokenInput value="secret" onChange={() => {}} />
    )

    const input = screen.getByDisplayValue('secret')
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show token' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show token' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide token' })).toBeInTheDocument()
    view.unmount()
  })

  it('propagates change and blur callbacks', async () => {
    const onChange = vi.fn()
    const onBlur = vi.fn()

    function ControlledTokenInput() {
      const [value, setValue] = React.useState('')
      return (
        <TokenInput
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue)
            onChange(nextValue)
          }}
          onBlur={onBlur}
          placeholder="Token"
          className="my-class"
        />
      )
    }

    const view = render(<ControlledTokenInput />)

    const input = screen.getByPlaceholderText('Token')
    expect(input).toHaveClass('my-class')

    await userEvent.type(input, 'abc')
    expect(onChange).toHaveBeenLastCalledWith('abc')

    await userEvent.tab()
    expect(onBlur).toHaveBeenCalledWith('abc')
    view.unmount()
  })
})
