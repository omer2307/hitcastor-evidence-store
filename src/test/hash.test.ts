import { describe, it, expect } from 'vitest'
import { sha256, verifyHash, generateIntegrityMetadata } from '../lib/hash.js'

describe('hash utilities', () => {
  describe('sha256', () => {
    it('should generate consistent SHA256 hashes', () => {
      const input = 'test data'
      const hash1 = sha256(input)
      const hash2 = sha256(input)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/)
    })

    it('should handle Buffer input', () => {
      const buffer = Buffer.from('test data', 'utf-8')
      const hash = sha256(buffer)
      
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256('input1')
      const hash2 = sha256('input2')
      
      expect(hash1).not.toBe(hash2)
    })

    it('should produce known hash for known input', () => {
      const input = 'hello world'
      const expectedHash = '0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
      
      expect(sha256(input)).toBe(expectedHash)
    })

    it('should handle empty input', () => {
      const hash = sha256('')
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(hash).toBe('0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })
  })

  describe('verifyHash', () => {
    it('should verify correct hashes', () => {
      const data = 'test data'
      const hash = sha256(data)
      
      expect(verifyHash(data, hash)).toBe(true)
    })

    it('should reject incorrect hashes', () => {
      const data = 'test data'
      const wrongHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      
      expect(verifyHash(data, wrongHash)).toBe(false)
    })

    it('should work with Buffer input', () => {
      const buffer = Buffer.from('test data')
      const hash = sha256(buffer)
      
      expect(verifyHash(buffer, hash)).toBe(true)
    })
  })

  describe('generateIntegrityMetadata', () => {
    it('should generate metadata for string input', () => {
      const data = 'test data'
      const metadata = generateIntegrityMetadata(data)
      
      expect(metadata.hash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(metadata.size).toBe(Buffer.byteLength(data, 'utf8'))
      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should generate metadata for Buffer input', () => {
      const buffer = Buffer.from('test data')
      const metadata = generateIntegrityMetadata(buffer)
      
      expect(metadata.hash).toMatch(/^0x[a-f0-9]{64}$/)
      expect(metadata.size).toBe(buffer.length)
      expect(metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should generate consistent metadata for same input', () => {
      const data = 'test data'
      const metadata1 = generateIntegrityMetadata(data)
      const metadata2 = generateIntegrityMetadata(data)
      
      expect(metadata1.hash).toBe(metadata2.hash)
      expect(metadata1.size).toBe(metadata2.size)
    })
  })
})