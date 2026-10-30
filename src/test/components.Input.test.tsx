import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Input from '../components/ui/Input'
import TimePicker from '../components/ui/TimePicker'

describe('Input', () => {
  it('associates the label with the input even without an explicit id', () => {
    render(<Input label="Name" />)
    expect(screen.getByLabelText('Name')).toBeTruthy()
  })
})

describe('TimePicker', () => {
  it('exposes accessible names and AM/PM pressed state', () => {
    render(<TimePicker hour={7} minute={30} onChange={() => {}} />)
    expect(screen.getByLabelText('Hour')).toBeTruthy()
    expect(screen.getByLabelText('Minute')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'AM' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'PM' }).getAttribute('aria-pressed')).toBe('false')
  })
})
