import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 p-4 ${className}`} {...props}>
      {children}
    </div>
  )
}
