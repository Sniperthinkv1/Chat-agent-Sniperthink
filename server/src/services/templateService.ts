/**
 * Template Service
 * Manages WhatsApp message templates with Meta Graph API integration
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { platformsConfig, templatesConfig } from '../config';
import type {
    Template,
    CreateTemplateData,
    UpdateTemplateData,
    TemplateVariable,
    CreateTemplateVariableData,
    TemplateSend,
    CreateTemplateSendData,
    TemplateComponents,
    TemplateStatus,
    PhoneNumberWithRateLimit,
} from '../models/types';

// Meta Graph API response types
interface MetaTemplateResponse {
    id: string;
    status: string;
    category: string;
}

interface MetaTemplateListResponse {
    data: Array<{
        id: string;
        name: string;
        status: string;
        category: string;
        language: string;
        components: unknown[];
        rejected_reason?: string;
    }>;
    paging?: {
        cursors: { before: string; after: string };
        next?: string;
    };
}

interface MetaErrorResponse {
    error: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
}

/**
 * Convert our component format to Meta's expected format
 */
function toMetaComponents(components: TemplateComponents): unknown[] {
    const metaComponents: unknown[] = [];

    if (components.header) {
        metaComponents.push({
            type: 'HEADER',
            format: components.header.format,
            text: components.header.text,
            example: components.header.example,
        });
    }

    metaComponents.push({
        type: 'BODY',
        text: components.body.text,
        example: components.body.example,
    });

    if (components.footer) {
        metaComponents.push({
            type: 'FOOTER',
            text: components.footer.text,
        });
    }

    if (components.buttons && components.buttons.buttons.length > 0) {
        metaComponents.push({
            type: 'BUTTONS',
            buttons: components.buttons.buttons.map(btn => {
                const button: Record<string, unknown> = {
                    type: btn.type,
                    text: btn.text,
                };
                if (btn.type === 'URL' && btn.url) {
                    button.url = btn.url;
                }
                if (btn.type === 'PHONE_NUMBER' && btn.phone_number) {
                    button.phone_number = btn.phone_number;
                }
                return button;
            }),
        });
    }

    return metaComponents;
}

/**
 * Validate template components
 */
export function validateTemplateComponents(components: TemplateComponents): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Body is required
    if (!components.body || !components.body.text) {
        errors.push('Template body is required');
    } else {
        // Body max 1024 chars
        if (components.body.text.length > 1024) {
            errors.push('Template body must be 1024 characters or less');
        }
    }

    // Header validation (optional, text only for now)
    if (components.header) {
        if (components.header.format !== 'TEXT') {
            errors.push('Only TEXT headers are supported currently');
        }
        if (components.header.text && components.header.text.length > 60) {
            errors.push('Header text must be 60 characters or less');
        }
    }

    // Footer validation (optional)
    if (components.footer) {
        if (components.footer.text && components.footer.text.length > 60) {
            errors.push('Footer text must be 60 characters or less');
        }
    }

    // Buttons validation (max 3)
    if (components.buttons) {
        if (components.buttons.buttons.length > 3) {
            errors.push('Maximum 3 buttons allowed');
        }
        for (const btn of components.buttons.buttons) {
            if (!btn.text || btn.text.length > 25) {
                errors.push('Button text is required and must be 25 characters or less');
            }
            if (btn.type === 'URL' && !btn.url) {
                errors.push('URL button requires a URL');
            }
            if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
                errors.push('Phone button requires a phone number');
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Create a new template (draft)
 */
export async function createTemplate(data: CreateTemplateData): Promise<Template> {
    const correlationId = uuidv4();
    logger.info('Creating template', { correlationId, templateName: data.name, userId: data.user_id });

    // Validate components
    const validation = validateTemplateComponents(data.components);
    if (!validation.valid) {
        throw new Error(`Invalid template components: ${validation.errors.join(', ')}`);
    }

    const result = await db.query<Template>(
        `INSERT INTO templates (
            template_id, user_id, phone_number_id, name, category, 
            language, components, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
        RETURNING *`,
        [
            data.template_id,
            data.user_id,
            data.phone_number_id,
            data.name,
            data.category,
            data.language || templatesConfig.defaultLanguage,
            JSON.stringify(data.components),
        ]
    );

    logger.info('Template created', { correlationId, templateId: data.template_id });
    return result.rows[0]!;
}

/**
 * Get template by ID
 */
export async function getTemplateById(templateId: string): Promise<Template | null> {
    const result = await db.query<Template>(
        'SELECT * FROM templates WHERE template_id = $1',
        [templateId]
    );
    return result.rows[0] || null;
}

/**
 * Get templates by user ID
 */
export async function getTemplatesByUserId(
    userId: string,
    options?: { status?: TemplateStatus; phoneNumberId?: string }
): Promise<Template[]> {
    let query = 'SELECT * FROM templates WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (options?.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(options.status);
    }

    if (options?.phoneNumberId) {
        query += ` AND phone_number_id = $${params.length + 1}`;
        params.push(options.phoneNumberId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query<Template>(query, params);
    return result.rows;
}

/**
 * Get all templates (admin)
 */
export async function getAllTemplates(options?: {
    limit?: number;
    offset?: number;
    status?: TemplateStatus;
}): Promise<{ templates: Template[]; total: number }> {
    let countQuery = 'SELECT COUNT(*) FROM templates';
    let query = 'SELECT * FROM templates';
    const params: unknown[] = [];

    if (options?.status) {
        const whereClause = ` WHERE status = $1`;
        countQuery += whereClause;
        query += whereClause;
        params.push(options.status);
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
    }

    if (options?.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
    }

    const [countResult, dataResult] = await Promise.all([
        db.query<{ count: string }>(countQuery, options?.status ? [options.status] : []),
        db.query<Template>(query, params),
    ]);

    return {
        templates: dataResult.rows,
        total: parseInt(countResult.rows[0]?.count || '0', 10),
    };
}

/**
 * Update template
 */
export async function updateTemplate(templateId: string, data: UpdateTemplateData): Promise<Template | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(key === 'components' ? JSON.stringify(value) : value);
            paramIndex++;
        }
    }

    if (fields.length === 0) {
        return getTemplateById(templateId);
    }

    values.push(templateId);

    const result = await db.query<Template>(
        `UPDATE templates SET ${fields.join(', ')} WHERE template_id = $${paramIndex} RETURNING *`,
        values
    );

    return result.rows[0] || null;
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
    const result = await db.query(
        'DELETE FROM templates WHERE template_id = $1',
        [templateId]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Submit template to Meta for approval
 */
export async function submitTemplateToMeta(templateId: string): Promise<Template> {
    const correlationId = uuidv4();
    
    const template = await getTemplateById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    if (template.status !== 'DRAFT') {
        throw new Error(`Cannot submit template with status ${template.status}`);
    }

    // Get phone number to get WABA ID and access token
    const phoneResult = await db.query<PhoneNumberWithRateLimit>(
        'SELECT * FROM phone_numbers WHERE id = $1',
        [template.phone_number_id]
    );
    const phoneNumber = phoneResult.rows[0];
    
    if (!phoneNumber) {
        throw new Error('Phone number not found');
    }

    if (!phoneNumber.waba_id) {
        throw new Error('Phone number does not have a WABA ID configured');
    }

    logger.info('Submitting template to Meta', {
        correlationId,
        templateId,
        templateName: template.name,
        wabaId: phoneNumber.waba_id,
    });

    // Submit to Meta Graph API
    const metaComponents = toMetaComponents(template.components);

    const response = await fetch(
        `${platformsConfig.whatsappBaseUrl}/${phoneNumber.waba_id}/message_templates`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${phoneNumber.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: template.name,
                category: template.category,
                language: template.language,
                components: metaComponents,
            }),
        }
    );

    const responseData = await response.json() as MetaTemplateResponse | MetaErrorResponse;

    if (!response.ok || 'error' in responseData) {
        const errorData = responseData as MetaErrorResponse;
        logger.error('Failed to submit template to Meta', {
            correlationId,
            templateId,
            error: errorData.error,
        });
        throw new Error(`Meta API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const successData = responseData as MetaTemplateResponse;

    // Update template with Meta's template ID and pending status
    const updatedTemplate = await updateTemplate(templateId, {
        meta_template_id: successData.id,
        status: 'PENDING',
        submitted_at: new Date(),
    });

    logger.info('Template submitted to Meta', {
        correlationId,
        templateId,
        metaTemplateId: successData.id,
    });

    return updatedTemplate!;
}

/**
 * Sync template status from Meta
 */
export async function syncTemplateStatusFromMeta(templateId: string): Promise<Template | null> {
    const correlationId = uuidv4();
    
    const template = await getTemplateById(templateId);
    if (!template || !template.meta_template_id) {
        return template;
    }

    const phoneResult = await db.query<PhoneNumberWithRateLimit>(
        'SELECT * FROM phone_numbers WHERE id = $1',
        [template.phone_number_id]
    );
    const phoneNumber = phoneResult.rows[0];
    
    if (!phoneNumber?.waba_id) {
        return template;
    }

    logger.debug('Syncing template status from Meta', {
        correlationId,
        templateId,
        metaTemplateId: template.meta_template_id,
    });

    const response = await fetch(
        `${platformsConfig.whatsappBaseUrl}/${phoneNumber.waba_id}/message_templates?name=${template.name}`,
        {
            headers: {
                'Authorization': `Bearer ${phoneNumber.access_token}`,
            },
        }
    );

    if (!response.ok) {
        logger.warn('Failed to fetch template status from Meta', { correlationId, templateId });
        return template;
    }

    const data = await response.json() as MetaTemplateListResponse;
    const metaTemplate = data.data?.find(t => t.id === template.meta_template_id);

    if (!metaTemplate) {
        return template;
    }

    // Map Meta status to our status
    const statusMap: Record<string, TemplateStatus> = {
        APPROVED: 'APPROVED',
        PENDING: 'PENDING',
        REJECTED: 'REJECTED',
        PAUSED: 'PAUSED',
        DISABLED: 'DISABLED',
    };

    const newStatus = statusMap[metaTemplate.status] || template.status;
    const updateData: UpdateTemplateData = { status: newStatus };

    if (newStatus === 'APPROVED' && template.status !== 'APPROVED') {
        updateData.approved_at = new Date();
    }

    if (newStatus === 'REJECTED' && metaTemplate.rejected_reason) {
        updateData.rejection_reason = metaTemplate.rejected_reason;
    }

    return updateTemplate(templateId, updateData);
}

/**
 * Delete template from Meta
 */
export async function deleteTemplateFromMeta(templateId: string): Promise<boolean> {
    const correlationId = uuidv4();
    
    const template = await getTemplateById(templateId);
    if (!template || !template.meta_template_id) {
        return false;
    }

    const phoneResult = await db.query<PhoneNumberWithRateLimit>(
        'SELECT * FROM phone_numbers WHERE id = $1',
        [template.phone_number_id]
    );
    const phoneNumber = phoneResult.rows[0];
    
    if (!phoneNumber?.waba_id) {
        return false;
    }

    logger.info('Deleting template from Meta', {
        correlationId,
        templateId,
        templateName: template.name,
    });

    const response = await fetch(
        `${platformsConfig.whatsappBaseUrl}/${phoneNumber.waba_id}/message_templates?name=${template.name}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${phoneNumber.access_token}`,
            },
        }
    );

    if (!response.ok) {
        logger.warn('Failed to delete template from Meta', { correlationId, templateId });
        return false;
    }

    return true;
}

// =====================================
// Template Variables
// =====================================

/**
 * Create template variable
 */
export async function createTemplateVariable(data: CreateTemplateVariableData): Promise<TemplateVariable> {
    const result = await db.query<TemplateVariable>(
        `INSERT INTO template_variables (
            variable_id, template_id, variable_name, position, 
            component_type, extraction_field, default_value, sample_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
            data.variable_id,
            data.template_id,
            data.variable_name,
            data.position,
            data.component_type || 'BODY',
            data.extraction_field,
            data.default_value,
            data.sample_value,
        ]
    );
    return result.rows[0]!;
}

/**
 * Get variables for template
 */
export async function getTemplateVariables(templateId: string): Promise<TemplateVariable[]> {
    const result = await db.query<TemplateVariable>(
        'SELECT * FROM template_variables WHERE template_id = $1 ORDER BY position',
        [templateId]
    );
    return result.rows;
}

/**
 * Delete template variable
 */
export async function deleteTemplateVariable(variableId: string): Promise<boolean> {
    const result = await db.query(
        'DELETE FROM template_variables WHERE variable_id = $1',
        [variableId]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Substitute variables with actual values from extraction data
 */
export async function substituteVariables(
    templateId: string,
    extractionData?: Record<string, unknown>,
    manualValues?: Record<string, string>
): Promise<Record<string, string>> {
    const variables = await getTemplateVariables(templateId);
    const result: Record<string, string> = {};

    for (const variable of variables) {
        const position = variable.position.toString();

        // Priority: manual value > extraction field > default value
        if (manualValues?.[variable.variable_name]) {
            result[position] = manualValues[variable.variable_name]!;
        } else if (variable.extraction_field && extractionData?.[variable.extraction_field]) {
            result[position] = String(extractionData[variable.extraction_field]);
        } else if (variable.default_value) {
            result[position] = variable.default_value;
        } else {
            // Use sample value or empty string as fallback
            result[position] = variable.sample_value || '';
        }
    }

    return result;
}

// =====================================
// Template Sends
// =====================================

/**
 * Create template send record
 */
export async function createTemplateSend(data: CreateTemplateSendData): Promise<TemplateSend> {
    const result = await db.query<TemplateSend>(
        `INSERT INTO template_sends (
            send_id, template_id, conversation_id, campaign_id,
            customer_phone, variable_values
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
            data.send_id,
            data.template_id,
            data.conversation_id,
            data.campaign_id,
            data.customer_phone,
            JSON.stringify(data.variable_values || {}),
        ]
    );
    return result.rows[0]!;
}

/**
 * Update template send status
 */
export async function updateTemplateSendStatus(
    sendId: string,
    status: TemplateSend['status'],
    platformMessageId?: string,
    errorCode?: string,
    errorMessage?: string
): Promise<TemplateSend | null> {
    const updates: string[] = ['status = $2'];
    const params: unknown[] = [sendId, status];
    let paramIndex = 3;

    if (platformMessageId) {
        updates.push(`platform_message_id = $${paramIndex}`);
        params.push(platformMessageId);
        paramIndex++;
    }

    if (status === 'SENT') {
        updates.push(`sent_at = CURRENT_TIMESTAMP`);
    } else if (status === 'DELIVERED') {
        updates.push(`delivered_at = CURRENT_TIMESTAMP`);
    } else if (status === 'READ') {
        updates.push(`read_at = CURRENT_TIMESTAMP`);
    } else if (status === 'FAILED') {
        if (errorCode) {
            updates.push(`error_code = $${paramIndex}`);
            params.push(errorCode);
            paramIndex++;
        }
        if (errorMessage) {
            updates.push(`error_message = $${paramIndex}`);
            params.push(errorMessage);
            paramIndex++;
        }
    }

    const result = await db.query<TemplateSend>(
        `UPDATE template_sends SET ${updates.join(', ')} WHERE send_id = $1 RETURNING *`,
        params
    );

    return result.rows[0] || null;
}

/**
 * Get template send by platform message ID
 */
export async function getTemplateSendByPlatformMessageId(platformMessageId: string): Promise<TemplateSend | null> {
    const result = await db.query<TemplateSend>(
        'SELECT * FROM template_sends WHERE platform_message_id = $1',
        [platformMessageId]
    );
    return result.rows[0] || null;
}

/**
 * Get template analytics
 */
export async function getTemplateAnalytics(templateId: string): Promise<{
    totalSent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
}> {
    const result = await db.query<{
        total: string;
        sent: string;
        delivered: string;
        read: string;
        failed: string;
    }>(
        `SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'READ')) as sent,
            COUNT(*) FILTER (WHERE status IN ('DELIVERED', 'READ')) as delivered,
            COUNT(*) FILTER (WHERE status = 'READ') as read,
            COUNT(*) FILTER (WHERE status = 'FAILED') as failed
        FROM template_sends 
        WHERE template_id = $1`,
        [templateId]
    );

    const row = result.rows[0]!;
    const totalSent = parseInt(row.sent, 10);
    const delivered = parseInt(row.delivered, 10);
    const read = parseInt(row.read, 10);
    const failed = parseInt(row.failed, 10);

    return {
        totalSent,
        delivered,
        read,
        failed,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        readRate: totalSent > 0 ? (read / totalSent) * 100 : 0,
    };
}

export const templateService = {
    createTemplate,
    getTemplateById,
    getTemplatesByUserId,
    getAllTemplates,
    updateTemplate,
    deleteTemplate,
    submitTemplateToMeta,
    syncTemplateStatusFromMeta,
    deleteTemplateFromMeta,
    validateTemplateComponents,
    createTemplateVariable,
    getTemplateVariables,
    deleteTemplateVariable,
    substituteVariables,
    createTemplateSend,
    updateTemplateSendStatus,
    getTemplateSendByPlatformMessageId,
    getTemplateAnalytics,
};
