
import 'dotenv/config';
import { Redis } from '@upstash/redis';

// Replicate middleware logic slightly
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function testRedis() {
    console.log('--- Testing Redis Connection ---');
    try {
        await redis.set('qa_test_key', 'qa_value');
        const val = await redis.get('qa_test_key');

        if (val === 'qa_value') {
            console.log('✅ Redis Read/Write Success');
        } else {
            console.error('❌ Redis Value Mismatch:', val);
        }

        await redis.del('qa_test_key');

    } catch (error) {
        console.error('❌ Redis Exception:', error);
    }
}

testRedis();
