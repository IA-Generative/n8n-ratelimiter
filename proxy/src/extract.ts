export class ExtractedJson {
  startStr: string
  endStr: string
  objectStr: string
  value: any
  index: number

  constructor(startStr: string, endStr: string, objectStr: string) {
    this.startStr = startStr
    this.endStr = endStr
    this.objectStr = objectStr
    this.value = JSON.parse(objectStr)
    this.index = -1
  }

  setIndex(index: number): void {
    this.index = index
  }

  toBuffer(): Buffer {
    const fullString = this.startStr + this.objectStr + this.endStr
    return Buffer.from(fullString, 'ascii')
  }

  getValue(): any {
    return this.value
  }

  setValue(value: Record<string, any> | number): void {
    this.value = value
    this.objectStr = JSON.stringify(value)
  }
}

export class ExtractedJsonObject extends ExtractedJson {
  value: Record<string, any>

  constructor(startStr: string, endStr: string, objectStr: string) {
    super(startStr, endStr, objectStr)
    this.value = JSON.parse(objectStr) as Record<string, any>
  }

  getValue(): Record<string, any> {
    return this.value
  }
}

export class ExtractedJsonNumber extends ExtractedJson {
  value: number

  constructor(startStr: string, endStr: string, objectStr: string) {
    super(startStr, endStr, objectStr)
    this.value = JSON.parse(objectStr) as number
  }

  getValue(): number {
    return this.value
  }
}
