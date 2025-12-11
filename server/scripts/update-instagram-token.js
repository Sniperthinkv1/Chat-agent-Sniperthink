/**
 * Script to update Instagram access token in database
 * Usage: node scripts/update-instagram-token.js <phone_number_id> <new_access_token>
 */

const { Client } = require('pg');
require('dotenv').config();

async function updateInstagramToken() {
    const phoneNumberId = process.argv[2];
    const newAccessToken = process.argv[3];

    if (!phoneNumberId || !newAccessToken) {
        console.error('❌ Usage: node scripts/update-instagram-token.js <phone_number_id> <new_access_token>');
        console.error('Example: node scripts/update-instagram-token.js test-phone-001 IGAAQQjzWuJg5BZA...');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Check if phone number exists
        const checkResult = await client.query(
            'SELECT id, platform, meta_phone_number_id, display_name FROM phone_numbers WHERE id = $1',
            [phoneNumberId]
        );

        if (checkResult.rows.length === 0) {
            console.error(`❌ Phone number ID "${phoneNumberId}" not found`);
            console.log('\n📋 Available Instagram accounts:');
            const allResult = await client.query(
                'SELECT id, platform, meta_phone_number_id, display_name FROM phone_numbers WHERE platform = \'instagram\''
            );
            console.table(allResult.rows);
            process.exit(1);
        }

        const phoneNumber = checkResult.rows[0];
        console.log('\n📱 Found phone number:');
        console.log(`   ID: ${phoneNumber.id}`);
        console.log(`   Platform: ${phoneNumber.platform}`);
        console.log(`   Meta ID: ${phoneNumber.meta_phone_number_id}`);
        console.log(`   Display Name: ${phoneNumber.display_name}`);

        // Update access token
        const updateResult = await client.query(
            'UPDATE phone_numbers SET access_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
            [newAccessToken, phoneNumberId]
        );

        if (updateResult.rowCount > 0) {
            console.log('\n✅ Access token updated successfully!');
            console.log(`   Token preview: ${newAccessToken.substring(0, 20)}...`);
        } else {
            console.error('\n❌ Failed to update access token');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

updateInstagramToken();
