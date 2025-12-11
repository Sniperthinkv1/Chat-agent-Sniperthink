#!/usr/bin/env node
/**
 * Reset database - drops all tables and re-runs migrations
 * WARNING: This will delete all data!
 * Run with: node server/scripts/reset-db.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

async function resetDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

  try {
    console.log('🗑️  Dropping all tables...');
    
    // Drop tables in reverse dependency order
    await pool.query('DROP TABLE IF EXISTS conversation_archives CASCADE');
    await pool.query('DROP TABLE IF EXISTS extractions CASCADE');
    await pool.query('DROP TABLE IF EXISTS messages CASCADE');
    await pool.query('DROP TABLE IF EXISTS conversations CASCADE');
    await pool.query('DROP TABLE IF EXISTS agents CASCADE');
    await pool.query('DROP TABLE IF EXISTS phone_numbers CASCADE');
    await pool.query('DROP TABLE IF EXISTS credits CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS migrations CASCADE');
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
    
    // Drop function
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    
    console.log('✅ All tables dropped successfully');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    await pool.end();
    process.exit(1);
  }
}

resetDatabase();
