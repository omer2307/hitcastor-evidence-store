import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { S3Config, StoreResult, RetrieveResult } from './types.js'
import { generateIntegrityMetadata, verifyHash } from './hash.js'

export class S3Store {
  private client: S3Client
  private bucket: string
  private objectLockEnabled: boolean

  constructor(config: S3Config) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
    this.bucket = config.bucket
    this.objectLockEnabled = config.objectLockEnabled ?? false
  }

  async store(data: string | Buffer, key?: string): Promise<StoreResult> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
    const metadata = generateIntegrityMetadata(buffer)
    const objectKey = key ?? `evidence/${metadata.hash.slice(2)}`

    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: 'application/octet-stream',
      Metadata: {
        'content-hash': metadata.hash,
        'content-size': metadata.size.toString(),
        'upload-timestamp': metadata.timestamp,
      },
      ...(this.objectLockEnabled && {
        ObjectLockMode: 'GOVERNANCE',
        ObjectLockRetainUntilDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      }),
    })

    await this.client.send(putCommand)

    return {
      hash: metadata.hash,
      size: metadata.size,
      s3Key: objectKey,
      timestamp: metadata.timestamp,
    }
  }

  async retrieve(key: string): Promise<RetrieveResult> {
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    const response = await this.client.send(getCommand)
    
    if (!response.Body) {
      throw new Error(`Object not found: ${key}`)
    }

    const data = Buffer.from(await response.Body.transformToByteArray())
    const storedHash = response.Metadata?.['content-hash']
    
    if (storedHash && !verifyHash(data, storedHash)) {
      throw new Error(`Hash verification failed for object: ${key}`)
    }

    return {
      data,
      metadata: {
        hash: storedHash || generateIntegrityMetadata(data).hash,
        size: data.length,
        timestamp: response.Metadata?.['upload-timestamp'] || new Date().toISOString(),
      },
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
      await this.client.send(headCommand)
      return true
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return false
      }
      throw error
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, getCommand, { expiresIn })
  }
}