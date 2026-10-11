import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

// Google Identity Services: Google renders its own button and hands back a
// signed ID token, which the API verifies (POST /auth/google). Only the public
// client ID is needed here; the OAuth client secret is never used.
const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

const googleClientId: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
  renderButton: (
    parent: HTMLElement,
    options: { theme: string; size: string; width: number; text: string; shape: string; logo_alignment: string },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google sign-in.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void
}

// Renders nothing unless VITE_GOOGLE_CLIENT_ID is set at build time, or if
// Google's script can't load (offline, blocked); password sign-in still works.
export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const [failed, setFailed] = useState(false)

  // Google keeps the callback from the last initialize(); route it through a
  // ref so it always calls the latest props.
  const onCredentialRef = useRef(onCredential)
  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!googleClientId) return
    let cancelled = false

    loadGsiScript()
      .then(() => {
        const container = containerRef.current
        const gsi = window.google?.accounts.id
        if (cancelled || !container || !gsi) return
        gsi.initialize({
          client_id: googleClientId!,
          callback: (response) => onCredentialRef.current(response.credential),
        })
        container.replaceChildren()
        gsi.renderButton(container, {
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          // Google's button takes a pixel width (max 400), not a CSS one.
          width: Math.min(container.offsetWidth || 320, 400),
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'center',
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [resolvedTheme])

  if (!googleClientId || failed) return null

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      {/* Fixed height so the card doesn't jump while Google's iframe loads. */}
      <div ref={containerRef} className="flex h-10 w-full justify-center" />
    </>
  )
}
