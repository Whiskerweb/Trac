-- =============================================
-- TINYBIRD MIGRATION: affiliate_id → seller_id
-- =============================================
-- Execute these commands in Tinybird SQL Console
-- https://app.tinybird.co/workspace/trac/sql-console
-- =============================================

-- Step 1: Add seller_id column to clicks datasource
ALTER TABLE clicks
ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id;

-- Step 2: Add seller_id column to sales datasource
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id;

-- Step 3: Add seller_id column to leads datasource
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS seller_id Nullable(String) AFTER link_id;

-- =============================================
-- DATA MIGRATION: Copy affiliate_id → seller_id
-- =============================================

-- Copy clicks data
ALTER TABLE clicks
UPDATE seller_id = affiliate_id
WHERE seller_id IS NULL OR seller_id = '';

-- Copy sales data
ALTER TABLE sales
UPDATE seller_id = affiliate_id
WHERE seller_id IS NULL OR seller_id = '';

-- Copy leads data
ALTER TABLE leads
UPDATE seller_id = affiliate_id
WHERE seller_id IS NULL OR seller_id = '';

-- =============================================
-- VERIFICATION: Check data migration
-- =============================================

-- Verify clicks
SELECT
    count() as total_rows,
    countIf(affiliate_id IS NOT NULL) as has_affiliate_id,
    countIf(seller_id IS NOT NULL) as has_seller_id,
    countIf(affiliate_id = seller_id) as matching_ids
FROM clicks;

-- Verify sales
SELECT
    count() as total_rows,
    countIf(affiliate_id IS NOT NULL) as has_affiliate_id,
    countIf(seller_id IS NOT NULL) as has_seller_id,
    countIf(affiliate_id = seller_id) as matching_ids
FROM sales;

-- Verify leads
SELECT
    count() as total_rows,
    countIf(affiliate_id IS NOT NULL) as has_affiliate_id,
    countIf(seller_id IS NOT NULL) as has_seller_id,
    countIf(affiliate_id = seller_id) as matching_ids
FROM leads;

-- =============================================
-- OPTIONAL: Drop old affiliate_id columns
-- =============================================
-- ⚠️ Only execute after verifying data migration
-- ⚠️ This is irreversible!

-- ALTER TABLE clicks DROP COLUMN affiliate_id;
-- ALTER TABLE sales DROP COLUMN affiliate_id;
-- ALTER TABLE leads DROP COLUMN affiliate_id;

-- =============================================
-- NOTES
-- =============================================
-- 1. New events will be ingested with seller_id field
-- 2. Old events will have both affiliate_id and seller_id
-- 3. Pipes need to be updated to use seller_id instead of affiliate_id
-- 4. You can drop affiliate_id columns after verifying everything works
