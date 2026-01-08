# Phase 1: Credit Service & Pricing Model

**Status**: In Progress  
**Priority**: High  
**Created**: 2026-01-08

## Context

Current payment system:
- Payment completed → Credits added (1 VNĐ = 1 credit)
- Need to deduct credits when using chatbot
- Need pricing model to convert AI cost to credits

## Overview

Create credit service to:
1. Check credit balance
2. Deduct credits based on AI usage
3. Track credit transactions
4. Convert AI cost (tokens/model) to credits

## Key Insights

- `calculateCost()` returns USD cost
- Need to convert USD → VNĐ (credit)
- Credit = VNĐ, so need USD/VNĐ exchange rate
- Different models have different costs
- Should deduct after successful AI response

## Requirements

### Functional
1. Credit service with balance check
2. Credit deduction with transaction logging
3. Pricing model: USD cost → VNĐ credits
4. Exchange rate configurable (default: 1 USD = 25,000 VNĐ)
5. Model-specific pricing multipliers

### Non-Functional
- Transaction-safe (use Prisma transactions)
- Idempotent operations
- Proper error handling
- Logging for audit trail

## Architecture

```
CreditService
├── checkBalance(tenantId) → balance
├── canDeduct(tenantId, amount) → boolean
├── deduct(tenantId, amount, reason, metadata) → transaction
└── convertCostToCredits(usdCost) → credits

PricingModel
├── USD_TO_VND_RATE = 25000
├── convertUsdToCredits(usdAmount) → credits
└── calculateCreditsFromTokens(tokens, model) → credits
```

## Related Code Files

- `src/services/ai/ai.service.ts` - Will use credit service
- `src/services/payment.service.ts` - Already adds credits
- `src/utils/token-manager.ts` - Has calculateCost()
- `prisma/schema.prisma` - CreditWallet & CreditTransaction models

## Implementation Steps

1. ✅ Create credit pricing config
   - USD to VNĐ exchange rate
   - Model-specific multipliers (optional)

2. ✅ Create credit.service.ts
   - getBalance(tenantId)
   - canDeduct(tenantId, amount)
   - deduct(tenantId, amount, reason, referenceId, metadata)
   - addCredit(tenantId, amount, reason, referenceId, metadata) - wrapper for payment service

3. ✅ Create pricing utility
   - convertUsdToCredits(usdCost)
   - calculateCreditsFromTokens(tokens, model)
   - Support model-specific pricing

4. ✅ Add error classes
   - InsufficientCreditsError
   - CreditOperationError

5. ✅ Unit tests for credit service

## Todo List

- [ ] Create `src/services/credit.service.ts`
- [ ] Create `src/utils/credit-pricing.ts`
- [ ] Add error classes in `src/errors/credit.errors.ts`
- [ ] Write tests in `src/services/__tests__/credit.service.test.ts`
- [ ] Update config with USD/VNĐ rate

## Success Criteria

- Credit service can check balance
- Credit service can deduct credits safely
- Cost conversion (USD → credits) works correctly
- All operations are transaction-safe
- Tests pass

## Risk Assessment

**Low Risk**: Simple CRUD operations with well-defined schema

**Mitigation**: Use Prisma transactions, comprehensive tests

## Security Considerations

- Only tenant can access their own credits
- Transaction atomicity prevents race conditions
- Audit trail via CreditTransaction table

## Next Steps

After Phase 1:
- Integrate credit check in AI service (Phase 2)
- Create API endpoints (Phase 3)

