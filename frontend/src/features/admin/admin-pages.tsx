import { useSearchParams } from 'react-router-dom'
import { DoorOpen, FlaskConical, SlidersHorizontal, Users } from 'lucide-react'
import { AdminSubpage, type AdminSectionTab } from './admin-layout'
import { McbImportCard, DangerZone, useDemoDataReset, useMcbImport } from './admin-data-tools'
import { DepartmentsTab } from './departments'
import { EquipmentAdminTab } from './equipment-admin-tab'
import { EquipmentTypesTab } from './equipment-types'
import { ExternalTab } from './external'
import { FacilitiesTab } from './facilities'
import { PrincipalInvestigatorsTab } from './principal-investigators'
import { ResearchersTab } from './researchers'
import { ResearchGroupsTab } from './research-groups'
import { RoomsTab } from './rooms'
import { UsersTab } from './users'

export function AdminEquipmentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const typeId = searchParams.get('type')

  return (
    <AdminSubpage
      icon={FlaskConical}
      title="Equipment"
      description="The equipment people can book, and the types it's grouped by."
      sections={[
        {
          value: 'items',
          label: 'Items',
          content: (
            <EquipmentAdminTab
              typeId={typeId}
              onTypeChange={(next) => setSearchParams(next ? { type: next } : {}, { replace: true })}
            />
          ),
        },
        {
          value: 'types',
          label: 'Types',
          content: <EquipmentTypesTab onShowItems={(id) => setSearchParams({ type: String(id) })} />,
        },
      ]}
    />
  )
}

export function AdminRoomsPage() {
  return (
    <AdminSubpage
      icon={DoorOpen}
      title="Rooms"
      description="Where equipment is kept, and the facilities some rooms belong to."
      sections={[
        { value: 'rooms', label: 'Rooms', content: <RoomsTab /> },
        { value: 'facilities', label: 'Facilities', content: <FacilitiesTab /> },
      ]}
    />
  )
}

export function AdminPeoplePage() {
  return (
    <AdminSubpage
      icon={Users}
      title="People"
      description="Who can sign in, who leads each lab, and who uses the equipment."
      sections={[
        { value: 'users', label: 'Users', content: <UsersTab /> },
        { value: 'pis', label: 'Principal investigators', shortLabel: 'PIs', content: <PrincipalInvestigatorsTab /> },
        { value: 'labs', label: 'Labs', content: <ResearchGroupsTab /> },
        { value: 'researchers', label: 'Researchers', content: <ResearchersTab /> },
      ]}
    />
  )
}

export function AdminSettingsPage() {
  // AdminLayout has already checked the role.
  const canReset = useDemoDataReset(true)
  const canImport = useMcbImport(true)

  const sections: AdminSectionTab[] = [
    { value: 'departments', label: 'Departments', content: <DepartmentsTab /> },
    { value: 'external', label: 'External contacts', shortLabel: 'External', content: <ExternalTab /> },
  ]
  if (canImport || canReset) {
    sections.push({
      value: 'data',
      label: 'Data tools',
      shortLabel: 'Data',
      content: (
        <section aria-labelledby="data-tools-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="data-tools-heading" className="text-base font-semibold text-foreground">
              Data tools
            </h2>
            <p className="text-[13px] text-muted-foreground">One-off jobs for setting up LabTracker.</p>
          </div>
          {canImport && <McbImportCard />}
          {canReset && <DangerZone />}
        </section>
      ),
    })
  }

  return (
    <AdminSubpage
      icon={SlidersHorizontal}
      title="Settings"
      description="Departments, outside organizations, and tools for importing or clearing data."
      sections={sections}
    />
  )
}
