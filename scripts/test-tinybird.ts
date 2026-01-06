
import 'dotenv/config';
import { recordEvent, getDashboardStats } from '../lib/analytics/tinybird';

async function testTinybird() {
    console.log('--- Testing Tinybird Ingestion ---');
    try {
        // Test 1: Record Event
        const result = await recordEvent({
            click_id: 'test_click_qa_123',
            event_name: 'qa_certification_test',
            amount: 100,
            currency: 'EUR',
            external_id: 'test_ext_id'
        });

        if (result.success) {
            console.log('✅ Ingestion Success: 200 OK');
        } else {
            console.error('❌ Ingestion Failed:', result.error);
        }

        // Test 2: Fetch Stats
        // console.log('--- Testing Tinybird Stats Fetch ---'); // Optional, might fail if no data pipes
        // const stats = await getDashboardStats();
        // console.log('Stats:', stats);

    } catch (error) {
        console.error('❌ Test Exception:', error);
    }
}

testTinybird();
