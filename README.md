# Hitcastor Evidence Store

A TypeScript library for storing and verifying evidence in Hitcastor prediction markets using S3/R2 object storage and IPFS.

## Features

- **Dual Storage**: Store evidence in both S3/R2 (with object lock for immutability) and IPFS
- **Hash Verification**: SHA256 hash generation and verification for data integrity
- **CLI Interface**: Command-line tool for manual evidence operations
- **TypeScript Support**: Full type safety with exported interfaces
- **Comprehensive Testing**: Unit tests with mocked dependencies

## Installation

```bash
npm install hitcastor-evidence-store
```

## Library Usage

### Basic Configuration

```typescript
import { EvidenceStore } from 'hitcastor-evidence-store'

const store = new EvidenceStore({
  s3: {
    endpoint: 'https://s3.amazonaws.com',
    region: 'us-east-1',
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    bucket: 'your-bucket',
    objectLockEnabled: true, // Enable WORM storage
  },
  ipfs: {
    endpoint: 'http://localhost:5001',
    timeout: 30000,
  },
})
```

### Store Evidence

```typescript
const data = 'Evidence data to store'
const result = await store.store(data)

console.log(result)
// {
//   hash: '0xabc123...',
//   size: 20,
//   s3Key: 'evidence/abc123...',
//   ipfsHash: 'QmXyz789...',
//   timestamp: '2024-01-01T00:00:00.000Z'
// }
```

### Retrieve Evidence

```typescript
// Retrieve by S3 key
const result = await store.retrieve({ s3Key: 'evidence/abc123...' })

// Retrieve by IPFS hash (fallback if S3 fails)
const result = await store.retrieve({ 
  s3Key: 'evidence/abc123...',
  ipfsHash: 'QmXyz789...' 
})

console.log(result.data) // Buffer containing the evidence
console.log(result.metadata) // Hash, size, timestamp
```

### Verify Evidence

```typescript
const isValid = await store.verify(data, expectedHash)
console.log(isValid) // true or false
```

## CLI Usage

### Configuration

Set environment variables:

```bash
export HITCASTOR_S3_ENDPOINT="https://s3.amazonaws.com"
export HITCASTOR_S3_REGION="us-east-1"
export HITCASTOR_S3_ACCESS_KEY_ID="your-key"
export HITCASTOR_S3_SECRET_ACCESS_KEY="your-secret"
export HITCASTOR_S3_BUCKET="your-bucket"
export HITCASTOR_S3_OBJECT_LOCK="true"
export HITCASTOR_IPFS_ENDPOINT="http://localhost:5001"
```

Or use a config file:

```json
{
  "s3": {
    "endpoint": "https://s3.amazonaws.com",
    "region": "us-east-1",
    "accessKeyId": "your-key",
    "secretAccessKey": "your-secret",
    "bucket": "your-bucket",
    "objectLockEnabled": true
  },
  "ipfs": {
    "endpoint": "http://localhost:5001"
  }
}
```

### Commands

```bash
# Store a file
hitcastor-evidence store ./evidence.json

# Store with custom S3 key
hitcastor-evidence store ./evidence.json --s3-key custom/path

# Retrieve evidence
hitcastor-evidence retrieve --s3-key evidence/abc123... --output ./retrieved.json

# Verify a file
hitcastor-evidence verify ./evidence.json --hash 0xabc123...

# Get metadata
hitcastor-evidence metadata --s3-key evidence/abc123...

# Check existence
hitcastor-evidence exists --ipfs-hash QmXyz789...

# Use config file
hitcastor-evidence --config ./config.json store ./evidence.json
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run dev
```

## Architecture

The library consists of:

- **EvidenceStore**: Main class that orchestrates S3 and IPFS operations
- **S3Store**: Handles S3/R2 operations with object lock support
- **IPFSStore**: Manages IPFS pinning and retrieval
- **Hash utilities**: SHA256 generation and verification
- **CLI**: Command-line interface for manual operations

## API Reference

### Classes

- `EvidenceStore` - Main evidence storage orchestrator
- `S3Store` - S3/R2 storage client
- `IPFSStore` - IPFS storage client

### Functions

- `sha256(input)` - Generate SHA256 hash
- `verifyHash(data, hash)` - Verify data against hash
- `generateIntegrityMetadata(data)` - Generate hash, size, and timestamp

### Types

- `EvidenceStoreConfig` - Configuration for evidence store
- `StoreResult` - Result of store operations
- `RetrieveResult` - Result of retrieve operations
- `EvidenceMetadata` - Metadata about stored evidence

## License

MIT