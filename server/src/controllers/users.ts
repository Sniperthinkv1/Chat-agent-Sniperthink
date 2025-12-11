import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import * as creditService from '../services/creditService';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { 
  CreatePhoneNumberData, 
  Platform,
  QueryOptions 
} from '../models/types';

export class UsersController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService((db as any).pool);
  }

  /**
   * POST /users/:user_id/phone_numbers
   * Add a new phone number for a user
   */
  addPhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { 
        id, 
        platform, 
        meta_phone_number_id, 
        access_token, 
        display_name 
      } = req.body;

      // Validate required fields
      if (!id || !platform || !meta_phone_number_id || !access_token) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'id, platform, meta_phone_number_id, and access_token are required',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Validate platform type
      const validPlatforms: Platform[] = ['whatsapp', 'instagram', 'webchat'];
      if (!validPlatforms.includes(platform)) {
        res.status(400).json({
          error: 'Invalid platform',
          message: `Platform must be one of: ${validPlatforms.join(', ')}`,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const phoneNumberData: CreatePhoneNumberData = {
        id,
        user_id: user_id!,
        platform,
        meta_phone_number_id,
        access_token,
        display_name,
      };

      const result = await this.userService.addPhoneNumber(phoneNumberData);

      if (!result.success) {
        res.status(400).json({
          error: 'Failed to add phone number',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Phone number added successfully', {
        user_id: req.params['user_id'],
        phone_number_id: id,
        platform,
        correlationId: req.correlationId,
      });

      res.status(201).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error adding phone number', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/phone_numbers
   * List all phone numbers for a user
   */
  listPhoneNumbers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { platform, limit, offset, orderBy, orderDirection } = req.query;

      // Build query options
      const options: QueryOptions = {};
      if (limit) options.limit = parseInt(limit as string, 10);
      if (offset) options.offset = parseInt(offset as string, 10);
      if (orderBy) options.orderBy = orderBy as string;
      if (orderDirection) options.orderDirection = orderDirection as 'ASC' | 'DESC';

      let result;
      if (platform) {
        // Filter by platform if specified
        const validPlatforms: Platform[] = ['whatsapp', 'instagram', 'webchat'];
        if (!validPlatforms.includes(platform as Platform)) {
          res.status(400).json({
            error: 'Invalid platform',
            message: `Platform must be one of: ${validPlatforms.join(', ')}`,
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
          });
          return;
        }
        result = await this.userService.getUserPhoneNumbersByType(user_id!, platform as Platform);
      } else {
        result = await this.userService.getUserPhoneNumbers(user_id!, options);
      }

      if (!result.success) {
        res.status(404).json({
          error: 'Failed to retrieve phone numbers',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error listing phone numbers', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * DELETE /users/:user_id/phone_numbers/:phone_number_id
   * Remove a phone number
   */
  deletePhoneNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, phone_number_id } = req.params;

      // Verify phone number belongs to user
      const phoneNumberResult = await this.userService.getPhoneNumberById(phone_number_id!);
      if (!phoneNumberResult.success) {
        res.status(404).json({
          error: 'Phone number not found',
          message: phoneNumberResult.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      if (phoneNumberResult.data?.user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Phone number does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const result = await this.userService.deletePhoneNumber(phone_number_id!);

      if (!result.success) {
        res.status(400).json({
          error: 'Failed to delete phone number',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Phone number deleted successfully', {
        user_id: req.params['user_id'],
        phone_number_id: req.params['phone_number_id'],
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        message: 'Phone number deleted successfully',
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error deleting phone number', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        phone_number_id: req.params['phone_number_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/credits
   * Get user's credit balance
   */
  getCredits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;

      const credits = await creditService.getCreditStats(user_id!);

      if (!credits) {
        res.status(404).json({
          error: 'Failed to retrieve credits',
          message: 'User credits not found',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user_id,
          remaining_credits: credits.remaining_credits,
          last_updated: credits.last_updated,
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving credits', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * POST /users/:user_id/credits/add
   * Add credits to user's balance
   * Note: Amount validation is handled by validateCreditAmount middleware
   */
  addCredits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { amount } = req.body;

      // Amount validation is handled by middleware
      const newBalance = await creditService.addCredits(user_id!, amount);

      // Log credit usage
      await creditService.logCreditUsage(user_id!, amount, 'add', {
        correlationId: req.correlationId,
      });

      logger.info('Credits added successfully', {
        user_id,
        amount,
        new_balance: newBalance,
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: {
          user_id,
          remaining_credits: newBalance,
          amount_added: amount,
          last_updated: new Date(),
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error adding credits', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };
}
