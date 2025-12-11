import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { getAuthenticatedClient, hasGoogleCalendarConnected } from './googleCalendarService';

export interface MeetingBookingRequest {
  action: string;
  name: string;
  email: string;
  title: string;
  participants: string[];
  meeting_time: string; // ISO 8601 with timezone
  friendly_time: string;
}

export interface MeetingBookingResult {
  success: boolean;
  meeting_id?: string;
  meet_link?: string;
  error?: string;
  message?: string;
}

/**
 * Book a meeting from OpenAI response
 */
export async function bookMeetingFromOpenAI(
  conversationId: string,
  meetingData: MeetingBookingRequest
): Promise<MeetingBookingResult> {
  try {
    // Get user_id from conversation
    const userId = await getUserIdFromConversation(conversationId);
    
    if (!userId) {
      logger.error('Could not find user for conversation', { conversationId });
      return {
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Could not identify user for this conversation'
      };
    }

    // Check if user has Google Calendar connected
    const hasCalendar = await hasGoogleCalendarConnected(userId);
    
    if (!hasCalendar) {
      logger.warn('User does not have Google Calendar connected', { userId, conversationId });
      return {
        success: false,
        error: 'CALENDAR_NOT_CONNECTED',
        message: process.env['MEETING_ERROR_MESSAGE'] || 'Ohhh we having trouble scheduling the meeting'
      };
    }

    // Book the meeting
    const result = await createGoogleCalendarEvent(userId, conversationId, meetingData);
    
    return result;
  } catch (error) {
    logger.error('Failed to book meeting from OpenAI', { conversationId, error });
    return {
      success: false,
      error: 'BOOKING_FAILED',
      message: process.env['MEETING_ERROR_MESSAGE'] || 'Ohhh we having trouble scheduling the meeting'
    };
  }
}

/**
 * Get user_id from conversation_id
 */
async function getUserIdFromConversation(conversationId: string): Promise<string | null> {
  try {
    const result = await db.query(
      `SELECT u.user_id
       FROM conversations c
       JOIN agents a ON c.agent_id = a.agent_id
       JOIN users u ON a.user_id = u.user_id
       WHERE c.conversation_id = $1`,
      [conversationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].user_id;
  } catch (error) {
    logger.error('Failed to get user_id from conversation', { conversationId, error });
    return null;
  }
}

/**
 * Create Google Calendar event
 */
async function createGoogleCalendarEvent(
  userId: string,
  conversationId: string,
  meetingData: MeetingBookingRequest
): Promise<MeetingBookingResult> {
  try {
    // Get authenticated OAuth2 client (auto-refreshes token if needed)
    const oauth2Client = await getAuthenticatedClient(userId);
    
    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse meeting time
    const startTime = new Date(meetingData.meeting_time);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes default

    // Extract timezone from meeting_time (e.g., "2025-10-06T19:00:00+05:30")
    const timezoneMatch = meetingData.meeting_time.match(/([+-]\d{2}:\d{2})$/);
    const timezone = timezoneMatch ? `UTC${timezoneMatch[1]}` : 'UTC';

    // Prepare event data
    const eventData = {
      summary: meetingData.title,
      description: `Meeting booked via AI agent with ${meetingData.name}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: timezone,
      },
      attendees: meetingData.participants.map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    // Create the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
      conferenceDataVersion: 1,
      sendUpdates: 'all' // Send email invites to all attendees
    });

    const event = response.data;
    const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || '';
    const googleEventId = event.id || '';

    // Store meeting in database
    const meetingId = uuidv4();
    await db.query(
      `INSERT INTO meetings 
       (meeting_id, user_id, conversation_id, google_event_id, title, 
        customer_name, customer_email, participants, meeting_time, 
        duration_minutes, timezone, meet_link, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        meetingId,
        userId,
        conversationId,
        googleEventId,
        meetingData.title,
        meetingData.name,
        meetingData.email,
        meetingData.participants,
        startTime,
        30,
        timezone,
        meetLink,
        'scheduled'
      ]
    );

    logger.info('Meeting booked successfully', {
      meetingId,
      userId,
      conversationId,
      googleEventId,
      meetLink
    });

    return {
      success: true,
      meeting_id: meetingId,
      meet_link: meetLink,
      message: `Meeting scheduled for ${meetingData.friendly_time}`
    };
  } catch (error: any) {
    logger.error('Failed to create Google Calendar event', {
      userId,
      conversationId,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: 'CALENDAR_API_ERROR',
      message: process.env['MEETING_ERROR_MESSAGE'] || 'Ohhh we having trouble scheduling the meeting'
    };
  }
}

/**
 * Get meeting details by ID
 */
export async function getMeetingById(meetingId: string): Promise<any> {
  try {
    const result = await db.query(
      `SELECT * FROM meetings WHERE meeting_id = $1`,
      [meetingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get meeting', { meetingId, error });
    return null;
  }
}

/**
 * Get all meetings for a user
 */
export async function getUserMeetings(userId: string): Promise<any[]> {
  try {
    const result = await db.query(
      `SELECT * FROM meetings 
       WHERE user_id = $1 
       ORDER BY meeting_time DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to get user meetings', { userId, error });
    return [];
  }
}

/**
 * Cancel a meeting
 */
export async function cancelMeeting(meetingId: string): Promise<boolean> {
  try {
    // Get meeting details
    const meeting = await getMeetingById(meetingId);
    
    if (!meeting) {
      return false;
    }

    // Update status in database
    await db.query(
      `UPDATE meetings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE meeting_id = $1`,
      [meetingId]
    );

    // TODO: Optionally cancel in Google Calendar as well
    // const oauth2Client = await getAuthenticatedClient(meeting.user_id);
    // const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    // await calendar.events.delete({
    //   calendarId: 'primary',
    //   eventId: meeting.google_event_id
    // });

    logger.info('Meeting cancelled', { meetingId });
    return true;
  } catch (error) {
    logger.error('Failed to cancel meeting', { meetingId, error });
    return false;
  }
}
