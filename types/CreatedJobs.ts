export interface CreatedJobs {
  asyncRequest: AsyncRequest
  jobs: Job[]
  unsupportedFiles: any[]
}

export interface AsyncRequest {
  action: string
  dateCreated: string
  id: string
}

export interface Job {
  workflowLevel: number
  workflowStep: WorkflowStep
  imported: boolean
  dateCreated: string
  notificationIntervalInMinutes: number
  updateSourceDate: null
  dateDue: null
  targetLang: string
  continuous: boolean
  jobAssignedEmailTemplate: null
  uid: string
  status: string
  filename: string
  sourceFileUid: string
  providers: any[]
}

export interface WorkflowStep {
  uid: string
  order: number
  id: string
  lqaEnabled: boolean
  name: string
}
