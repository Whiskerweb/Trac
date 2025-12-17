#!/usr/bin/env node
/**
 * Stripe Webhook Simulator
 * 
 * Simulates a checkout.session.completed webhook event
 * with a valid signature for local testing.
 * 
 * Usage: node scripts/simulate-webhook.js
 */

const crypto = require('crypto');

// ============================================
// CONFIGURATION - Update these values
// ============================================
const WEBHOOK_SECRET = 'whsec_d9bc6ca2c33cce1a2de914b7e81e177e08e37825c61c823ae9c0c1a72f21bd21';
const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/stripe';

// ============================================
// SIMULATED STRIPE EVENT PAYLOAD
// ============================================
const payload = {
    id: 'evt_test_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
    object: 'event',
    api_version: '2025-12-15.clover',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24),
            object: 'checkout.session',
            amount_total: 5000, // 50.00 EUR in cents
            currency: 'eur',
            customer: 'cus_TEST_OPUS',
            client_reference_id: 'CLICK_TEST_OPUS_001', // This is the click_id for affiliate tracking
            invoice: null, // No invoice, so session.id will be used as invoice_id
            mode: 'payment',
            payment_status: 'paid',
            status: 'complete',
            metadata: {
                workspace_id: 'test_workspace',
            },
        },
    },
};

// ============================================
// SIGNATURE GENERATION (Stripe format)
// ============================================
function generateStripeSignature(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);

    // Stripe signature format: t=timestamp,v1=signature
    const signedPayload = `${timestamp}.${payloadString}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

    return {
        signature: `t=${timestamp},v1=${signature}`,
        body: payloadString,
    };
}

// ============================================
// MAIN - Send simulated webhook
// ============================================
async function main() {
    console.log('🧪 Stripe Webhook Simulator');
    console.log('====================================');
    console.log('');
    console.log('📦 Payload:');
    console.log('   Event Type:', payload.type);
    console.log('   Session ID:', payload.data.object.id);
    console.log('   Customer:', payload.data.object.customer);
    console.log('   Click ID:', payload.data.object.client_reference_id);
    console.log('   Amount:', payload.data.object.amount_total / 100, payload.data.object.currency.toUpperCase());
    console.log('   Workspace:', payload.data.object.metadata.workspace_id);
    console.log('');

    // Generate signature
    const { signature, body } = generateStripeSignature(payload, WEBHOOK_SECRET);

    console.log('🔐 Signature generated:', signature.slice(0, 50) + '...');
    console.log('');
    console.log('📤 Sending to:', WEBHOOK_URL);
    console.log('');

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': signature,
            },
            body: body,
        });

        const responseText = await response.text();

        console.log('====================================');
        console.log('📥 Response:');
        console.log('   Status:', response.status, response.statusText);
        console.log('   Body:', responseText);
        console.log('');

        if (response.status === 200) {
            console.log('✅ SUCCESS! Webhook accepted.');
            console.log('');
            console.log('👉 Check your Next.js terminal for Tinybird logs.');
            console.log('👉 Check Tinybird dashboard for the new sale record.');
        } else if (response.status === 400) {
            console.log('❌ REJECTED: Signature verification failed or bad request.');
            console.log('');
            console.log('💡 Make sure STRIPE_WEBHOOK_SECRET in this script matches your .env.local');
        } else {
            console.log('⚠️ UNEXPECTED STATUS:', response.status);
        }

    } catch (error) {
        console.log('====================================');
        console.log('❌ ERROR: Could not reach webhook endpoint');
        console.log('   Message:', error.message);
        console.log('');
        console.log('💡 Make sure your Next.js server is running (npm run dev)');
    }
}

main();
