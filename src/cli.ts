#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { readFileSync } from 'fs'
import { EvidenceStore } from './lib/evidence-store.js'
import { EvidenceStoreConfig } from './lib/types.js'

interface CLIConfig {
  s3?: {
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    objectLockEnabled?: boolean
  }
  ipfs?: {
    endpoint: string
    timeout?: number
  }
}

function loadConfig(configPath?: string): EvidenceStoreConfig {
  if (!configPath) {
    return {
      s3: process.env.HITCASTOR_S3_ENDPOINT ? {
        endpoint: process.env.HITCASTOR_S3_ENDPOINT!,
        region: process.env.HITCASTOR_S3_REGION || 'us-east-1',
        accessKeyId: process.env.HITCASTOR_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.HITCASTOR_S3_SECRET_ACCESS_KEY!,
        bucket: process.env.HITCASTOR_S3_BUCKET!,
        objectLockEnabled: process.env.HITCASTOR_S3_OBJECT_LOCK === 'true',
      } : undefined,
      ipfs: process.env.HITCASTOR_IPFS_ENDPOINT ? {
        endpoint: process.env.HITCASTOR_IPFS_ENDPOINT!,
        timeout: process.env.HITCASTOR_IPFS_TIMEOUT ? parseInt(process.env.HITCASTOR_IPFS_TIMEOUT) : undefined,
      } : undefined,
    }
  }

  const configFile = readFileSync(configPath, 'utf8')
  const config: CLIConfig = JSON.parse(configFile)
  return config
}

yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    description: 'Path to configuration file',
  })
  .command(
    'store <file>',
    'Store a file as evidence',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to file to store',
          type: 'string',
          demandOption: true,
        })
        .option('s3-key', {
          type: 'string',
          description: 'Custom S3 key (optional)',
        })
    },
    async (argv) => {
      try {
        const config = loadConfig(argv.config)
        const store = new EvidenceStore(config)
        
        const data = readFileSync(argv.file)
        const result = await store.store(data, { s3Key: argv['s3-key'] })
        
        console.log(JSON.stringify(result, null, 2))
      } catch (error) {
        console.error('Error storing file:', error)
        process.exit(1)
      }
    }
  )
  .command(
    'retrieve',
    'Retrieve evidence by S3 key or IPFS hash',
    (yargs) => {
      return yargs
        .option('s3-key', {
          type: 'string',
          description: 'S3 key to retrieve',
        })
        .option('ipfs-hash', {
          type: 'string',
          description: 'IPFS hash to retrieve',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path (prints to stdout if not specified)',
        })
        .check((argv) => {
          if (!argv['s3-key'] && !argv['ipfs-hash']) {
            throw new Error('Either --s3-key or --ipfs-hash must be provided')
          }
          return true
        })
    },
    async (argv) => {
      try {
        const config = loadConfig(argv.config)
        const store = new EvidenceStore(config)
        
        const result = await store.retrieve({
          s3Key: argv['s3-key'],
          ipfsHash: argv['ipfs-hash'],
        })
        
        if (argv.output) {
          const { writeFileSync } = await import('fs')
          writeFileSync(argv.output, result.data)
          console.log(`File written to: ${argv.output}`)
          console.log(`Metadata:`, result.metadata)
        } else {
          process.stdout.write(result.data)
        }
      } catch (error) {
        console.error('Error retrieving evidence:', error)
        process.exit(1)
      }
    }
  )
  .command(
    'verify <file>',
    'Verify a file against its expected hash',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to file to verify',
          type: 'string',
          demandOption: true,
        })
        .option('hash', {
          alias: 'h',
          type: 'string',
          description: 'Expected hash (0x prefixed)',
          demandOption: true,
        })
    },
    async (argv) => {
      try {
        const config = loadConfig(argv.config)
        const store = new EvidenceStore(config)
        
        const data = readFileSync(argv.file)
        const isValid = await store.verify(data, argv.hash)
        
        console.log(`File verification: ${isValid ? 'PASSED' : 'FAILED'}`)
        process.exit(isValid ? 0 : 1)
      } catch (error) {
        console.error('Error verifying file:', error)
        process.exit(1)
      }
    }
  )
  .command(
    'metadata',
    'Get metadata for stored evidence',
    (yargs) => {
      return yargs
        .option('s3-key', {
          type: 'string',
          description: 'S3 key',
        })
        .option('ipfs-hash', {
          type: 'string',
          description: 'IPFS hash',
        })
        .check((argv) => {
          if (!argv['s3-key'] && !argv['ipfs-hash']) {
            throw new Error('Either --s3-key or --ipfs-hash must be provided')
          }
          return true
        })
    },
    async (argv) => {
      try {
        const config = loadConfig(argv.config)
        const store = new EvidenceStore(config)
        
        const metadata = await store.getMetadata({
          s3Key: argv['s3-key'],
          ipfsHash: argv['ipfs-hash'],
        })
        
        console.log(JSON.stringify(metadata, null, 2))
      } catch (error) {
        console.error('Error getting metadata:', error)
        process.exit(1)
      }
    }
  )
  .command(
    'exists',
    'Check if evidence exists in storage',
    (yargs) => {
      return yargs
        .option('s3-key', {
          type: 'string',
          description: 'S3 key',
        })
        .option('ipfs-hash', {
          type: 'string',
          description: 'IPFS hash',
        })
        .check((argv) => {
          if (!argv['s3-key'] && !argv['ipfs-hash']) {
            throw new Error('Either --s3-key or --ipfs-hash must be provided')
          }
          return true
        })
    },
    async (argv) => {
      try {
        const config = loadConfig(argv.config)
        const store = new EvidenceStore(config)
        
        const exists = await store.exists({
          s3Key: argv['s3-key'],
          ipfsHash: argv['ipfs-hash'],
        })
        
        console.log(JSON.stringify(exists, null, 2))
      } catch (error) {
        console.error('Error checking existence:', error)
        process.exit(1)
      }
    }
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .parse()