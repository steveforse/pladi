import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders a native button with default classes', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('h-10')
  })

  it('supports rendering as child element', () => {
    render(
      <Button asChild variant="link" size="sm">
        <a href="/settings">Settings</a>
      </Button>
    )

    const link = screen.getByRole('link', { name: 'Settings' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/settings')
    expect(link).toHaveClass('underline-offset-4')
    expect(link).toHaveClass('h-9')
  })
})
