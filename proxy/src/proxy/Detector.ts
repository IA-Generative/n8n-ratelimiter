import type { LoggerService } from '../logger/LoggerService.js'
import type { MetricService } from '../metrics/MetricService.js'
import type { DataModifier } from '../modifiers/modifier.js'
import type { ExtractedJson } from './extract.js'
import { ExtractedJsonNumber, ExtractedJsonObject } from './extract.js'

interface Objects {
  dataObj: ExtractedJsonObject | undefined
  optionsObj: ExtractedJsonObject | undefined
  priorityObj: ExtractedJsonNumber | undefined
}

export class Detector {
  private readonly modifier: DataModifier
  private readonly metrics: MetricService
  private readonly logger: LoggerService

  constructor(modifier: DataModifier, metrics: MetricService, logger: LoggerService) {
    this.modifier = modifier
    this.metrics = metrics
    this.logger = logger
  }

  async detectEvalCommand(buffers: Buffer[]): Promise<Buffer[]> {
    this.metrics.requestsTotal.inc({ command: 'parseBuffer', status: 'started' })
    if (!buffers.some(buf => buf.toString('utf-8').toLocaleLowerCase().startsWith('eval'))) {
      this.metrics.requestsTotal.inc({ command: 'parseBuffer', status: 'skipped' })
      return buffers
    }
    const { dataObj, optionsObj, priorityObj } = buffers.reduce(this.manageLine, ({
      dataObj: undefined,
      optionsObj: undefined,
      priorityObj: undefined,
    } as Objects))

    if (!dataObj || !optionsObj || !priorityObj) {
      this.logger.debug('Required data structures not found, skipping modification.')
      this.metrics.requestsTotal.inc({ command: 'parseBuffer', status: 'skipped' })
      // log how many were found in one line
      return buffers
    }

    const modified = await this.modifier.modify(dataObj, optionsObj, priorityObj)
      .catch((err) => {
        this.logger.error({ err }, 'Error modifying data')
        this.metrics.requestsTotal.inc({ command: 'modify', status: 'error' })
        return []
      })
    modified.forEach((mod) => {
      this.logger.debug({ data: mod.toBuffer().toString('utf-8') }, 'Modified')
      buffers[mod.index] = mod.toBuffer()
    })
    this.metrics.requestsTotal.inc({ command: 'parseBuffer', status: 'completed' })
    return buffers
  }

  private manageLine(acc: Objects, bufLine: Buffer, index: number): Objects {
    try {
      if (bufLine.includes(Buffer.from('{'))) {
        const extracted = Detector.extractJson(bufLine)
        if (!extracted)
          return acc
        const value = extracted.getValue()
        if (value.workflowId) {
          extracted.setIndex(index)
          acc.dataObj = extracted
        }
        if (value.priority !== undefined) {
          extracted.setIndex(index)
          acc.optionsObj = extracted
        }
        return acc
      }

      const num = Number(bufLine)
      if (!Number.isNaN(num) && Number.isInteger(num) && num === acc.optionsObj?.getValue().priority) {
        const extracted = Detector.extractJson(bufLine)
        if (!extracted)
          return acc
        extracted.setIndex(index)
        acc.priorityObj = extracted as ExtractedJsonNumber
      }
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (_: unknown) {
    }
    return acc
  }

  private static extractJson(bufLine: Buffer): ExtractedJson | null {
    // Import at runtime to avoid circular dependencies

    const jsonStart = bufLine.indexOf('{')
    const jsonEnd = bufLine.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonString = bufLine.slice(jsonStart, jsonEnd + 1)
      try {
        return new ExtractedJsonObject(bufLine.slice(0, jsonStart), bufLine.slice(jsonEnd + 1), jsonString.toString('utf-8'))
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
      catch (_: unknown) {
        return null
      }
    }
    try {
      const num = Number(bufLine.toString('ascii'))
      if (!Number.isNaN(num)) {
        return new ExtractedJsonNumber(Buffer.alloc(0), Buffer.alloc(0), bufLine.toString('ascii'))
      }
    }
    // eslint-disable-next-line unused-imports/no-unused-vars
    catch (_: unknown) {
    }
    return null
  }
}
