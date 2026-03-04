import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EditableCell } from '@/components/movies/EditableCell'

function renderInTable(node: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{node}</tr>
      </tbody>
    </table>
  )
}

describe('EditableCell', () => {
  it('enters text edit mode and saves on Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = renderInTable(
      <EditableCell
        value="Alpha"
        fieldType="text"
        onSave={onSave}
        renderView={() => <span>Alpha</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Alpha'))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'Beta{enter}')

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Beta')
    })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    view.unmount()
  })

  it('skips save when scalar value is unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = renderInTable(
      <EditableCell
        value="Same"
        fieldType="text"
        onSave={onSave}
        renderView={() => <span>Same</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Same'))
    const input = screen.getByRole('textbox')
    await userEvent.click(input)
    await userEvent.tab()

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled()
    })
    view.unmount()
  })

  it('shows error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed hard'))

    const view = renderInTable(
      <EditableCell
        value="Alpha"
        fieldType="text"
        onSave={onSave}
        renderView={() => <span>Alpha</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Alpha'))
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Z{enter}')

    expect(await screen.findByText('Save failed hard')).toBeInTheDocument()
    view.unmount()
  })

  it('edits tags with enter/comma and saves on blur', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = renderInTable(
      <EditableCell
        value={['Action']}
        fieldType="tags"
        onSave={onSave}
        renderView={() => <span>Action</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Action'))

    const tagInput = screen.getByPlaceholderText('Add tag…')
    await userEvent.type(tagInput, 'Drama{enter}')
    await userEvent.type(tagInput, 'Sci-Fi,')
    await userEvent.tab()

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(['Action', 'Drama', 'Sci-Fi'])
    })
    view.unmount()
  })

  it('supports tag editing escape/backspace/remove interactions', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = renderInTable(
      <EditableCell
        value={['Action', 'Drama']}
        fieldType="tags"
        onSave={onSave}
        renderView={() => <span>Action, Drama</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Action, Drama'))
    const input = screen.getByPlaceholderText('Add tag…')

    await userEvent.type(input, '{backspace}')
    await waitFor(() => expect(screen.queryByText('Drama')).not.toBeInTheDocument())

    const removeButtons = screen.getAllByRole('button')
    fireEvent.mouseDown(removeButtons[0])
    await waitFor(() => expect(screen.queryByText('Action')).not.toBeInTheDocument())

    await userEvent.type(input, 'Keep{escape}')
    await waitFor(() => expect(screen.queryByPlaceholderText('Add tag…')).not.toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
    view.unmount()
  })

  it('cancels scalar editing with Escape', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)

    const view = renderInTable(
      <EditableCell
        value="Alpha"
        fieldType="text"
        onSave={onSave}
        renderView={() => <span>Alpha</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Alpha'))
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'X{escape}')

    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
    view.unmount()
  })

  it('uses generic save error message for non-Error rejections', async () => {
    const onSave = vi.fn().mockRejectedValue('bad')

    const view = renderInTable(
      <EditableCell
        value="Alpha"
        fieldType="text"
        onSave={onSave}
        renderView={() => <span>Alpha</span>}
      />
    )

    await userEvent.dblClick(screen.getByText('Alpha'))
    await userEvent.type(screen.getByRole('textbox'), 'Z{enter}')

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
    view.unmount()
  })
})
