import crypto from 'crypto'

export function sha256(input: string | Buffer): string {
  const hash = crypto.createHash('sha256')
  hash.update(input)
  return '0x' + hash.digest('hex')
}

export function verifyHash(data: string | Buffer, expectedHash: string): boolean {
  const computedHash = sha256(data)
  return computedHash === expectedHash
}

export function generateIntegrityMetadata(data: string | Buffer): {
  hash: string
  size: number
  timestamp: string
} {
  return {
    hash: sha256(data),
    size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8'),
    timestamp: new Date().toISOString()
  }
}