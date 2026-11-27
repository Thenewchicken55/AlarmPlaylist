import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AlarmCard from '../components/alarm/AlarmCard'
import { makeAlarm } from './factories'

describe('AlarmCard', () => {
  it('shows the time, optional name and repeat summary', () => {
    render(
      <AlarmCard
        alarm={makeAlarm({ name: 'Work', hour: 8, minute: 5, days: [1, 2, 3, 4, 5] })}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('8:05 AM')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Weekdays')).toBeInTheDocument()
  })

  it('describes an unnamed alarm by its time in action labels', () => {
    render(
      <AlarmCard
        alarm={makeAlarm({ name: '   ', hour: 6, minute: 30 })}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Edit alarm "6:30 AM"' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete alarm "6:30 AM"' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Toggle alarm "6:30 AM"' })).toHaveAttribute('aria-checked', 'true')
  })

  it('wires toggle, edit and delete', () => {
    const onToggle = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <AlarmCard
        alarm={makeAlarm({ name: 'Wake', enabled: false })}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit alarm "Wake"' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete alarm "Wake"' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
