/**
 * Multi-Channel AI Agent API - Complete Examples
 * Demonstrates common use cases and workflows
 */

import { MultiChannelAIClient } from './client';

// Initialize client
const client = new MultiChannelAIClient({
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com/v1',
    apiKey: process.env.API_KEY!,
});

/**
 * Example 1: Complete Setup Workflow
 * Sets up a new user with WhatsApp and Instagram agents
 */
export async function completeSetupWorkflow() {
    console.log('=== Complete Setup Workflow ===\n');

    // Step 1: Create user
    console.log('1. Creating user...');
    const user = await client.createUser({
        email: 'john@example.com',
        name: 'John Doe',
        company_name: 'Acme Corp',
    });
    console.log(`✓ User created: ${user.user_id}\n`);

    // Step 2: Add WhatsApp number
    console.log('2. Adding WhatsApp number...');
    const whatsappNumber = await client.addPhoneNumber(user.user_id, {
        platform: 'whatsapp',
        meta_phone_number_id: '836990829491415',
        access_token: process.env.WHATSAPP_ACCESS_TOKEN!,
        display_name: '+1 (234) 567-8900',
    });
    console.log(`✓ WhatsApp number added: ${whatsappNumber.id}\n`);

    // Step 3: Add Instagram account
    console.log('3. Adding Instagram account...');
    const instagramAccount = await client.addPhoneNumber(user.user_id, {
        platform: 'instagram',
        meta_phone_number_id: '17841234567890123',
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN!,
        display_name: '@yourbusiness',
    });
    console.log(`✓ Instagram account added: ${instagramAccount.id}\n`);

    // Step 4: Create WhatsApp agent
    console.log('4. Creating WhatsApp agent...');
    const whatsappAgent = await client.createAgent(user.user_id, {
        phone_number_id: whatsappNumber.id,
        prompt_id: 'prompt_support_v1',
        name: 'WhatsApp Support Bot',
    });
    console.log(`✓ WhatsApp agent created: ${whatsappAgent.agent_id}\n`);

    // Step 5: Create Instagram agent
    console.log('5. Creating Instagram agent...');
    const instagramAgent = await client.createAgent(user.user_id, {
        phone_number_id: instagramAccount.id,
        prompt_id: 'prompt_sales_v2',
        name: 'Instagram Sales Assistant',
    });
    console.log(`✓ Instagram agent created: ${instagramAgent.agent_id}\n`);

    // Step 6: Add credits
    console.log('6. Adding credits...');
    await client.addCredits(user.user_id, 1000);
    console.log('✓ Credits added: 1000\n');

    console.log('Setup complete! Your agents are ready to receive messages.\n');

    return {
        user,
        whatsappNumber,
        instagramAccount,
        whatsappAgent,
        instagramAgent,
    };
}

/**
 * Example 2: Message Monitoring
 * Retrieves and displays recent messages
 */
export async function monitorMessages(userId: string, agentId?: string) {
    console.log('=== Message Monitoring ===\n');

    // Get recent messages
    const { messages, pagination } = await client.getMessages(userId, {
        agent_id: agentId,
        limit: 20,
    });

    console.log(`Retrieved ${messages.length} messages:\n`);

    // Group messages by conversation
    const conversations = new Map<string, typeof messages>();
    messages.forEach(msg => {
        if (!conversations.has(msg.conversation_id)) {
            conversations.set(msg.conversation_id, []);
        }
        conversations.get(msg.conversation_id)!.push(msg);
    });

    // Display conversations
    conversations.forEach((msgs, convId) => {
        console.log(`Conversation: ${convId}`);
        msgs.forEach(msg => {
            const prefix = msg.sender === 'user' ? '👤' : '🤖';
            console.log(`  ${prefix} ${msg.text.substring(0, 50)}...`);
        });
        console.log('');
    });

    return messages;
}

/**
 * Example 3: Lead Extraction Analysis
 * Retrieves and analyzes lead data
 */
export async function analyzeLeads(userId: string, agentId?: string) {
    console.log('=== Lead Extraction Analysis ===\n');

    // Get extractions
    const { extractions } = await client.getExtractions(userId, {
        agent_id: agentId,
    });

    console.log(`Retrieved ${extractions.length} lead extractions:\n`);

    // Analyze leads
    const highPriorityLeads = extractions.filter(
        e => e.urgency === 3 && e.fit && e.fit >= 2
    );

    const qualifiedLeads = extractions.filter(
        e => e.email && e.company && e.intent
    );

    console.log(`High Priority Leads: ${highPriorityLeads.length}`);
    console.log(`Qualified Leads: ${qualifiedLeads.length}\n`);

    // Display high priority leads
    if (highPriorityLeads.length > 0) {
        console.log('High Priority Leads:');
        highPriorityLeads.forEach(lead => {
            console.log(`\n  Name: ${lead.name || 'N/A'}`);
            console.log(`  Email: ${lead.email || 'N/A'}`);
            console.log(`  Company: ${lead.company || 'N/A'}`);
            console.log(`  Intent: ${lead.intent || 'N/A'}`);
            console.log(`  Urgency: ${lead.urgency}/3`);
            console.log(`  Fit: ${lead.fit}/3`);
            if (lead.demo_datetime) {
                console.log(`  Demo: ${lead.demo_datetime}`);
            }
        });
    }

    return extractions;
}

/**
 * Example 4: Credit Management
 * Monitors and manages credit balance
 */
export async function manageCreditBalance(userId: string) {
    console.log('=== Credit Management ===\n');

    // Get current balance
    const credits = await client.getCredits(userId);
    console.log(`Current Balance: ${credits.remaining_credits} credits\n`);

    // Check if low balance
    const LOW_BALANCE_THRESHOLD = 100;
    if (credits.remaining_credits < LOW_BALANCE_THRESHOLD) {
        console.log('⚠️  Low credit balance detected!');
        console.log('Adding 500 credits...\n');

        await client.addCredits(userId, 500);
        const newCredits = await client.getCredits(userId);
        console.log(`✓ New Balance: ${newCredits.remaining_credits} credits\n`);
    } else {
        console.log('✓ Credit balance is healthy\n');
    }

    return credits;
}

/**
 * Example 5: Agent Management
 * Updates agent configuration
 */
export async function updateAgentConfiguration(
    userId: string,
    agentId: string,
    newName: string
) {
    console.log('=== Agent Configuration Update ===\n');

    // Get current agent
    const agent = await client.getAgent(userId, agentId);
    console.log(`Current Agent: ${agent.name}`);
    console.log(`Prompt ID: ${agent.prompt_id}\n`);

    // Update agent name
    console.log(`Updating agent name to: ${newName}...`);
    const updatedAgent = await client.updateAgent(userId, agentId, {
        name: newName,
    });
    console.log(`✓ Agent updated: ${updatedAgent.name}\n`);

    return updatedAgent;
}

/**
 * Example 6: Multi-Channel Monitoring
 * Monitors messages across all channels
 */
export async function multiChannelMonitoring(userId: string) {
    console.log('=== Multi-Channel Monitoring ===\n');

    // Get all agents
    const { agents } = await client.listAgents(userId);
    console.log(`Monitoring ${agents.length} agents:\n`);

    // Get messages for each agent
    for (const agent of agents) {
        const { messages } = await client.getMessages(userId, {
            agent_id: agent.agent_id,
            limit: 10,
        });

        console.log(`${agent.name}:`);
        console.log(`  Total Messages: ${messages.length}`);
        console.log(`  Platform: ${agent.phone_number_id}\n`);
    }
}

/**
 * Example 7: Error Handling
 * Demonstrates proper error handling
 */
export async function errorHandlingExample(userId: string) {
    console.log('=== Error Handling Example ===\n');

    try {
        // Attempt to create agent with invalid data
        await client.createAgent(userId, {
            phone_number_id: 'invalid_id',
            prompt_id: 'invalid_prompt',
            name: 'Test Agent',
        });
    } catch (error) {
        if (error instanceof Error) {
            console.log('✓ Error caught successfully:');
            console.log(`  Message: ${error.message}\n`);
        }
    }

    try {
        // Attempt to get non-existent agent
        await client.getAgent(userId, 'non_existent_agent');
    } catch (error) {
        if (error instanceof Error) {
            console.log('✓ Error caught successfully:');
            console.log(`  Message: ${error.message}\n`);
        }
    }
}

/**
 * Example 8: Batch Operations
 * Performs multiple operations efficiently
 */
export async function batchOperations(userId: string) {
    console.log('=== Batch Operations ===\n');

    // Get all data in parallel
    console.log('Fetching all data...');
    const [agents, phoneNumbers, credits, messages] = await Promise.all([
        client.listAgents(userId),
        client.listPhoneNumbers(userId),
        client.getCredits(userId),
        client.getMessages(userId, { limit: 50 }),
    ]);

    console.log('\nResults:');
    console.log(`  Agents: ${agents.agents.length}`);
    console.log(`  Phone Numbers: ${phoneNumbers.phone_numbers.length}`);
    console.log(`  Credits: ${credits.remaining_credits}`);
    console.log(`  Messages: ${messages.messages.length}\n`);

    return { agents, phoneNumbers, credits, messages };
}

// Main execution
async function main() {
    try {
        const userId = process.env.USER_ID || 'usr_abc123';

        // Run examples
        await completeSetupWorkflow();
        await monitorMessages(userId);
        await analyzeLeads(userId);
        await manageCreditBalance(userId);
        await multiChannelMonitoring(userId);
        await errorHandlingExample(userId);
        await batchOperations(userId);

        console.log('All examples completed successfully!');
    } catch (error) {
        console.error('Error running examples:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}
