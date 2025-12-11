/**
 * Typed Event Emitter for Campaign Triggers
 * Provides a pub/sub pattern for system events like extraction completion, lead status changes
 */

import { EventEmitter } from 'events';
import { logger } from './logger';
import type {
    SystemEvent,
    ExtractionCompleteEvent,
    LeadStatusChangedEvent,
    ContactTagAddedEvent,
} from '../models/types';

// Event names as constants
export const EVENTS = {
    EXTRACTION_COMPLETE: 'extraction.complete',
    LEAD_STATUS_CHANGED: 'lead.statusChanged',
    CONTACT_TAG_ADDED: 'contact.tagAdded',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

// Type-safe event handler types
type ExtractionCompleteHandler = (event: ExtractionCompleteEvent) => void | Promise<void>;
type LeadStatusChangedHandler = (event: LeadStatusChangedEvent) => void | Promise<void>;
type ContactTagAddedHandler = (event: ContactTagAddedEvent) => void | Promise<void>;

type EventHandler<T extends SystemEvent> = (event: T) => void | Promise<void>;

/**
 * Typed event emitter for system events
 * Used to trigger campaigns based on events like new extractions, lead status changes, etc.
 */
class AppEventEmitter {
    private emitter: EventEmitter;
    private listenerCounts: Map<string, number>;

    constructor() {
        this.emitter = new EventEmitter();
        this.listenerCounts = new Map();
        
        // Increase max listeners to handle multiple campaign triggers
        this.emitter.setMaxListeners(100);

        // Error handling
        this.emitter.on('error', (error) => {
            logger.error('Event emitter error', { error });
        });
    }

    /**
     * Subscribe to extraction complete events
     */
    onExtractionComplete(handler: ExtractionCompleteHandler): void {
        this.on(EVENTS.EXTRACTION_COMPLETE, handler as EventHandler<ExtractionCompleteEvent>);
    }

    /**
     * Subscribe to lead status changed events
     */
    onLeadStatusChanged(handler: LeadStatusChangedHandler): void {
        this.on(EVENTS.LEAD_STATUS_CHANGED, handler as EventHandler<LeadStatusChangedEvent>);
    }

    /**
     * Subscribe to contact tag added events
     */
    onContactTagAdded(handler: ContactTagAddedHandler): void {
        this.on(EVENTS.CONTACT_TAG_ADDED, handler as EventHandler<ContactTagAddedEvent>);
    }

    /**
     * Emit extraction complete event
     */
    emitExtractionComplete(payload: ExtractionCompleteEvent['payload']): void {
        const event: ExtractionCompleteEvent = {
            type: EVENTS.EXTRACTION_COMPLETE,
            payload,
            timestamp: new Date(),
        };
        this.emit(EVENTS.EXTRACTION_COMPLETE, event);
    }

    /**
     * Emit lead status changed event
     */
    emitLeadStatusChanged(payload: LeadStatusChangedEvent['payload']): void {
        const event: LeadStatusChangedEvent = {
            type: EVENTS.LEAD_STATUS_CHANGED,
            payload,
            timestamp: new Date(),
        };
        this.emit(EVENTS.LEAD_STATUS_CHANGED, event);
    }

    /**
     * Emit contact tag added event
     */
    emitContactTagAdded(payload: ContactTagAddedEvent['payload']): void {
        const event: ContactTagAddedEvent = {
            type: EVENTS.CONTACT_TAG_ADDED,
            payload,
            timestamp: new Date(),
        };
        this.emit(EVENTS.CONTACT_TAG_ADDED, event);
    }

    /**
     * Generic event subscription
     */
    private on<T extends SystemEvent>(eventName: EventName, handler: EventHandler<T>): void {
        const wrappedHandler = async (event: T) => {
            try {
                await handler(event);
            } catch (error) {
                logger.error(`Error in event handler for ${eventName}`, {
                    error,
                    eventType: event.type,
                });
            }
        };

        this.emitter.on(eventName, wrappedHandler);
        
        const count = (this.listenerCounts.get(eventName) || 0) + 1;
        this.listenerCounts.set(eventName, count);
        
        logger.debug(`Added listener for ${eventName}`, { totalListeners: count });
    }

    /**
     * One-time event subscription
     */
    once<T extends SystemEvent>(eventName: EventName, handler: EventHandler<T>): void {
        const wrappedHandler = async (event: T) => {
            try {
                await handler(event);
            } catch (error) {
                logger.error(`Error in one-time event handler for ${eventName}`, {
                    error,
                    eventType: event.type,
                });
            }
        };

        this.emitter.once(eventName, wrappedHandler);
    }

    /**
     * Generic event emission
     */
    private emit<T extends SystemEvent>(eventName: EventName, event: T): void {
        const listenerCount = this.emitter.listenerCount(eventName);
        
        if (listenerCount === 0) {
            logger.debug(`No listeners for event ${eventName}`, { eventType: event.type });
            return;
        }

        logger.info(`Emitting event ${eventName}`, {
            eventType: event.type,
            listenerCount,
            payload: event.payload,
        });

        this.emitter.emit(eventName, event);
    }

    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName?: EventName): void {
        if (eventName) {
            this.emitter.removeAllListeners(eventName);
            this.listenerCounts.delete(eventName);
            logger.debug(`Removed all listeners for ${eventName}`);
        } else {
            this.emitter.removeAllListeners();
            this.listenerCounts.clear();
            logger.debug('Removed all event listeners');
        }
    }

    /**
     * Get listener count for an event
     */
    listenerCount(eventName: EventName): number {
        return this.emitter.listenerCount(eventName);
    }

    /**
     * Get all registered event names
     */
    eventNames(): EventName[] {
        return this.emitter.eventNames() as EventName[];
    }

    /**
     * Get stats about event listeners
     */
    getStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        for (const eventName of Object.values(EVENTS)) {
            stats[eventName] = this.emitter.listenerCount(eventName);
        }
        return stats;
    }
}

// Export singleton instance
export const appEventEmitter = new AppEventEmitter();

// Export class for testing
export { AppEventEmitter };
