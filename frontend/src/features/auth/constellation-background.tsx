import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

const MAX_LINK_DISTANCE = 130
const MOUSE_RADIUS = 160

function getPrimaryColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#146466'
}

// Canvas particle network + a CSS grid-with-spotlight texture beneath it, both
// confined to the login page. Mouse-interactive on desktop (pointer: fine);
// lighter and ambient-only on touch/small screens. Renders one static frame
// under prefers-reduced-motion instead of animating.
export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      gridRef.current?.style.setProperty('--mx', `${event.clientX}px`)
      gridRef.current?.style.setProperty('--my', `${event.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const primaryColor = getPrimaryColor()

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let animationFrame = 0
    const mouse = { x: -9999, y: -9999 }

    function seedParticles() {
      const area = width * height
      const baseCount = Math.max(40, Math.min(90, Math.floor(area / 16000)))
      const count = isCoarsePointer ? Math.round(baseCount / 3) : baseCount
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }))
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1
      width = canvas!.clientWidth
      height = canvas!.clientHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seedParticles()
    }

    function drawFrame() {
      ctx!.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < MAX_LINK_DISTANCE) {
            ctx!.globalAlpha = 0.35 * (1 - dist / MAX_LINK_DISTANCE)
            ctx!.strokeStyle = primaryColor
            ctx!.lineWidth = 1
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.stroke()
          }
        }

        if (!isCoarsePointer) {
          const dx = particles[i].x - mouse.x
          const dy = particles[i].y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < MOUSE_RADIUS) {
            ctx!.globalAlpha = 0.4 * (1 - dist / MOUSE_RADIUS)
            ctx!.strokeStyle = primaryColor
            ctx!.lineWidth = 1
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(mouse.x, mouse.y)
            ctx!.stroke()
          }
        }
      }

      ctx!.globalAlpha = 0.7
      ctx!.fillStyle = primaryColor
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    function step() {
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        if (!isCoarsePointer) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < MOUSE_RADIUS && dist > 0) {
            const push = (1 - dist / MOUSE_RADIUS) * 0.4
            p.x += (dx / dist) * push
            p.y += (dy / dist) * push
          }
        }
      }
      drawFrame()
      animationFrame = requestAnimationFrame(step)
    }

    function handleMouseMove(event: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReducedMotion) {
      drawFrame()
    } else {
      if (!isCoarsePointer) window.addEventListener('mousemove', handleMouseMove)
      animationFrame = requestAnimationFrame(step)
    }

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        ref={gridRef}
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px 48px), repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px 48px)',
          opacity: 0.35,
          maskImage: 'radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), black, transparent)',
          WebkitMaskImage: 'radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), black, transparent)',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
