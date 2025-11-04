export { EvidenceStore } from './lib/evidence-store.js'
export { S3Store } from './lib/s3-store.js'
export { IPFSStore } from './lib/ipfs-store.js'
export { sha256, verifyHash, generateIntegrityMetadata } from './lib/hash.js'
export type {
  EvidenceStoreConfig,
  S3Config,
  IPFSConfig,
  StoreResult,
  RetrieveResult,
  EvidenceMetadata,
} from './lib/types.js'