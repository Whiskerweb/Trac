#!/usr/bin/env node

/**
 * Production Latency Test for Edge Redirects
 * 
 * Tests the <50ms latency requirement for shortlink redirects
 * Measures end-to-end redirect time from production
 */

const https = require('https');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://traaaction.com';
const TEST_ITERATIONS = 10;
const LATENCY_TARGET = 50; // ms

// Test shortlink (create one first via dashboard)
const TEST_SLUG = process.argv[2];

if (!TEST_SLUG) {
    console.error('❌ Usage: node test-latency.js [slug]');
    console.error('   Example: node test-latency.js abc123');
    process.exit(1);
}

const TARGET_URL = `${PRODUCTION_URL}/s/${TEST_SLUG}`;

console.log(`\n🎯 Testing Edge Redirect Latency`);
console.log(`   URL: ${TARGET_URL}`);
console.log(`   Target: <${LATENCY_TARGET}ms per redirect`);
console.log(`   Iterations: ${TEST_ITERATIONS}\n`);

const results = [];

function testRedirect(iteration) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const req = https.request(TARGET_URL, {
            method: 'HEAD', // HEAD request to avoid downloading content
            headers: {
                'User-Agent': 'Traaaction-Latency-Test/1.0'
            }
        }, (res) => {
            const latency = Date.now() - startTime;

            results.push({
                iteration,
                latency,
                statusCode: res.statusCode,
                location: res.headers.location || 'N/A'
            });

            const icon = latency < LATENCY_TARGET ? '✅' : '⚠️';
            console.log(`${icon} Iteration ${iteration}: ${latency}ms (${res.statusCode})`);

            resolve();
        });

        req.on('error', (err) => {
            console.error(`❌ Iteration ${iteration}: ${err.message}`);
            results.push({
                iteration,
                latency: -1,
                error: err.message
            });
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        await testRedirect(i);
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate statistics
    const validResults = results.filter(r => r.latency > 0);
    const latencies = validResults.map(r => r.latency);

    if (latencies.length === 0) {
        console.error('\n❌ All tests failed');
        return;
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const median = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`\n📊 Results`);
    console.log(`   Min:     ${min}ms`);
    console.log(`   Max:     ${max}ms`);
    console.log(`   Avg:     ${avg.toFixed(2)}ms`);
    console.log(`   Median:  ${median}ms`);
    console.log(`   P95:     ${p95}ms`);

    const successRate = (validResults.length / TEST_ITERATIONS) * 100;
    console.log(`\n   Success: ${validResults.length}/${TEST_ITERATIONS} (${successRate.toFixed(0)}%)`);

    // Pass/Fail determination
    const passed = p95 < LATENCY_TARGET && successRate === 100;

    if (passed) {
        console.log(`\n✅ PASSED: P95 latency (${p95}ms) < ${LATENCY_TARGET}ms target`);
    } else {
        console.log(`\n⚠️ FAILED: P95 latency (${p95}ms) >= ${LATENCY_TARGET}ms target`);
        console.log(`\nTroubleshooting:`);
        console.log(`   - Verify Edge Runtime is enabled in middleware`);
        console.log(`   - Check Redis cache hit rate in logs`);
        console.log(`   - Ensure PlanetScale connection is in same region`);
    }
}

runTests().catch(console.error);
