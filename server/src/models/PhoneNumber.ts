import { Pool } from 'pg';
import { PhoneNumber, CreatePhoneNumberData, UpdatePhoneNumberData, Platform, QueryOptions } from './types';
import { logger } from '../utils/logger';

export class PhoneNumberModel {
  constructor(private db: Pool) {}

  async create(phoneNumberData: CreatePhoneNumberData): Promise<PhoneNumber> {
    const query = `
      INSERT INTO phone_numbers (id, user_id, platform, meta_phone_number_id, access_token, display_name, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [
      phoneNumberData.id,
      phoneNumberData.user_id,
      phoneNumberData.platform,
      phoneNumberData.meta_phone_number_id,
      phoneNumberData.access_token,
      phoneNumberData.display_name || null
    ];
    
    try {
      const result = await this.db.query(query, values);
      logger.info('Phone number created successfully', { 
        id: phoneNumberData.id,
        user_id: phoneNumberData.user_id,
        platform: phoneNumberData.platform,
        meta_phone_number_id: phoneNumberData.meta_phone_number_id
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create phone number', { 
        error, 
        id: phoneNumberData.id,
        user_id: phoneNumberData.user_id
      });
      throw new Error(`Failed to create phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(phoneNumberId: string): Promise<PhoneNumber | null> {
    const query = 'SELECT * FROM phone_numbers WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [phoneNumberId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find phone number by ID', { error, id: phoneNumberId });
      throw new Error(`Failed to find phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string, options: QueryOptions = {}): Promise<PhoneNumber[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM phone_numbers 
      WHERE user_id = $1
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find phone numbers by user ID', { error, user_id: userId });
      throw new Error(`Failed to find phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserIdAndPlatform(userId: string, platform: Platform): Promise<PhoneNumber[]> {
    const query = 'SELECT * FROM phone_numbers WHERE user_id = $1 AND platform = $2 ORDER BY created_at DESC';
    
    try {
      const result = await this.db.query(query, [userId, platform]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find phone numbers by user ID and platform', { 
        error, 
        user_id: userId, 
        platform 
      });
      throw new Error(`Failed to find phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(phoneNumberId: string, updateData: UpdatePhoneNumberData): Promise<PhoneNumber | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.meta_phone_number_id !== undefined) {
      fields.push(`meta_phone_number_id = $${paramCount++}`);
      values.push(updateData.meta_phone_number_id);
    }

    if (updateData.access_token !== undefined) {
      fields.push(`access_token = $${paramCount++}`);
      values.push(updateData.access_token);
    }

    if (updateData.display_name !== undefined) {
      fields.push(`display_name = $${paramCount++}`);
      values.push(updateData.display_name);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(phoneNumberId);
    const query = `
      UPDATE phone_numbers 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Phone number updated successfully', { id: phoneNumberId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update phone number', { error, id: phoneNumberId });
      throw new Error(`Failed to update phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(phoneNumberId: string): Promise<boolean> {
    const query = 'DELETE FROM phone_numbers WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [phoneNumberId]);
      const deleted = (result.rowCount || 0) > 0;
      if (deleted) {
        logger.info('Phone number deleted successfully', { id: phoneNumberId });
      }
      return deleted;
    } catch (error) {
      logger.error('Failed to delete phone number', { error, id: phoneNumberId });
      throw new Error(`Failed to delete phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(phoneNumberId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM phone_numbers WHERE id = $1';
    
    try {
      const result = await this.db.query(query, [phoneNumberId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check phone number existence', { error, id: phoneNumberId });
      throw new Error(`Failed to check phone number existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByMetaPhoneNumberId(metaPhoneNumberId: string, platform: Platform): Promise<PhoneNumber | null> {
    const query = 'SELECT * FROM phone_numbers WHERE meta_phone_number_id = $1 AND platform = $2';
    
    try {
      const result = await this.db.query(query, [metaPhoneNumberId, platform]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find phone number by meta_phone_number_id', { 
        error, 
        meta_phone_number_id: metaPhoneNumberId,
        platform 
      });
      throw new Error(`Failed to find phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validatePlatform(platform: string): boolean {
    const validPlatforms: Platform[] = ['whatsapp', 'instagram', 'webchat'];
    return validPlatforms.includes(platform as Platform);
  }
}