export class ExtractedJson {
  startBuf: Buffer
  endBuf: Buffer
  objectStr: string
  value: any
  index: number

  constructor(startBuf: Buffer, endBuf: Buffer, objectStr: string) {
    this.startBuf = startBuf
    this.endBuf = endBuf
    this.objectStr = objectStr
    this.value = JSON.parse(objectStr)
    this.index = -1
  }

  setIndex(index: number): void {
    this.index = index
  }

  toBuffer(): Buffer {
    return Buffer.concat([this.startBuf, Buffer.from(this.objectStr, 'ascii'), this.endBuf])
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

  constructor(startBuf: Buffer, endBuf: Buffer, objectStr: string) {
    super(startBuf, endBuf, objectStr)
    this.value = JSON.parse(objectStr) as Record<string, any>
  }

  getValue(): Record<string, any> {
    return this.value
  }
}

export class ExtractedJsonNumber extends ExtractedJson {
  value: number

  constructor(startBuf: Buffer, endBuf: Buffer, objectStr: string) {
    super(startBuf, endBuf, objectStr)
    this.value = JSON.parse(objectStr) as number
  }

  getValue(): number {
    return this.value
  }
}
