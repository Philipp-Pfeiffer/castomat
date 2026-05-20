import { Logo } from '@renderer/elements/Logo'

export const Footer = ({ children }) => (
  <footer className="flex items-center justify-between px-5 py-3 glass-divider">
    <Logo />
    <div className="text-sm text-white/50 select-none">{children}</div>
  </footer>
)
