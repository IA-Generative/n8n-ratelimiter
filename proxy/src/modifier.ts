import type { ExtractedJson, ExtractedJsonNumber, ExtractedJsonObject } from './extract'

export function modifyDataObject(
  dataObj: ExtractedJsonObject,
  optionsObj: ExtractedJsonObject,
  priorityObj: ExtractedJsonNumber,
): ExtractedJson[] {
  // decrease priority by 20
  const currentPriority = priorityObj.getValue()
  const newPriority = Math.max(0, currentPriority + 100)
  priorityObj.setValue(newPriority)

  const currentOpts = optionsObj.getValue()

  currentOpts.priority = newPriority
  optionsObj.setValue(currentOpts)
  return [dataObj, optionsObj, priorityObj]
}
