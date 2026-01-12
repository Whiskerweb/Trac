#!/usr/bin/env npx ts-node
/**
 * Domain Flow Diagnostic Script
 * Checks the complete domain lifecycle:
 * 1. Database: Is domain stored correctly?
 * 2. Redis: Is domain cached?
 * 3. Vercel API: Is domain added to project?
 */

import { prisma } from '@/lib/db';

async function diagnose() {
    console.log('🔍 === DOMAIN FLOW DIAGNOSTIC ===\n');

    // 1. Check all domains in database
    console.log('📦 1. DATABASE CHECK');
    console.log('-------------------');

    const domains = await prisma.domain.findMany({
        include: {
            Workspace: {
                select: { name: true, slug: true }
            }
        }
    });

    if (domains.length === 0) {
        console.log('❌ No domains found in database!');
    } else {
        console.log(`Found ${domains.length} domain(s):\n`);
        for (const d of domains) {
            console.log(`  Domain: ${d.name}`);
            console.log(`    ID: ${d.id}`);
            console.log(`    Workspace: ${d.Workspace.name} (${d.Workspace.slug})`);
            console.log(`    Verified: ${d.verified ? '✅ YES' : '❌ NO'}`);
            console.log(`    Created: ${d.created_at}`);
            console.log(`    Verified At: ${d.verified_at || 'N/A'}`);
            console.log('');
        }
    }

    // 2. Check environment variables
    console.log('\n🔐 2. ENVIRONMENT CHECK');
    console.log('----------------------');

    const envVars = {
        VERCEL_AUTH_TOKEN: process.env.VERCEL_AUTH_TOKEN ? '✅ SET' : '❌ MISSING',
        VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ? '✅ SET' : '❌ MISSING',
        VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID ? '✅ SET' : '⚠️ Not set (optional)',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? '✅ SET' : '❌ MISSING',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ SET' : '❌ MISSING',
    };

    for (const [key, value] of Object.entries(envVars)) {
        console.log(`  ${key}: ${value}`);
    }

    // 3. Check Vercel API
    console.log('\n🚀 3. VERCEL API CHECK');
    console.log('---------------------');

    if (!process.env.VERCEL_AUTH_TOKEN || !process.env.VERCEL_PROJECT_ID) {
        console.log('❌ Cannot check Vercel API - credentials missing');
    } else {
        try {
            const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : '';
            const url = `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains${teamQuery}`;

            console.log(`  Fetching: ${url}`);

            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${process.env.VERCEL_AUTH_TOKEN}`,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                console.log(`  ❌ API Error: ${data.error?.message || res.status}`);
            } else {
                console.log(`  ✅ Connected to Vercel API`);
                console.log(`  Found ${data.domains?.length || 0} domain(s) on Vercel:`);

                if (data.domains) {
                    for (const d of data.domains) {
                        console.log(`    - ${d.name} (verified: ${d.verified})`);
                    }
                }

                // Check if our DB domains are on Vercel
                for (const dbDomain of domains) {
                    const onVercel = data.domains?.some((vd: { name: string }) => vd.name === dbDomain.name);
                    if (!onVercel) {
                        console.log(`\n  ⚠️ WARNING: ${dbDomain.name} is in DB but NOT on Vercel!`);
                    }
                }
            }
        } catch (err) {
            console.log(`  ❌ Vercel API request failed: ${err}`);
        }
    }

    // 4. Check Redis cache
    console.log('\n⚡ 4. REDIS CACHE CHECK');
    console.log('----------------------');

    if (!process.env.UPSTASH_REDIS_REST_URL) {
        console.log('❌ Cannot check Redis - credentials missing');
    } else {
        try {
            const { Redis } = await import('@upstash/redis');
            const redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });

            for (const d of domains) {
                const cacheKey = `domain:${d.name.toLowerCase()}`;
                const cached = await redis.get(cacheKey);
                console.log(`  ${d.name}: ${cached ? `✅ Cached (→ ${cached})` : '❌ Not cached'}`);
            }
        } catch (err) {
            console.log(`  ❌ Redis check failed: ${err}`);
        }
    }

    console.log('\n✅ === DIAGNOSTIC COMPLETE ===');

    await prisma.$disconnect();
}

diagnose().catch(console.error);
