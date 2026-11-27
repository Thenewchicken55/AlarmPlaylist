import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

function createStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value))
    },
  } as Storage
}

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
}

beforeEach(() => {
  // uiStore reads localStorage when it is imported; stub it before the dynamic
  // import below so the module can be evaluated in this environment.
  vi.stubGlobal('localStorage', createStorage())
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery(true)),
  )
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('applies explicit themes and follows the system preference', async () => {
    const { useTheme } = await import('../hooks/useTheme')
    const { useUIStore } = await import('../stores/uiStore')
    renderHook(() => useTheme())

    act(() => useUIStore.setState({ theme: 'dark' }))
    expect(document.documentElement).toHaveClass('dark')

    act(() => useUIStore.setState({ theme: 'light' }))
    expect(document.documentElement).not.toHaveClass('dark')

    act(() => useUIStore.setState({ theme: 'system' }))
    expect(document.documentElement).toHaveClass('dark')
  })
})
