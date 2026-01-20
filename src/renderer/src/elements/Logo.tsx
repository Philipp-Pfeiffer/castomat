import packageInfo from '../../../../package.json'

export const Logo = () => {
  const version = packageInfo.version

  return (
    <div className="font-sans text-sm text-white/60 select-none font-medium tracking-wide">
      <span className="font-semibold text-white/87">\</span> backslash
      {version && <span className="ml-2 text-xs text-white/40">v{version}</span>}
    </div>
  )
}
