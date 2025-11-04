import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EvidenceStore } from '../lib/evidence-store.js'
import { S3Store } from '../lib/s3-store.js'
import { IPFSStore } from '../lib/ipfs-store.js'

vi.mock('../lib/s3-store.js')
vi.mock('../lib/ipfs-store.js')

describe('EvidenceStore', () => {
  const mockS3Config = {
    endpoint: 'https://s3.amazonaws.com',
    region: 'us-east-1',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
    bucket: 'test-bucket',
  }

  const mockIPFSConfig = {
    endpoint: 'http://localhost:5001',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error if no stores are configured', () => {
    expect(() => new EvidenceStore({})).toThrow('At least one store (S3 or IPFS) must be configured')
  })

  it('should initialize with S3 store only', () => {
    const store = new EvidenceStore({ s3: mockS3Config })
    expect(S3Store).toHaveBeenCalledWith(mockS3Config)
    expect(store).toBeInstanceOf(EvidenceStore)
  })

  it('should initialize with IPFS store only', () => {
    const store = new EvidenceStore({ ipfs: mockIPFSConfig })
    expect(IPFSStore).toHaveBeenCalledWith(mockIPFSConfig)
    expect(store).toBeInstanceOf(EvidenceStore)
  })

  it('should initialize with both stores', () => {
    const store = new EvidenceStore({ s3: mockS3Config, ipfs: mockIPFSConfig })
    expect(S3Store).toHaveBeenCalledWith(mockS3Config)
    expect(IPFSStore).toHaveBeenCalledWith(mockIPFSConfig)
    expect(store).toBeInstanceOf(EvidenceStore)
  })

  describe('store method', () => {
    it('should store data successfully with both stores', async () => {
      const mockS3Store = {
        store: vi.fn().mockResolvedValue({
          hash: '0xabcd',
          size: 9,
          s3Key: 'evidence/abcd',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
      }

      const mockIPFSStore = {
        store: vi.fn().mockResolvedValue({
          hash: '0xabcd',
          size: 9,
          ipfsHash: 'QmTest123',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
      }

      vi.mocked(S3Store).mockImplementation(() => mockS3Store as any)
      vi.mocked(IPFSStore).mockImplementation(() => mockIPFSStore as any)

      const store = new EvidenceStore({ s3: mockS3Config, ipfs: mockIPFSConfig })
      const result = await store.store('test data')

      expect(result.hash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(result.size).toBe(9)
      expect(result.s3Key).toBe('evidence/abcd')
      expect(result.ipfsHash).toBe('QmTest123')
      expect(mockS3Store.store).toHaveBeenCalled()
      expect(mockIPFSStore.store).toHaveBeenCalled()
    })

    it('should succeed if at least one store succeeds', async () => {
      const mockS3Store = {
        store: vi.fn().mockRejectedValue(new Error('S3 failed')),
      }

      const mockIPFSStore = {
        store: vi.fn().mockResolvedValue({
          hash: '0xabcd',
          size: 9,
          ipfsHash: 'QmTest123',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
      }

      vi.mocked(S3Store).mockImplementation(() => mockS3Store as any)
      vi.mocked(IPFSStore).mockImplementation(() => mockIPFSStore as any)

      const store = new EvidenceStore({ s3: mockS3Config, ipfs: mockIPFSConfig })
      const result = await store.store('test data')

      expect(result.ipfsHash).toBe('QmTest123')
      expect(result.s3Key).toBeUndefined()
    })

    it('should throw error if all stores fail', async () => {
      const mockS3Store = {
        store: vi.fn().mockRejectedValue(new Error('S3 failed')),
      }

      const mockIPFSStore = {
        store: vi.fn().mockRejectedValue(new Error('IPFS failed')),
      }

      vi.mocked(S3Store).mockImplementation(() => mockS3Store as any)
      vi.mocked(IPFSStore).mockImplementation(() => mockIPFSStore as any)

      const store = new EvidenceStore({ s3: mockS3Config, ipfs: mockIPFSConfig })
      
      await expect(store.store('test data')).rejects.toThrow('All storage operations failed')
    })
  })

  describe('retrieve method', () => {
    it('should retrieve from S3 when s3Key is provided', async () => {
      const mockS3Store = {
        retrieve: vi.fn().mockResolvedValue({
          data: Buffer.from('test data'),
          metadata: {
            hash: '0xabcd',
            size: 9,
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        }),
      }

      vi.mocked(S3Store).mockImplementation(() => mockS3Store as any)

      const store = new EvidenceStore({ s3: mockS3Config })
      const result = await store.retrieve({ s3Key: 'evidence/abcd' })

      expect(result.data).toEqual(Buffer.from('test data'))
      expect(mockS3Store.retrieve).toHaveBeenCalledWith('evidence/abcd')
    })

    it('should fallback to IPFS if S3 fails', async () => {
      const mockS3Store = {
        retrieve: vi.fn().mockRejectedValue(new Error('S3 failed')),
      }

      const mockIPFSStore = {
        retrieve: vi.fn().mockResolvedValue({
          data: Buffer.from('test data'),
          metadata: {
            hash: '0xabcd',
            size: 9,
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        }),
      }

      vi.mocked(S3Store).mockImplementation(() => mockS3Store as any)
      vi.mocked(IPFSStore).mockImplementation(() => mockIPFSStore as any)

      const store = new EvidenceStore({ s3: mockS3Config, ipfs: mockIPFSConfig })
      const result = await store.retrieve({ s3Key: 'evidence/abcd', ipfsHash: 'QmTest123' })

      expect(result.data).toEqual(Buffer.from('test data'))
      expect(mockIPFSStore.retrieve).toHaveBeenCalledWith('QmTest123')
    })

    it('should throw error if no valid source is provided', async () => {
      const store = new EvidenceStore({ s3: mockS3Config })
      
      await expect(store.retrieve({})).rejects.toThrow('No valid storage source provided or available')
    })
  })

  describe('verify method', () => {
    it('should verify data against hash', async () => {
      const store = new EvidenceStore({ s3: mockS3Config })
      const data = 'hello world'
      const expectedHash = '0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      
      const result = await store.verify(data, expectedHash)
      expect(result).toBe(true)
    })

    it('should reject invalid hash', async () => {
      const store = new EvidenceStore({ s3: mockS3Config })
      const data = 'hello world'
      const wrongHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      
      const result = await store.verify(data, wrongHash)
      expect(result).toBe(false)
    })
  })
})