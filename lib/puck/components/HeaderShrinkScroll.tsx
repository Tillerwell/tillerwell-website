'use client'

import { useEffect, useRef } from 'react'

// Toggles data-shrunk on the header element past a scroll threshold. Listens
// on window, which resolves correctly both on the live site and inside the
// Puck editor's canvas iframe (each iframe has its own window/scroll).
//
// Two thresholds, not one. The header sits in flow, so shrinking it removes
// its height delta from the document and drags scrollY back down. With a
// single threshold that lands you under it again, un-shrinks, and the pair
// oscillate every frame. The release point sits a whole header-height below
// the shrink point so the delta can never carry you back across it.
export default function HeaderShrinkScroll({ threshold = 40, children }: { threshold?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const header = ref.current?.firstElementChild as HTMLElement | null
    if (!header) return

    let shrunk = header.hasAttribute('data-shrunk')
    let frame = 0

    function apply() {
      frame = 0
      if (!header) return
      const y = window.scrollY
      // Release point trails the shrink point by the full expanded header
      // height, which is always larger than the shrink delta.
      const release = Math.max(0, threshold - header.offsetHeight)
      const next = shrunk ? y > release : y > threshold
      if (next === shrunk) return
      shrunk = next
      header.toggleAttribute('data-shrunk', next)
    }

    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(apply)
    }

    apply()
    // Arm CSS transitions that must not animate on first paint (e.g. the logo's
    // height, which is resolved from an inline desktop base plus in-body media
    // rules and would otherwise animate big->correct on an uncached load). Set
    // after the first apply(), i.e. past first paint, so only real scroll-driven
    // changes animate. rAF defers it one frame so the initial value is committed
    // transition-free first.
    window.requestAnimationFrame(() => header?.setAttribute('data-shrink-ready', ''))

    // In-page link (#browse). The browser measures the target once, as the jump
    // starts, with the header still expanded. Scrolling then shrinks the header,
    // which pulls everything below it up by the difference (and the logo eases
    // there over a quarter of a second), so a smooth scroll lands short, or is
    // knocked off course by the shift and stops after a few pixels. Shrink the
    // header first, with its transition off, so the target is measured where it
    // will finally sit. Capture phase, so it runs before a router link takes the
    // click over. A direct visit to /#browse never hit this: the jump is
    // instant and happens before any scrolling.
    let rearm = 0
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (!header || shrunk) return
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link || (link.target && link.target !== '_self')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || url.hash.length < 2) return
      let id = url.hash.slice(1)
      try { id = decodeURIComponent(id) } catch { /* keep the raw fragment */ }
      const target = document.getElementById(id)
      if (!target) return
      const margin = parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0
      const finalY = target.getBoundingClientRect().top + window.scrollY - margin
      if (finalY <= threshold) return
      header.removeAttribute('data-shrink-ready')
      shrunk = true
      header.toggleAttribute('data-shrunk', true)
      window.clearTimeout(rearm)
      rearm = window.setTimeout(() => header?.setAttribute('data-shrink-ready', ''), 1500)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', onClick, true)
      window.clearTimeout(rearm)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [threshold])

  return <div ref={ref} style={{ display: 'contents' }}>{children}</div>
}
