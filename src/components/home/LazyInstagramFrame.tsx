'use client'

import { useEffect, useRef, useState } from 'react'

interface LazyInstagramFrameProps {
  src: string
  title: string
}

/**
 * Mounts the Instagram embed only when its card is about to scroll into view.
 * Each embed pulls ~400 KB of third-party CSS/JS and sets third-party cookies, so loading
 * all of them on first paint cost the home page seconds of main-thread time for visitors
 * who never scroll that far.
 */
export function LazyInstagramFrame({ src, title }: LazyInstagramFrameProps) {
  const holderRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const holder = holderRef.current
    if (!holder) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(holder)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={holderRef} style={{ width: '100%', height: '100%' }}>
      {visible && (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          scrolling="no"
          style={{
            width: '100%',
            height: '520px',
            marginTop: '-50px',
            border: 'none',
            display: 'block',
            overflow: 'hidden',
          }}
        />
      )}
    </div>
  )
}
