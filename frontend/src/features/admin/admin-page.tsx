import { Navigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/page-header'
import { useAuth } from '@/context/auth-context'
import { DepartmentsTab } from './departments'
import { PrincipalInvestigatorsTab } from './principal-investigators'
import { ResearchGroupsTab } from './research-groups'
import { ResearchersTab } from './researchers'
import { EquipmentTypesTab } from './equipment-types'
import { RoomsTab } from './rooms'
import { CompaniesTab } from './companies'

const TABS = [
  { value: 'departments', label: 'Departments' },
  { value: 'pis', label: 'Principal investigators' },
  { value: 'research-groups', label: 'Research groups' },
  { value: 'researchers', label: 'Researchers' },
  { value: 'equipment-types', label: 'Equipment types' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'companies', label: 'Companies' },
]

export function AdminPage() {
  const { user } = useAuth()
  if (user?.role !== 'SuperAdmin') return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Settings}
        title="Admin"
        description="Manage the master data equipment and bookings depend on."
      />

      <Tabs defaultValue="departments">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="departments">
          <DepartmentsTab />
        </TabsContent>
        <TabsContent value="pis">
          <PrincipalInvestigatorsTab />
        </TabsContent>
        <TabsContent value="research-groups">
          <ResearchGroupsTab />
        </TabsContent>
        <TabsContent value="researchers">
          <ResearchersTab />
        </TabsContent>
        <TabsContent value="equipment-types">
          <EquipmentTypesTab />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
