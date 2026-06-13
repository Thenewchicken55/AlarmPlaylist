import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../components/ui/Modal'

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal open title="Test" onClose={vi.fn()}>Content</Modal>)
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Modal open={false} title="Test" onClose={vi.fn()}>Content</Modal>)
    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal open title="Test" onClose={onClose}>Content</Modal>)
    fireEvent.click(container.querySelector('.bg-black\\/60') ?? container.firstChild!)
    expect(onClose).toHaveBeenCalled()
  })
})
