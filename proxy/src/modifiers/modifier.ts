import type { N8nRedisCache } from '../cache/N8nRedisCache.js'
import type { LoggerService } from '../logger/LoggerService.js'
import type { MetricService } from '../metrics/MetricService.js'
import type { ExtractedJson, ExtractedJsonNumber, ExtractedJsonObject } from '../proxy/extract.js'

interface WorkflowProjectCache {
  updatedAt: string
  createdAt: string
  id: string
  name: `${string} ${string} <${string}>`
  type: 'personal'
  icon: null
  description: null
}

export class DataModifier {
  private readonly n8nCache: N8nRedisCache
  private readonly metrics: MetricService
  private readonly logger: LoggerService

  constructor(n8nCache: N8nRedisCache, metrics: MetricService, logger: LoggerService) {
    this.n8nCache = n8nCache
    this.metrics = metrics
    this.logger = logger
  }

  async modify(
    dataObj: ExtractedJsonObject,
    optionsObj: ExtractedJsonObject,
    priorityObj: ExtractedJsonNumber,
  ): Promise<ExtractedJson[]> {
    const workflowId = dataObj.getValue().workflowId as string
    const cachedOwner = await this.n8nCache.hget('n8n:cache:workflow-project', workflowId)
    if (!cachedOwner) {
      this.metrics.workflowsRuns.inc({ workflow_id: workflowId, owner_id: 'unknown' })
      return [dataObj, optionsObj, priorityObj]
    }

    const ownerData: WorkflowProjectCache = JSON.parse(cachedOwner)
    this.logger.info({ workflowId, ownerId: ownerData.id, ownerName: ownerData.name }, 'Workflow run')
    this.metrics.workflowsRuns.inc({
      workflow_id: workflowId,
      owner_id: ownerData.id,
      owner_name: ownerData.name,
    })

    return [dataObj, optionsObj, priorityObj]
  }
}
