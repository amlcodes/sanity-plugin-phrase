export interface CreatedProject {
  internalId: number
  progress: Progress
  dateCreated: string
  references: any[]
  id: string
  analyseSettings: Settings
  targetLangs: string[]
  financialSettings: Settings
  subDomain: null
  sourceLang: string
  businessUnit: null
  purchaseOrder: null
  dateDue: null
  name: string
  type: string
  owner: CreatedBy
  uid: string
  createdBy: CreatedBy
  client: null
  status: string
  note: null
  qualityAssuranceSettings: Settings
  costCenter: null
  domain: null
  isPublishedOnJobBoard: boolean
  archived: boolean
  shared: boolean
  userRole: string
  accessSettings: Settings
  mtSettingsPerLanguageList: MTSettingsPerLanguageList[]
  workflowSteps: WorkflowStepElement[]
}

export interface Settings {
  id: string
}

export interface CreatedBy {
  userName: string
  uid: string
  id: string
  firstName: string
  lastName: string
  role: string
  email: string
}

export interface MTSettingsPerLanguageList {
  machineTranslateSettings: MachineTranslateSettings
  targetLang: string
}

export interface MachineTranslateSettings {
  type: string
  uid: string
  id: string
  name: string
}

export interface Progress {
  overdueCount: number
  totalCount: number
  finishedCount: number
}

export interface WorkflowStepElement {
  workflowLevel: number
  abbreviation: string
  workflowStep: WorkflowStepWorkflowStep
  id: number
  lqaProfileUid: null | string
  name: string
}

export interface WorkflowStepWorkflowStep {
  uid: string
  id: string
}
