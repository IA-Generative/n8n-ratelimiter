import { detectEvalCommand } from './detector'

export function parseBuffer(buffer: Buffer): Buffer {
  const strings = buffer.toString('ascii').split('\r\n')

  return detectEvalCommand(strings)
}
