import { CONSOLE_LOGOS, type ConsoleLogo } from '@/lib/console-logos'

interface ConsoleLogoRowsProps {
  primaryIds?: string[]
  secondaryIds?: string[]
}

function logosFromIds(ids?: string[]) {
  if (!ids?.length) return []
  const byId = new Map(CONSOLE_LOGOS.map((logo) => [logo.id, logo]))
  return ids.map((id) => byId.get(id)).filter((logo): logo is ConsoleLogo => Boolean(logo))
}

function LogoRow({ logos, label, speed }: { logos: ConsoleLogo[]; label: string; speed: string }) {
  if (logos.length === 0) return null
  const repeated = logos.length < 8 ? [...logos, ...logos, ...logos, ...logos] : [...logos, ...logos]

  return (
    <div className="product-console-row" aria-label={label}>
      <div className="product-console-track" style={{ animationDuration: speed }}>
        {repeated.map((logo, index) => (
          <span className="product-console-logo" key={`${logo.id}-${index}`}>
            <img src={logo.src} alt={logo.name} loading="lazy" />
          </span>
        ))}
      </div>
    </div>
  )
}

export function ConsoleLogoRows({ primaryIds, secondaryIds }: ConsoleLogoRowsProps) {
  const primaryLogos = logosFromIds(primaryIds)
  const secondaryLogos = logosFromIds(secondaryIds)
  if (primaryLogos.length === 0 && secondaryLogos.length === 0) return null

  return (
    <div className="product-console-logos">
      <div className="product-console-title">Sistemas incluidos</div>
      <LogoRow logos={primaryLogos} label="Logos principales de consolas" speed="34s" />
      <LogoRow logos={secondaryLogos} label="Logos adicionales de consolas" speed="54s" />
    </div>
  )
}
