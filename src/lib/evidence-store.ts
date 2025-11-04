import { S3Store } from './s3-store.js'
import { IPFSStore } from './ipfs-store.js'
import { EvidenceStoreConfig, StoreResult, RetrieveResult, EvidenceMetadata } from './types.js'
import { generateIntegrityMetadata, verifyHash } from './hash.js'

export class EvidenceStore {
  private s3Store?: S3Store
  private ipfsStore?: IPFSStore

  constructor(config: EvidenceStoreConfig) {
    if (config.s3) {
      this.s3Store = new S3Store(config.s3)
    }
    if (config.ipfs) {
      this.ipfsStore = new IPFSStore(config.ipfs)
    }

    if (!this.s3Store && !this.ipfsStore) {
      throw new Error('At least one store (S3 or IPFS) must be configured')
    }
  }

  async store(data: string | Buffer, options?: { s3Key?: string }): Promise<StoreResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    const metadata = generateIntegrityMetadata(buffer)
    
    const results = await Promise.allSettled([
      this.s3Store?.store(buffer, options?.s3Key),
      this.ipfsStore?.store(buffer),
    ].filter(Boolean))

    const result: StoreResult = {
      hash: metadata.hash,
      size: metadata.size,
      timestamp: metadata.timestamp,
    }

    for (const [index, settlement] of results.entries()) {
      if (settlement.status === 'fulfilled') {
        const storeResult = settlement.value
        if (index === 0 && this.s3Store) {
          result.s3Key = storeResult.s3Key
        } else if ((index === 1 && this.s3Store) || (index === 0 && !this.s3Store)) {
          result.ipfsHash = storeResult.ipfsHash
        }
      }
    }

    const failedStores = results.filter(r => r.status === 'rejected')
    if (failedStores.length === results.length) {
      throw new Error('All storage operations failed')
    }

    return result
  }

  async retrieve(source: { s3Key?: string; ipfsHash?: string }): Promise<RetrieveResult> {
    if (source.s3Key && this.s3Store) {
      try {
        return await this.s3Store.retrieve(source.s3Key)
      } catch (error) {
        if (!source.ipfsHash) throw error
      }
    }

    if (source.ipfsHash && this.ipfsStore) {
      return await this.ipfsStore.retrieve(source.ipfsHash)
    }

    throw new Error('No valid storage source provided or available')
  }

  async verify(data: string | Buffer, expectedHash: string): Promise<boolean> {
    return verifyHash(data, expectedHash)
  }

  async getMetadata(source: { s3Key?: string; ipfsHash?: string }): Promise<EvidenceMetadata> {
    const result = await this.retrieve(source)
    const verified = verifyHash(result.data, result.metadata.hash)

    return {
      hash: result.metadata.hash,
      size: result.metadata.size,
      timestamp: result.metadata.timestamp,
      s3Key: source.s3Key,
      ipfsHash: source.ipfsHash,
      verified,
    }
  }

  async exists(source: { s3Key?: string; ipfsHash?: string }): Promise<{ s3: boolean; ipfs: boolean }> {
    const [s3Exists, ipfsExists] = await Promise.allSettled([
      source.s3Key && this.s3Store ? this.s3Store.exists(source.s3Key) : Promise.resolve(false),
      source.ipfsHash && this.ipfsStore ? this.ipfsStore.exists(source.ipfsHash) : Promise.resolve(false),
    ])

    return {
      s3: s3Exists.status === 'fulfilled' ? s3Exists.value : false,
      ipfs: ipfsExists.status === 'fulfilled' ? ipfsExists.value : false,
    }
  }

  async getSignedUrl(s3Key: string, expiresIn?: number): Promise<string> {
    if (!this.s3Store) {
      throw new Error('S3 store not configured')
    }
    return this.s3Store.getSignedUrl(s3Key, expiresIn)
  }

  async getIPFSGatewayUrl(ipfsHash: string, gateway?: string): Promise<string> {
    if (!this.ipfsStore) {
      throw new Error('IPFS store not configured')
    }
    return this.ipfsStore.getGatewayUrl(ipfsHash, gateway)
  }
}