# Nodara Network Solana Contracts

> **Smart contracts powering the decentralized smartphone microservice network**

## Overview

Nodara Network transforms smartphones into a distributed microservice ecosystem through Solana smart contracts. These programs enable trustless coordination, payment settlement, and reputation management for mobile devices providing verifiable functions like location proofs, sensor data, RPC proxying, and compute tasks.

**Core Value Proposition**: Rent small, verifiable functions from nearby or global phones and pay per use in SOL/SPL tokens.

## Smart Contract Architecture

### Program Suite

```
Nodara Network Smart Contracts
├── DeviceRegistry      # Device onboarding & capabilities
├── RelayPool           # Task matching & coordination
├── PaymentRouter       # Escrow & reward distribution  
├── TrustScoreKeeper    # Reputation & scoring system
├── ProofVerifier       # Response validation
└── TaskOrchestrator    # Cross-program coordination
```

### High-Level Flow

```
1. Device registers capabilities → DeviceRegistry
2. User creates task → TaskOrchestrator
3. Payment locked in escrow → PaymentRouter
4. Task matched to devices → RelayPool
5. Device completes task → submits proof
6. Proof verified → ProofVerifier
7. Reputation updated → TrustScoreKeeper
8. Payment released → PaymentRouter
```

## Program Responsibilities

### **DeviceRegistry**
- Device onboarding and capability declarations
- Geographic region and service availability tracking
- Device status management (online/offline)
- Stake-based reputation bonding

### **RelayPool**
- Task creation and broadcasting
- Device discovery and matching algorithms
- Execution coordination and timeout management
- Multi-response aggregation

### **PaymentRouter**
- Escrow-based payment holding
- Conditional payment release mechanisms
- Multi-token support (SOL/SPL)
- Protocol fee collection and dispute handling

### **TrustScoreKeeper**
- Performance metrics tracking
- Dynamic reputation scoring
- Penalty system for bad actors
- Reward multipliers for top performers

### **ProofVerifier**
- Cryptographic signature validation
- Service-specific proof verification (location, sensor data, etc.)
- Multi-signature consensus mechanisms
- Future: Zero-knowledge proof support

### **TaskOrchestrator**
- Cross-program invocation coordination
- Complex workflow management
- Atomic transaction guarantees
- Event emission and state synchronization

## Development Setup

### Prerequisites
- Rust 1.70+
- Solana CLI 1.16+
- Anchor Framework 0.29+
- Node.js 18+

### Quick Start
```bash
# Clone and setup
git clone https://github.com/nodara-network/solana-contracts.git
cd solana-contracts
npm install

# Build and test
anchor build
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Testing Strategy

### Test Coverage Areas
- **Unit Tests**: Individual program instruction logic
- **Integration Tests**: Cross-program interactions and workflows
- **Security Tests**: Access control and economic attack vectors
- **Performance Tests**: Compute unit optimization and throughput

### Test Networks
- **Local Validator**: Rapid development and debugging
- **Devnet**: Integration testing with realistic conditions
- **Mainnet Fork**: Production-like environment testing

## Deployment Status

### Network Deployment
- **Devnet**: ✅ Available for testing
- **Mainnet**: 🔄 Coming soon

### Program Addresses
```
DeviceRegistry: TBD
RelayPool: TBD  
PaymentRouter: TBD
TrustScoreKeeper: TBD
ProofVerifier: TBD
TaskOrchestrator: TBD
```

## How to Contribute

### **Smart Contract Development**
- Core program logic and instruction handlers
- Cross-program invocation patterns
- Account structure optimization
- Error handling and edge cases

### **Security & Testing**
- Security audit and code review
- Attack vector identification
- Comprehensive test coverage
- Formal verification (future)

### **Performance & Optimization**
- Compute unit optimization
- Account size minimization
- Transaction batching strategies
- Storage cost reduction

### **Documentation & Examples**
- Code documentation and comments
- Integration examples and tutorials
- Best practices and patterns
- API reference materials

## Security Considerations

### Economic Security
- Stake-based reputation system prevents Sybil attacks
- Payment escrow protects against non-completion
- Slashing mechanisms deter malicious behavior

### Technical Security
- Program Derived Addresses (PDAs) for account ownership
- Strict access control and signer validation
- Checked arithmetic to prevent overflow attacks
- Comprehensive input validation

## Issue Reporting

- **Security Issues**: Email security@nodara.network (private disclosure)
- **General Bugs**: Create GitHub issues with reproduction steps
- **Feature Requests**: Use discussion board for new ideas

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Ecosystem Links

- **Protocol Docs**: [docs.nodara.network](https://docs.nodara.network)
- **Web Dashboard**: [github.com/nodara-network/dashboard](https://github.com/nodara-network/dashboard)
- **Mobile SDK**: [github.com/nodara-network/mobile-sdk](https://github.com/nodara-network/mobile-sdk)
- **API Gateway**: [github.com/nodara-network/api-gateway](https://github.com/nodara-network/api-gateway)

---