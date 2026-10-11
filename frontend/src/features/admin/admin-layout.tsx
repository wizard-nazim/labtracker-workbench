import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { Joyride } from 'react-joyride'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/context/auth-context'
import { useAdminTour } from '@/features/onboarding/use-admin-tour'

export type AdminTour = ReturnType<typeof useAdminTour>

// Parent route for /admin and its four pages: checks the role once and hosts
// the admin tour, which moves between the hub and the Equipment page.
export function AdminLayout() {
  const { user } = useAuth()
  const tour = useAdminTour()
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <>
      <Joyride
        steps={tour.steps}
        run={tour.run}
        onEvent={tour.handleEvent}
        continuous
        options={{
          showProgress: true,
          skipBeacon: true,
          buttons: ['back', 'skip', 'primary'],
          primaryColor: 'var(--primary)',
          backgroundColor: 'var(--popover)',
          textColor: 'var(--popover-foreground)',
          arrowColor: 'var(--popover)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      <Outlet context={tour} />
    </>
  )
}

export interface AdminSectionTab {
  value: string
  label: string
  // Used below sm where the full label won't fit, e.g. "PIs".
  shortLabel?: string
  content: ReactNode
}

// One admin page: a way back to the hub, the slim header, and a segmented
// control switching between its sections. The open section is kept in the
// URL (?section=) so links, reloads and the back button land on it.
export function AdminSubpage({
  icon,
  title,
  description,
  sections,
}: {
  icon: LucideIcon
  title: string
  description: string
  sections: AdminSectionTab[]
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('section')
  const current = sections.some((s) => s.value === requested) ? requested! : sections[0].value

  function selectSection(value: string) {
    // Filters belong to a section, so switching drops them.
    setSearchParams(value === sections[0].value ? {} : { section: value }, { replace: true })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Admin
      </Link>

      <PageHeader icon={icon} title={title} description={description} />

      <Tabs value={current} onValueChange={selectSection} className="min-w-0 gap-4">
        {sections.length > 1 && (
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="w-full sm:w-fit">
              {sections.map((section) => (
                <TabsTrigger key={section.value} value={section.value} className="px-3">
                  {section.shortLabel ? (
                    <>
                      <span className="sm:hidden">{section.shortLabel}</span>
                      <span className="hidden sm:inline">{section.label}</span>
                    </>
                  ) : (
                    section.label
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}
        {sections.map((section) => (
          <TabsContent key={section.value} value={section.value} className="min-w-0">
            {section.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
