# VAT Calculation Fix - Verification Guide

## Problem Fixed

**Bug**: BOTH seller commission AND platform fee were being calculated on `netAmount` (HT - Stripe fees) instead of `htAmount` (HT only).

**Impact**:
- Platform was getting less than 15% of HT
- Seller was getting less commission than configured
- Stripe fees were incorrectly deducted BEFORE calculating commissions

## Changes Made

### 1. Webhook Handler (`app/api/webhooks/[endpointId]/route.ts`)

**checkout.session.completed event:**
```typescript
// BEFORE (BUGGY):
const netAmount = grossAmount - stripeFee - tax
const platformFee = netAmount * 15%  // Wrong! This is (HT - Stripe) * 15%
const sellerCommission = netAmount * reward%  // Wrong! Should be on HT

// AFTER (FIXED):
const htAmount = grossAmount - tax  // HT = Hors Taxes (base for ALL commissions)
const netAmount = htAmount - stripeFee  // Net = what startup receives after Stripe
const platformFee = htAmount * 15%  // Correct! 15% of HT
const sellerCommission = htAmount * reward%  // Correct! reward% of HT
// Startup keeps: netAmount - platformFee - sellerCommission
```

**invoice.paid event (recurring):**
- Added proper Stripe fee fetching from `balance_transaction`
- Calculated `htAmount` and `netAmount` correctly
- Passed both to `createCommission()`

### 2. Commission Engine (`lib/commission/engine.ts`)

**Updated function signature:**
```typescript
export async function createCommission(params: {
    // ... other params
    htAmount: number  // ✅ NEW: HT amount for platform fee calculation
    netAmount: number  // Existing: Net after Stripe fees
    // ...
})
```

**Updated platform fee calculation:**
```typescript
// BEFORE (BUGGY):
const traaactionFee = Math.floor(netAmount * PLATFORM_FEE_RATE)

// AFTER (FIXED):
const traaactionFee = Math.floor(htAmount * PLATFORM_FEE_RATE)
```

## Verification Test Scenario

### Test Case: 1€ Purchase with 20% VAT

#### Input:
- Customer pays: **1.00€ TTC** (including VAT)
- VAT rate: **20%**

#### Expected Calculations:

```
1. Gross Amount (TTC):           1.00€ = 100 cents
2. Tax (20% VAT):                0.17€ = 17 cents (calculated by Stripe)
3. HT Amount (base):             0.83€ = 83 cents (1.00 - 0.17)
4. Stripe Fee (2.9% + 0.30€):    0.33€ = 33 cents (estimated)
5. Net Amount (startup receives): 0.50€ = 50 cents (0.83 - 0.33)

COMMISSIONS (calculated on HT, NOT net):
6. Platform Fee (15% of HT):     0.12€ = 12 cents (0.83 * 0.15)
7. Seller Commission (depends on mission reward):
   - If 10% reward: 0.08€ = 8 cents (0.83 * 0.10)  ← FIXED!
   - If 5€ flat reward: 5.00€ = 500 cents

STARTUP SHARE:
8. Startup keeps: Net - Platform - Seller
   = 0.50 - 0.12 - 0.08 = 0.30€ = 30 cents
```

#### What to Verify:

1. **Check Commission in Database:**
```sql
SELECT
    id,
    gross_amount,  -- Should be 100 cents
    tax_amount,    -- Should be 17 cents
    net_amount,    -- Should be 50 cents (83 - 33)
    stripe_fee,    -- Should be ~33 cents
    platform_fee,  -- Should be 12 cents (15% of 83)
    commission_amount  -- Depends on mission reward
FROM "Commission"
WHERE sale_id = 'cs_test_xxx'
ORDER BY created_at DESC
LIMIT 1;
```

2. **Check Console Logs:**
Look for these lines in the webhook logs:
```
[Webhook] 📊 Revenue Breakdown:
  Gross (TTC): 1.00 eur
  Tax (TVA 20%): 0.17 eur
  HT (before Stripe): 0.83 eur
  Stripe Fee: 0.33 eur
  Net (for split): 0.50 eur

[Commission] 💰 Breakdown:
  Gross (TTC): 1.00€
  Tax (TVA): -0.17€
  HT (base): 0.83€
  Seller 10%: -0.08€
  Platform 15%: -0.12€
  Stripe fees: -0.33€
  → Startup keeps: 0.30€
```

3. **Math Verification:**
```
Base for ALL commissions = HT = 0.83€

Platform Fee = HT * 15%
             = 0.83€ * 15%
             = 0.12€ ✅

Seller Commission (10%) = HT * 10%
                        = 0.83€ * 10%
                        = 0.08€ ✅

Startup receives after Stripe = 0.50€
Startup pays out = 0.12 + 0.08 = 0.20€
Startup keeps = 0.50 - 0.20 = 0.30€ ✅

BEFORE (BUGGY):
Platform Fee = Net * 15% = 0.50€ * 15% = 0.08€ ❌
Seller Commission = Net * 10% = 0.50€ * 10% = 0.05€ ❌
```

## Key Differences: Before vs After

| Metric | Before (Buggy) | After (Fixed) | Difference |
|--------|---------------|---------------|------------|
| Base for commissions | Net (HT - Stripe) | HT | Stripe fees excluded |
| Platform fee (1€ sale) | ~0.08€ | ~0.12€ | +0.04€ (+50%) |
| Seller commission 10% (1€ sale) | ~0.05€ | ~0.08€ | +0.03€ (+60%) |
| Startup share (1€ sale) | ~0.37€ | ~0.30€ | -0.07€ (-19%) |
| Correctness | Incorrect | Correct | N/A |

## Testing Steps

### 1. Create Test Mission
```
- Reward type: SALE
- Reward structure: PERCENTAGE
- Reward amount: 10%
- Status: ACTIVE
```

### 2. Seller Joins & Gets Link
- Enroll a test seller
- Generate affiliate link

### 3. Make 1€ Purchase
- Use real Stripe (as you mentioned)
- Pay 1€ through the affiliate link
- Wait for webhook to process

### 4. Verify Commission
- Check database (SQL above)
- Check console logs
- Verify platform_fee = 12 cents (15% of 83 cents HT)
- NOT 8 cents (15% of 50 cents net)

### 5. Test Recurring Payment
- Create a subscription mission
- Make initial payment (1€)
- Wait for next recurring invoice.paid event
- Verify recurring commission also uses htAmount correctly

## SQL Queries for Verification

```sql
-- Check latest commission details
SELECT
    c.id,
    c.sale_id,
    c.gross_amount / 100.0 as gross_eur,
    c.tax_amount / 100.0 as tax_eur,
    (c.gross_amount - c.tax_amount) / 100.0 as ht_eur,
    c.stripe_fee / 100.0 as stripe_fee_eur,
    c.net_amount / 100.0 as net_eur,
    c.platform_fee / 100.0 as platform_fee_eur,
    c.commission_amount / 100.0 as commission_eur,
    -- Verify platform fee is 15% of HT
    ROUND(((c.gross_amount - c.tax_amount) * 0.15) / 100.0, 2) as expected_platform_fee_eur,
    -- Check if calculation is correct
    CASE
        WHEN c.platform_fee = FLOOR((c.gross_amount - c.tax_amount) * 0.15)
        THEN '✅ CORRECT'
        ELSE '❌ WRONG'
    END as calculation_check
FROM "Commission" c
ORDER BY c.created_at DESC
LIMIT 10;
```

## Expected Output for 1€ Test

```
sale_id: cs_test_abc123
gross_eur: 1.00
tax_eur: 0.17
ht_eur: 0.83
stripe_fee_eur: 0.33
net_eur: 0.50
platform_fee_eur: 0.12
commission_eur: 0.05 (if 10% reward)
expected_platform_fee_eur: 0.12
calculation_check: ✅ CORRECT
```

## Troubleshooting

If platform_fee is still wrong:

1. **Clear Redis cache** (if caching commission calculations)
2. **Restart Next.js dev server** to reload code
3. **Check Stripe webhook logs** to ensure new code is running
4. **Verify webhook secret** is correct in database
5. **Check for TypeScript errors**: `npm run build`

## Additional Notes

- The fix applies to BOTH one-time purchases (checkout.session.completed) and recurring payments (invoice.paid)
- Seller commission can be based on either netAmount (if percentage) or fixed amount
- Platform fee is ALWAYS 15% of HT, regardless of reward type
- The startup pays: seller_commission + platform_fee after 30 days maturation
