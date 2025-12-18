import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        // Sécurisation des champs (Anti-Quarantaine)
        const safeCustomerId = (session.customer as string) || session.customer_details?.email || 'guest_unknown';
        const safeAmount = session.amount_total || 0;

        // Construction de l'objet PLAT (Exactement comme le Schema Tinybird)
        const data = {
            timestamp: new Date().toISOString(),
            event_id: crypto.randomUUID(),
            invoice_id: (session.invoice as string) || session.id,
            workspace_id: 'ws_dev_001',
            click_id: session.client_reference_id || null,
            customer_external_id: safeCustomerId,
            amount: safeAmount,
            currency: session.currency || 'eur',
            payment_processor: 'stripe',
        };

        // LOG CRITIQUE : Pour vérifier ce qu'on envoie vraiment
        console.log('📦 Sending to Tinybird:', JSON.stringify(data));

        const tinybirdUrl = `${process.env.NEXT_PUBLIC_TINYBIRD_HOST}/v0/events?name=sales`;

        try {
            // MODIFICATION ICI : On envoie l'objet direct, sans []
            const response = await fetch(tinybirdUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.TINYBIRD_ADMIN_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data), // <-- Retrait des crochets []
            });

            if (!response.ok) {
                console.error('❌ Tinybird Error:', await response.text());
            } else {
                console.log('✅ Tinybird Success');
            }
        } catch (error) {
            console.error('❌ Network Error:', error);
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}