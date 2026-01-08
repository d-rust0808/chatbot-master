# Phase 2: Separate VNĐ Wallet & Credit Wallet

**Status**: In Progress  
**Priority**: High  
**Created**: 2026-01-08

## Context

Current implementation:
- Payment → Auto add to Credit Wallet (1 VNĐ = 1 credit)

**Problem**: Confusing - money and credits are mixed

## Overview

Separate into 2 wallets:
1. **VNĐ Wallet** - Real money from deposits
2. **Credit Wallet** - Credits for AI usage (purchased from VNĐ wallet)

## Key Insights

- Payment → Add to VNĐ Wallet (not credit)
- Admin can buy credits from VNĐ Wallet
- Credit packages with discounts (optional)
- Credit Wallet only for AI usage

## Requirements

### Functional
1. Create VND Wallet model
2. Update payment service to add to VND wallet
3. Create credit purchase service (buy from VND wallet)
4. Create credit package model (optional packages with discounts)
5. Separate VND wallet APIs and Credit wallet APIs

### Non-Functional
- Clear separation of concerns
- Transaction-safe operations
- Audit trail for both wallets

## Architecture

```
Payment Flow:
1. Deposit money → VND Wallet (real VNĐ)
2. Buy credits → Deduct VND, Add Credits
3. Use AI → Deduct Credits

Models:
- VNDWallet (tenantId, balance in VNĐ)
- VNDTransaction (deposit, purchase credit, etc.)
- CreditWallet (existing - for AI usage)
- CreditTransaction (existing)
- CreditPackage (optional - predefined packages)
```

## Related Code Files

- `prisma/schema.prisma` - Add VNDWallet model
- `src/services/payment.service.ts` - Update to add VND instead of credit
- `src/services/credit.service.ts` - Keep for credit operations
- `src/services/vnd-wallet.service.ts` - New service for VND wallet
- `src/controllers/credit.controller.ts` - Add purchase endpoints

## Implementation Steps

1. ✅ Update schema: Add VNDWallet & VNDTransaction models
2. ✅ Create VND wallet service
3. ✅ Update payment service to add VND (not credit)
4. ✅ Create credit purchase service
5. ✅ Create credit package model (optional)
6. ✅ Update credit controller with purchase endpoints
7. ✅ Create migration

## Todo List

- [ ] Update schema.prisma
- [ ] Create VND wallet service
- [ ] Update payment service
- [ ] Create credit purchase service
- [ ] Create credit package model (optional)
- [ ] Update controllers
- [ ] Create migration

## Success Criteria

- Payment adds to VND wallet (not credit)
- Admin can buy credits from VND wallet
- Credit packages work (if implemented)
- Clear separation between VND and Credit
- All tests pass

## Risk Assessment

**Low Risk**: Simple refactoring with clear separation

**Mitigation**: Use transactions, comprehensive tests

