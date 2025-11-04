import { create as createIPFS, IPFSHTTPClient } from 'ipfs-http-client'
import { IPFSConfig, StoreResult, RetrieveResult } from './types.js'
import { generateIntegrityMetadata, verifyHash } from './hash.js'

export class IPFSStore {
  private client: IPFSHTTPClient
  private timeout: number

  constructor(config: IPFSConfig) {
    this.client = createIPFS({
      url: config.endpoint,
      timeout: config.timeout || 30000,
    })
    this.timeout = config.timeout || 30000
  }

  async store(data: string | Buffer): Promise<StoreResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    const metadata = generateIntegrityMetadata(buffer)

    const addResult = await this.client.add(buffer, {
      pin: true,
      timeout: this.timeout,
    })

    return {
      hash: metadata.hash,
      size: metadata.size,
      ipfsHash: addResult.cid.toString(),
      timestamp: metadata.timestamp,
    }
  }

  async retrieve(ipfsHash: string): Promise<RetrieveResult> {
    const chunks: Uint8Array[] = []
    
    for await (const chunk of this.client.cat(ipfsHash, { timeout: this.timeout })) {
      chunks.push(chunk)
    }

    const data = Buffer.concat(chunks)
    const metadata = generateIntegrityMetadata(data)

    return {
      data,
      metadata: {
        hash: metadata.hash,
        size: metadata.size,
        timestamp: new Date().toISOString(),
      },
    }
  }

  async pin(ipfsHash: string): Promise<void> {
    await this.client.pin.add(ipfsHash, { timeout: this.timeout })
  }

  async unpin(ipfsHash: string): Promise<void> {
    await this.client.pin.rm(ipfsHash, { timeout: this.timeout })
  }

  async exists(ipfsHash: string): Promise<boolean> {
    try {
      for await (const result of this.client.pin.ls({ paths: [ipfsHash] })) {
        return result.cid.toString() === ipfsHash
      }
      return false
    } catch (error) {
      return false
    }
  }

  async getGatewayUrl(ipfsHash: string, gateway: string = 'https://ipfs.io'): Promise<string> {
    return `${gateway}/ipfs/${ipfsHash}`
  }
}