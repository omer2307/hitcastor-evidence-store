export interface EvidenceStoreConfig {
  s3?: S3Config
  ipfs?: IPFSConfig
}

export interface S3Config {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  objectLockEnabled?: boolean
}

export interface IPFSConfig {
  endpoint: string
  timeout?: number
}

export interface StoreResult {
  hash: string
  size: number
  s3Key?: string
  ipfsHash?: string
  timestamp: string
}

export interface RetrieveResult {
  data: Buffer
  metadata: {
    hash: string
    size: number
    timestamp: string
  }
}

export interface EvidenceMetadata {
  hash: string
  size: number
  timestamp: string
  s3Key?: string
  ipfsHash?: string
  verified: boolean
}