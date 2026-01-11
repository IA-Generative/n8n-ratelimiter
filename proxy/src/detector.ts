import type { ExtractedJson } from './extract'
import { ExtractedJsonNumber, ExtractedJsonObject } from './extract'
import { modifyDataObject } from './modifier'

function stringsToBuffer(strings: string[]): Buffer {
  return Buffer.from(strings.join('\r\n'), 'ascii')
}

interface Objects {
  dataObj: ExtractedJsonObject | undefined
  optionsObj: ExtractedJsonObject | undefined
  priorityObj: ExtractedJsonNumber | undefined
}

function manageLine(acc: Objects, str: string, index: number): Objects {
  try {
    if (str.includes('{')) {
      const extracted = extractJson(str)
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
  }
  catch (_: unknown) {
  }
  try {
    const num = Number(str)
    if (!Number.isNaN(num) && Number.isInteger(num) && num === acc.optionsObj?.getValue().priority) {
      const extracted = extractJson(str)
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

export function detectEvalCommand(strings: string[]): Buffer {
  console.warn(strings[1])
  if (!strings.some(str => str.toLocaleLowerCase() === 'eval')) {
    console.warn('Not an EVAL command, forwarding as is.')
    return stringsToBuffer(strings)
  }
  const { dataObj, optionsObj, priorityObj } = strings.reduce(manageLine, ({ dataObj: undefined, optionsObj: undefined, priorityObj: undefined } as Objects))
  if (!dataObj) {
    return stringsToBuffer(strings)
  }
  if (!optionsObj) {
    return stringsToBuffer(strings)
  }
  if (!priorityObj) {
    return stringsToBuffer(strings)
  }
  const modified = modifyDataObject(dataObj, optionsObj, priorityObj)
  const newStrings = strings.map((str, index) => {
    const mod = modified.find(m => m.index === index)
    if (mod) {
      return mod.toBuffer().toString('ascii')
    }
    return str
  })
  for (const mod of modified) {
    newStrings[mod.index] = mod.toBuffer().toString('ascii')
    console.warn({
      index: mod.index,
      newValue: mod.toBuffer().toString('ascii'),
      oldValue: strings[mod.index],
    })
  }
  return stringsToBuffer(newStrings)
}

function extractJson(str: string): ExtractedJson | null {
  const jsonStart = str.indexOf('{')
  const jsonEnd = str.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const jsonString = str.slice(jsonStart, jsonEnd + 1)
    try {
      // return {object: JSON.parse(jsonString), startStr: str.substring(0, jsonStart), endStr: str.substring(jsonEnd + 1)};
      return new ExtractedJsonObject(str.slice(0, jsonStart), str.slice(jsonEnd + 1), jsonString)
    }
    catch (_: unknown) {
      return null
    }
  }
  try {
    const num = Number(str)
    if (!Number.isNaN(num)) {
      return new ExtractedJsonNumber('', '', str)
    }
  }
  catch (_: unknown) {
  }
  return null
}
