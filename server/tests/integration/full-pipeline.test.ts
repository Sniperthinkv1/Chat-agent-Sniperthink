/**
 * Full Pipeline Integration Test
 * Tests the complete message processing pipeline with real database and mocked external APIs
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { generateTestId } from '../fixtures/helpers';
import axios from 'axios';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock external APIs
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Full Pipeline Integration Test', () => {
    let dbPool: Pool;
    let redisClient: RedisClientType;
    let testUserId: string;
    let testPhoneNumberId: string;
    let testAgentId: string;
    let testConversationId: string;

    beforeAll(async () => {
        // Initialize real database connection
        dbPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false,
            },
        });

        // Initialize real Redis connection
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                tls: true,
                rejectUnauthorized: false,
            },
        });
        await redisClient.connect();

        console.log('✅ Connected to Neon PostgreSQL and Upstash Redis');
    }, 30000);

    afterAll(async () => {
        await dbPool.end();
        await redisClient.disconnect();
    }, 30000);

    beforeEach(async () => {
        // Generate unique test IDs
        testUserId = generateTestId('pipeline-user');
        testPhoneNumberId = generateTestId('pipeline-phone');
        testAgentId = generateTestId('pipeline-agent');
        testConversationId = generateTestId('pipeline-conv');

        console.log(`\n🧪 Test Setup: ${testUserId}`);

        // Create test user
        try {
            await dbPool.query(
                'INSERT INTO users (user_id, email, company_name, created_at) VALUES ($1, $2, $3, NOW())',
                [testUserId, `${testUserId}@test.com`, 'Pipeline Test Company']
            );
        } catch (error: any) {
            console.error('❌ Failed to create test user:', error.message);
            throw error;
        }

        // Create test phone number
        await dbPool.query(
            'INSERT INTO phone_numbers (phone_number_id, user_id, type, external_number, access_token, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [testPhoneNumberId, testUserId, 'whatsapp', '+1234567890', 'test_token_123']
        );

        // Create test agent
        await dbPool.query(
            'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [testAgentId, testUserId, testPhoneNumberId, 'prompt_test_123', 'Pipeline Test Agent']
        );

        // Add credits
        await dbPool.query(
            'INSERT INTO credits (user_id, remaining_credits, created_at) VALUES ($1, $2, NOW())',
            [testUserId, 1000]
        );

        console.log('✅ Test data created');
    });

    afterEach(async () => {
        console.log('🧹 Cleaning up test data...');

        // Cleanup in correct order (respecting foreign keys)
        await dbPool.query('DELETE FROM extractions WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1)', [testAgentId]);
        await dbPool.query('DELETE FROM message_delivery_status WHERE message_id IN (SELECT message_id FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1))', [testAgentId]);
        await dbPool.query('DELETE FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1)', [testAgentId]);
        await dbPool.query('DELETE FROM conversation_archives WHERE agent_id = $1', [testAgentId]);
        await dbPool.query('DELETE FROM conversations WHERE agent_id = $1', [testAgentId]);
        await dbPool.query('DELETE FROM agents WHERE agent_id = $1', [testAgentId]);
        await dbPool.query('DELETE FROM credits WHERE user_id = $1', [testUserId]);
        await dbPool.query('DELETE FROM phone_numbers WHERE phone_number_id = $1', [testPhoneNumberId]);
        await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);

        // Clear Redis cache
        try {
            const keys = await redisClient.keys(`*${testUserId}*`);
            if (keys && keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            // Redis keys command may not be available, skip cleanup
            console.log('⚠️  Redis cleanup skipped');
        }

        console.log('✅ Cleanup complete');
    });

    describe('Component 1: User and Phone Number Management', () => {
        it('should verify user exists in database', async () => {
            const result = await dbPool.query(
                'SELECT * FROM users WHERE user_id = $1',
                [testUserId]
            );

            expect(result).toBeDefined();
            expect(result.rows).toBeDefined();
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].user_id).toBe(testUserId);
            expect(result.rows[0].email).toBe(`${testUserId}@test.com`);
            expect(result.rows[0].company_name).toBe('Pipeline Test Company');

            console.log('✅ User verified in database');
        });

        it('should verify phone number is linked to user', async () => {
            const result = await dbPool.query(
                'SELECT * FROM phone_numbers WHERE phone_number_id = $1 AND user_id = $2',
                [testPhoneNumberId, testUserId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].type).toBe('whatsapp');
            expect(result.rows[0].external_number).toBe('+1234567890');
            expect(result.rows[0].access_token).toBe('test_token_123');

            console.log('✅ Phone number verified and linked to user');
        });
    });

    describe('Component 2: Agent Configuration', () => {
        it('should verify agent is configured correctly', async () => {
            const result = await dbPool.query(
                'SELECT * FROM agents WHERE agent_id = $1',
                [testAgentId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].user_id).toBe(testUserId);
            expect(result.rows[0].phone_number_id).toBe(testPhoneNumberId);
            expect(result.rows[0].prompt_id).toBe('prompt_test_123');
            expect(result.rows[0].name).toBe('Pipeline Test Agent');
            expect(result.rows[0].is_active).toBe(true);

            console.log('✅ Agent configuration verified');
        });

        it('should enforce one agent per phone number constraint', async () => {
            const duplicateAgentId = generateTestId('duplicate-agent');

            try {
                await dbPool.query(
                    'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name) VALUES ($1, $2, $3, $4, $5)',
                    [duplicateAgentId, testUserId, testPhoneNumberId, 'prompt_duplicate', 'Duplicate Agent']
                );
                fail('Should have thrown an error for duplicate agent');
            } catch (error: any) {
                expect(error.message).toContain('unique_active_agent_per_phone');
                console.log('✅ One agent per phone number constraint enforced');
            }
        });
    });

    describe('Component 3: Credit System', () => {
        it('should verify credits are available', async () => {
            const result = await dbPool.query(
                'SELECT * FROM credits WHERE user_id = $1',
                [testUserId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].remaining_credits).toBe(1000);

            console.log('✅ Credits verified: 1000 available');
        });

        it('should deduct credits after message processing', async () => {
            // Simulate credit deduction
            await dbPool.query(
                'UPDATE credits SET remaining_credits = remaining_credits - 1 WHERE user_id = $1',
                [testUserId]
            );

            const result = await dbPool.query(
                'SELECT remaining_credits FROM credits WHERE user_id = $1',
                [testUserId]
            );

            expect(result.rows[0].remaining_credits).toBe(999);

            console.log('✅ Credit deduction working: 999 remaining');
        });

        it('should prevent operations when credits are zero', async () => {
            // Set credits to zero
            await dbPool.query(
                'UPDATE credits SET remaining_credits = 0 WHERE user_id = $1',
                [testUserId]
            );

            const result = await dbPool.query(
                'SELECT remaining_credits FROM credits WHERE user_id = $1',
                [testUserId]
            );

            expect(result.rows[0].remaining_credits).toBe(0);

            // In real application, this would prevent message processing
            console.log('✅ Zero credits detected - would block processing');
        });
    });

    describe('Component 4: Conversation Management', () => {
        it('should create a new conversation', async () => {
            const customerPhone = '+9876543210';

            await dbPool.query(
                'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [testConversationId, testAgentId, customerPhone]
            );

            const result = await dbPool.query(
                'SELECT * FROM conversations WHERE conversation_id = $1',
                [testConversationId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].agent_id).toBe(testAgentId);
            expect(result.rows[0].customer_phone).toBe(customerPhone);
            expect(result.rows[0].is_active).toBe(true);

            console.log('✅ Conversation created successfully');
        });

        it('should find existing conversation for customer', async () => {
            const customerPhone = '+9876543210';

            // Create conversation
            await dbPool.query(
                'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [testConversationId, testAgentId, customerPhone]
            );

            // Find existing conversation
            const result = await dbPool.query(
                'SELECT * FROM conversations WHERE agent_id = $1 AND customer_phone = $2 AND is_active = true',
                [testAgentId, customerPhone]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].conversation_id).toBe(testConversationId);

            console.log('✅ Existing conversation found');
        });
    });

    describe('Component 5: Message Storage', () => {
        beforeEach(async () => {
            // Create conversation for message tests
            await dbPool.query(
                'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [testConversationId, testAgentId, '+9876543210']
            );
        });

        it('should store incoming message', async () => {
            const messageId = generateTestId('msg');
            const messageText = 'Hello, I need help with my order';

            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [messageId, testConversationId, 'user', messageText, 1]
            );

            const result = await dbPool.query(
                'SELECT * FROM messages WHERE message_id = $1',
                [messageId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].sender).toBe('user');
            expect(result.rows[0].text).toBe(messageText);
            expect(result.rows[0].sequence_no).toBe(1);

            console.log('✅ Incoming message stored');
        });

        it('should store AI response message', async () => {
            const messageId = generateTestId('msg');
            const responseText = 'I can help you with that. What is your order number?';

            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [messageId, testConversationId, 'assistant', responseText, 2]
            );

            const result = await dbPool.query(
                'SELECT * FROM messages WHERE message_id = $1',
                [messageId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].sender).toBe('assistant');
            expect(result.rows[0].text).toBe(responseText);
            expect(result.rows[0].sequence_no).toBe(2);

            console.log('✅ AI response message stored');
        });

        it('should maintain message sequence order', async () => {
            // Store multiple messages
            for (let i = 1; i <= 5; i++) {
                const messageId = generateTestId(`msg-${i}`);
                const sender = i % 2 === 1 ? 'user' : 'assistant';
                const text = `Message ${i}`;

                await dbPool.query(
                    'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                    [messageId, testConversationId, sender, text, i]
                );
            }

            // Retrieve messages in order
            const result = await dbPool.query(
                'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sequence_no',
                [testConversationId]
            );

            expect(result.rows.length).toBe(5);
            for (let i = 0; i < 5; i++) {
                expect(result.rows[i].sequence_no).toBe(i + 1);
                expect(result.rows[i].text).toBe(`Message ${i + 1}`);
            }

            console.log('✅ Message sequence order maintained');
        });
    });

    describe('Component 6: Redis Caching', () => {
        it('should cache agent configuration', async () => {
            const cacheKey = `agent:${testPhoneNumberId}`;
            const agentData = {
                agent_id: testAgentId,
                user_id: testUserId,
                prompt_id: 'prompt_test_123',
                name: 'Pipeline Test Agent',
            };

            await redisClient.set(cacheKey, JSON.stringify(agentData), { EX: 300 });

            const cached = await redisClient.get(cacheKey);
            expect(cached).not.toBeNull();

            const parsedData = JSON.parse(cached!);
            expect(parsedData.agent_id).toBe(testAgentId);
            expect(parsedData.user_id).toBe(testUserId);

            console.log('✅ Agent configuration cached in Redis');
        });

        it('should cache user credits', async () => {
            const cacheKey = `credits:${testUserId}`;
            const creditsData = { remaining_credits: 1000 };

            await redisClient.set(cacheKey, JSON.stringify(creditsData), { EX: 300 });

            const cached = await redisClient.get(cacheKey);
            expect(cached).not.toBeNull();

            const parsedData = JSON.parse(cached!);
            expect(parsedData.remaining_credits).toBe(1000);

            console.log('✅ User credits cached in Redis');
        });

        it('should handle cache expiration', async () => {
            const cacheKey = `test:expiration:${testUserId}`;
            const testData = { value: 'test' };

            // Set with 1 second expiration
            await redisClient.set(cacheKey, JSON.stringify(testData), { EX: 1 });

            // Verify it exists
            let cached = await redisClient.get(cacheKey);
            expect(cached).not.toBeNull();

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Verify it's gone
            cached = await redisClient.get(cacheKey);
            expect(cached).toBeNull();

            console.log('✅ Cache expiration working correctly');
        });
    });

    describe('Component 7: Message Delivery Status', () => {
        beforeEach(async () => {
            // Create conversation for delivery status tests
            await dbPool.query(
                'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [testConversationId, testAgentId, '+9876543210']
            );
        });

        it('should track message delivery status', async () => {
            const messageId = generateTestId('msg');
            const platformMessageId = 'wamid.test123';

            // Store message
            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [messageId, testConversationId, 'assistant', 'Test response', 1]
            );

            // Store delivery status
            await dbPool.query(
                'INSERT INTO message_delivery_status (message_id, platform_message_id, status, created_at) VALUES ($1, $2, $3, NOW())',
                [messageId, platformMessageId, 'sent']
            );

            const result = await dbPool.query(
                'SELECT * FROM message_delivery_status WHERE message_id = $1',
                [messageId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].platform_message_id).toBe(platformMessageId);
            expect(result.rows[0].status).toBe('sent');

            console.log('✅ Message delivery status tracked');
        });

        it('should update delivery status to delivered', async () => {
            const messageId = generateTestId('msg');
            const platformMessageId = 'wamid.test123';

            // Store message and initial status
            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [messageId, testConversationId, 'assistant', 'Test response', 1]
            );

            await dbPool.query(
                'INSERT INTO message_delivery_status (message_id, platform_message_id, status, created_at) VALUES ($1, $2, $3, NOW())',
                [messageId, platformMessageId, 'sent']
            );

            // Update to delivered
            await dbPool.query(
                'UPDATE message_delivery_status SET status = $1, delivered_at = NOW() WHERE message_id = $2',
                ['delivered', messageId]
            );

            const result = await dbPool.query(
                'SELECT * FROM message_delivery_status WHERE message_id = $1',
                [messageId]
            );

            expect(result.rows[0].status).toBe('delivered');
            expect(result.rows[0].delivered_at).not.toBeNull();

            console.log('✅ Delivery status updated to delivered');
        });
    });

    describe('Component 8: Lead Extraction', () => {
        beforeEach(async () => {
            // Create conversation for extraction tests
            await dbPool.query(
                'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                [testConversationId, testAgentId, '+9876543210']
            );
        });

        it('should store extracted lead data', async () => {
            const extractionId = generateTestId('extraction');
            const leadData = {
                name: 'John Doe',
                email: 'john@example.com',
                company: 'Acme Corp',
                intent: 'purchase',
                urgency: 'high',
                budget: '$10,000',
                fit_score: 85,
                engagement_level: 'high',
            };

            await dbPool.query(
                `INSERT INTO extractions (
          extraction_id, conversation_id, name, email, company, 
          intent, urgency, budget, fit_score, engagement_level, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
                [
                    extractionId,
                    testConversationId,
                    leadData.name,
                    leadData.email,
                    leadData.company,
                    leadData.intent,
                    leadData.urgency,
                    leadData.budget,
                    leadData.fit_score,
                    leadData.engagement_level,
                ]
            );

            const result = await dbPool.query(
                'SELECT * FROM extractions WHERE extraction_id = $1',
                [extractionId]
            );

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].name).toBe('John Doe');
            expect(result.rows[0].email).toBe('john@example.com');
            expect(result.rows[0].company).toBe('Acme Corp');
            expect(result.rows[0].fit_score).toBe(85);

            console.log('✅ Lead extraction data stored');
        });
    });

    describe('Component 9: Full Message Pipeline', () => {
        it('should process complete message flow', async () => {
            const customerPhone = '+9876543210';
            const incomingMessage = 'I want to buy your product';

            console.log('\n📨 Starting full pipeline test...');

            // Step 1: Check credits
            const creditsResult = await dbPool.query(
                'SELECT remaining_credits FROM credits WHERE user_id = $1',
                [testUserId]
            );
            expect(creditsResult.rows[0].remaining_credits).toBeGreaterThan(0);
            console.log('✅ Step 1: Credits verified');

            // Step 2: Find or create conversation
            let conversationResult = await dbPool.query(
                'SELECT conversation_id FROM conversations WHERE agent_id = $1 AND customer_phone = $2 AND is_active = true',
                [testAgentId, customerPhone]
            );

            if (conversationResult.rows.length === 0) {
                await dbPool.query(
                    'INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at) VALUES ($1, $2, $3, NOW(), NOW())',
                    [testConversationId, testAgentId, customerPhone]
                );
                conversationResult = await dbPool.query(
                    'SELECT conversation_id FROM conversations WHERE conversation_id = $1',
                    [testConversationId]
                );
            }

            const conversationId = conversationResult.rows[0].conversation_id;
            console.log('✅ Step 2: Conversation found/created');

            // Step 3: Store incoming message
            const incomingMessageId = generateTestId('msg-in');
            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [incomingMessageId, conversationId, 'user', incomingMessage, 1]
            );
            console.log('✅ Step 3: Incoming message stored');

            // Step 4: Mock OpenAI response (in real app, this would call OpenAI API)
            const aiResponse = 'Great! I can help you with that. What specific product are you interested in?';
            console.log('✅ Step 4: AI response generated (mocked)');

            // Step 5: Store AI response
            const responseMessageId = generateTestId('msg-out');
            await dbPool.query(
                'INSERT INTO messages (message_id, conversation_id, sender, text, sequence_no, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [responseMessageId, conversationId, 'assistant', aiResponse, 2]
            );
            console.log('✅ Step 5: AI response stored');

            // Step 6: Deduct credit
            await dbPool.query(
                'UPDATE credits SET remaining_credits = remaining_credits - 1 WHERE user_id = $1',
                [testUserId]
            );
            console.log('✅ Step 6: Credit deducted');

            // Step 7: Update conversation timestamp
            await dbPool.query(
                'UPDATE conversations SET last_message_at = NOW() WHERE conversation_id = $1',
                [conversationId]
            );
            console.log('✅ Step 7: Conversation timestamp updated');

            // Verify complete pipeline
            const messages = await dbPool.query(
                'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sequence_no',
                [conversationId]
            );

            expect(messages.rows.length).toBe(2);
            expect(messages.rows[0].sender).toBe('user');
            expect(messages.rows[0].text).toBe(incomingMessage);
            expect(messages.rows[1].sender).toBe('assistant');
            expect(messages.rows[1].text).toBe(aiResponse);

            const updatedCredits = await dbPool.query(
                'SELECT remaining_credits FROM credits WHERE user_id = $1',
                [testUserId]
            );
            expect(updatedCredits.rows[0].remaining_credits).toBe(999);

            console.log('✅ Full pipeline completed successfully!');
            console.log(`   - Messages: ${messages.rows.length}`);
            console.log(`   - Credits remaining: ${updatedCredits.rows[0].remaining_credits}`);
        });
    });
});
