# Payment & Credit Workflow Implementation Plan

## Overview
Build complete workflow: Deposit money → Add credits → Use chatbot → Deduct credits

**Status**: Planning  
**Priority**: High  
**Created**: 2026-01-08

## Phases

1. [Phase 1: Credit Service & Pricing Model](./phase-01-credit-service.md) - In Progress
2. [Phase 2: Credit Deduction in AI Service](./phase-02-ai-integration.md) - Pending
3. [Phase 3: Credit API Endpoints](./phase-03-credit-api.md) - Pending
4. [Phase 4: Testing & Validation](./phase-04-testing.md) - Pending

## Current State

✅ Payment system working (Sepay)  
✅ CreditWallet & CreditTransaction models exist  
✅ Payment auto-adds credits (1 VNĐ = 1 credit)  
❌ Credit deduction when using chatbot  
❌ Credit balance & history APIs  
❌ Credit check before AI generation  

## Success Criteria

- Admin can deposit money → credits automatically added
- Admin can check credit balance
- When using chatbot, credits are deducted based on AI cost
- Credit transaction history is tracked
- System prevents usage when credits insufficient

