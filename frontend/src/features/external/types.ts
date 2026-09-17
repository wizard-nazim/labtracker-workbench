export interface ExternalContact {
  id: number
  externalOrganizationId: number
  fullName: string
  email: string
  phone: string | null
}

export interface ExternalOrganization {
  id: number
  name: string
  contacts: ExternalContact[]
}
