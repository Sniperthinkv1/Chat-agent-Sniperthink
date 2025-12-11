import { Pool } from 'pg';
import { User, CreateUserData, UpdateUserData, QueryOptions } from './types';
import { logger } from '../utils/logger';

export class UserModel {
  constructor(private db: Pool) {}

  async create(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (user_id, email, company_name, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [userData.user_id, userData.email, userData.company_name || null];
    
    try {
      const result = await this.db.query(query, values);
      logger.info('User created successfully', { user_id: userData.user_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create user', { error, user_id: userData.user_id });
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(userId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    
    try {
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find user by ID', { error, user_id: userId });
      throw new Error(`Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    
    try {
      const result = await this.db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find user by email', { error, email });
      throw new Error(`Failed to find user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(userId: string, updateData: UpdateUserData): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updateData.email);
    }

    if (updateData.company_name !== undefined) {
      fields.push(`company_name = $${paramCount++}`);
      values.push(updateData.company_name);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('User updated successfully', { user_id: userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update user', { error, user_id: userId });
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(userId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE user_id = $1';
    
    try {
      const result = await this.db.query(query, [userId]);
      const deleted = (result.rowCount || 0) > 0;
      if (deleted) {
        logger.info('User deleted successfully', { user_id: userId });
      }
      return deleted;
    } catch (error) {
      logger.error('Failed to delete user', { error, user_id: userId });
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(options: QueryOptions = {}): Promise<User[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM users 
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to list users', { error });
      throw new Error(`Failed to list users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(userId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM users WHERE user_id = $1';
    
    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check user existence', { error, user_id: userId });
      throw new Error(`Failed to check user existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}