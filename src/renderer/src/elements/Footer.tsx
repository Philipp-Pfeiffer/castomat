import { Logo } from '@renderer/elements/Logo'

export const Footer = ({ children }) => (
  <footer className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 bg-white/5">
    <Logo />
    <div className="text-sm text-white/60 select-none">{children}</div>
  </footer>
)
