import { detectEvalCommand } from './detector'

export function parseBuffer(buffer: Buffer): Buffer {
  // split buffer into multiple Buffers by \r\n
  const buffers: Buffer[] = []
  let start = 0
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === 13 && buffer[i + 1] === 10) { // \r\n
      buffers.push(buffer.slice(start, i))
      start = i + 2
      i++
    }
  }
  // const strings = buffer.toString('ascii').split('\r\n')
  const editedBuffers = detectEvalCommand(buffers)
  // rejoin Buffers with \r\n
  let finalBuffer: Buffer = Buffer.from('')
  for (let i = 0; i < editedBuffers.length; i++) {
    finalBuffer = Buffer.concat([finalBuffer, editedBuffers[i]])
    finalBuffer = Buffer.concat([finalBuffer, Buffer.from('\r\n', 'ascii')])
  }
  return finalBuffer
}
