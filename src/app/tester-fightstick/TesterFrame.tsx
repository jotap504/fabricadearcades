'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const INITIAL_HEIGHT = 960

/**
 * Same-origin iframe that hosts the FightZero GP2040-CE tester (public/tester/fightzero.html).
 * The tester keeps its own dark UI and its own Gamepad API / GPIO pin logic, isolated from
 * the site's CSS. The frame grows with its content so the page has a single scrollbar.
 */
export function TesterFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const [height, setHeight] = useState(INITIAL_HEIGHT)

  // Runs on the iframe's load event and once on mount, so it works whether the frame
  // finished loading before or after React hydrated. An empty body is the initial
  // about:blank document, not the tester, so it is skipped.
  const attach = useCallback(() => {
    const body = frameRef.current?.contentDocument?.body
    if (!body || body.childElementCount === 0) return
    const measure = () => setHeight(Math.ceil(body.getBoundingClientRect().height))
    measure()
    observerRef.current?.disconnect()
    observerRef.current = new ResizeObserver(measure)
    observerRef.current.observe(body)
  }, [])

  useEffect(() => {
    attach()
    return () => observerRef.current?.disconnect()
  }, [attach])

  return (
    <iframe
      ref={frameRef}
      src="/tester/fightzero.html"
      title="Tester de comandos FightZero GP2040-CE"
      allow="gamepad"
      onLoad={attach}
      style={{
        display: 'block',
        width: '100%',
        height,
        border: 0,
        borderRadius: 'var(--radius-lg, 14px)',
        background: '#0f0f0f',
      }}
    />
  )
}
