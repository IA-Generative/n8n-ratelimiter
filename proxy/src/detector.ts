import type { ExtractedJson } from './extract'
import { ExtractedJsonNumber, ExtractedJsonObject } from './extract'
import { modifyDataObject } from './modifier'

interface Objects {
  dataObj: ExtractedJsonObject | undefined
  optionsObj: ExtractedJsonObject | undefined
  priorityObj: ExtractedJsonNumber | undefined
}

function manageLine(acc: Objects, bufLine: Buffer, index: number): Objects {
  try {
    if (bufLine.includes(Buffer.from('{'))) {
      const extracted = extractJson(bufLine)
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
      const extracted = extractJson(bufLine)
      if (!extracted)
        return acc
      extracted.setIndex(index)
      acc.priorityObj = extracted as ExtractedJsonNumber
    }
  }
  catch (_: unknown) {
  }
  return acc
}

export function detectEvalCommand(buffers: Buffer[]): Buffer[] {
  if (!buffers.some(buf => buf.toString('utf-8').toLocaleLowerCase().startsWith('eval'))) {
    return buffers
  }
  const { dataObj, optionsObj, priorityObj } = buffers.reduce(manageLine, ({
    dataObj: undefined,
    optionsObj: undefined,
    priorityObj: undefined,
  } as Objects))

  if (!dataObj || !optionsObj || !priorityObj) {
    return buffers
  }
  const modified = modifyDataObject(dataObj, optionsObj, priorityObj)
  modified.forEach((mod) => {
    console.warn('Modified:', mod.toBuffer().toString('utf-8'))
    buffers[mod.index] = mod.toBuffer()
  })

  return buffers
}

function extractJson(bufLine: Buffer): ExtractedJson | null {
  const jsonStart = bufLine.indexOf('{')
  const jsonEnd = bufLine.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const jsonString = bufLine.slice(jsonStart, jsonEnd + 1)
    try {
      // return {object: JSON.parse(jsonString), startStr: str.substring(0, jsonStart), endStr: str.substring(jsonEnd + 1)};
      return new ExtractedJsonObject(bufLine.slice(0, jsonStart), bufLine.slice(jsonEnd + 1), jsonString.toString('utf-8'))
    }
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
  catch (_: unknown) {
  }
  return null
}
