#!/usr/bin/env node

/**
 * Script to check Google Calendar tokens in the database
 * Usage: node scripts/check-google-tokens.js [user_id]
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkTokens(userId) {
  try {
    let query;
    let params = [];

    if (userId) {
      query = `
        SELECT 
          user_id,
          LEFT(access_token, 30) || '...' as access_token_preview,
          LEFT(refresh_token, 30) || '...' as refresh_token_preview,
          token_expiry,
          CASE 
            WHEN token_expiry < NOW() THEN 'EXPIRED'
            ELSE 'VALID'
          END as status,
          EXTRACT(EPOCH FROM (token_expiry - NOW())) / 60 as expires_in_minutes,
          scope,
          created_at,
          updated_at
        FROM google_calendar_tokens
        WHERE user_id = $1
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          user_id,
          LEFT(access_token, 30) || '...' as access_token_preview,
          LEFT(refresh_token, 30) || '...' as refresh_token_preview,
          token_expiry,
          CASE 
            WHEN token_expiry < NOW() THEN 'EXPIRED'
            ELSE 'VALID'
          END as status,
          EXTRACT(EPOCH FROM (token_expiry - NOW())) / 60 as expires_in_minutes,
          scope,
          created_at,
          updated_at
        FROM google_calendar_tokens
        ORDER BY created_at DESC
      `;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.log('\n❌ No Google Calendar tokens found');
      if (userId) {
        console.log(`   User ID: ${userId}`);
      }
      return;
    }

    console.log('\n✅ Google Calendar Tokens Found\n');
    console.log('='.repeat(80));

    result.rows.forEach((row, index) => {
      console.log(`\n📋 Token #${index + 1}`);
      console.log('-'.repeat(80));
      console.log(`User ID:              ${row.user_id}`);
      console.log(`Access Token:         ${row.access_token_preview}`);
      console.log(`Refresh Token:        ${row.refresh_token_preview}`);
      console.log(`Token Expiry:         ${row.token_expiry}`);
      console.log(`Status:               ${row.status}`);
      console.log(`Expires In:           ${Math.round(row.expires_in_minutes)} minutes`);
      console.log(`Scope:                ${row.scope}`);
      console.log(`Created At:           ${row.created_at}`);
      console.log(`Updated At:           ${row.updated_at}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal tokens: ${result.rows.length}\n`);

  } catch (error) {
    console.error('\n❌ Error checking tokens:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get user_id from command line argument
const userId = process.argv[2];

if (userId) {
  console.log(`\n🔍 Checking Google Calendar token for user: ${userId}`);
} else {
  console.log('\n🔍 Checking all Google Calendar tokens');
}

checkTokens(userId)
  .then(() => {
    console.log('✅ Check completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  });
