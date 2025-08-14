import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ResponseUtil } from '../utils/response';
import { QRCodeUtil } from '../utils/qrcode';
import { Ticket } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class TicketController {
  // Purchase ticket
  static async purchaseTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { match_id, ticket_type, quantity, payment_method } = req.body;

      // Check if match exists and get ticket price
      const [matches] = await pool.execute(
        'SELECT * FROM matches WHERE id = ? AND status = "scheduled" AND match_date > NOW()',
        [match_id]
      );

      const match = (matches as any[])[0];

      if (!match) {
        return ResponseUtil.notFound(res, 'Match not found or not available for booking');
      }

      // Get ticket price based on type
      let price = 0;
      switch (ticket_type) {
        case 'vip':
          price = match.ticket_price_vip;
          break;
        case 'tribune':
          price = match.ticket_price_tribune;
          break;
        case 'economy':
          price = match.ticket_price_economy;
          break;
        default:
          return ResponseUtil.badRequest(res, 'Invalid ticket type');
      }

      if (!price) {
        return ResponseUtil.badRequest(res, `${ticket_type} tickets are not available for this match`);
      }

      const totalPrice = price * quantity;
      const bookingReference = QRCodeUtil.generateBookingReference();

      // Create ticket record
      const [result] = await pool.execute(
        `INSERT INTO tickets (
          match_id, user_id, ticket_type, quantity, price, total_price,
          booking_reference, payment_method, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
        [match_id, userId, ticket_type, quantity, price, totalPrice, bookingReference, payment_method]
      );

      const ticketId = (result as any).insertId;

      // Generate QR code for the ticket
      const userEmail = req.user?.email || '';
      const qrCodeData = await QRCodeUtil.generateTicketQR({
        bookingReference,
        matchId: match_id,
        ticketType: ticket_type,
        quantity,
        userEmail
      });

      // Update ticket with QR code
      await pool.execute(
        'UPDATE tickets SET qr_code = ? WHERE id = ?',
        [qrCodeData, ticketId]
      );

      // Get the complete ticket information
      const [ticketInfo] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         WHERE t.id = ?`,
        [ticketId]
      );

      return ResponseUtil.success(res, 'Ticket purchased successfully', (ticketInfo as any[])[0], 201);

    } catch (error: any) {
      console.error('Purchase ticket error:', error);
      return ResponseUtil.error(res, 'Failed to purchase ticket', 500, error.message);
    }
  }

  // Get user's tickets
  static async getUserTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause = 'WHERE t.user_id = ?';
      const params: any[] = [userId];

      if (status) {
        whereClause += ' AND t.status = ?';
        params.push(status);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM tickets t ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get tickets
      const [tickets] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'Tickets retrieved successfully', tickets, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get user tickets error:', error);
      return ResponseUtil.error(res, 'Failed to get tickets', 500, error.message);
    }
  }

  // Get ticket by booking reference
  static async getTicketByReference(req: Request, res: Response) {
    try {
      const { reference } = req.params;

      const [tickets] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition,
                u.name as user_name, u.email as user_email
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         JOIN users u ON t.user_id = u.id
         WHERE t.booking_reference = ?`,
        [reference]
      );

      const ticket = (tickets as any[])[0];

      if (!ticket) {
        return ResponseUtil.notFound(res, 'Ticket not found');
      }

      return ResponseUtil.success(res, 'Ticket retrieved successfully', ticket);

    } catch (error: any) {
      console.error('Get ticket by reference error:', error);
      return ResponseUtil.error(res, 'Failed to get ticket', 500, error.message);
    }
  }

  // Update ticket payment status (Admin only)
  static async updatePaymentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { payment_status, payment_reference } = req.body;

      // Check if ticket exists
      const [existingTicket] = await pool.execute(
        'SELECT * FROM tickets WHERE id = ?',
        [id]
      );

      if ((existingTicket as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'Ticket not found');
      }

      let status = 'pending';
      if (payment_status === 'paid') {
        status = 'paid';
      }

      await pool.execute(
        'UPDATE tickets SET payment_status = ?, status = ?, payment_reference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [payment_status, status, payment_reference, id]
      );

      const [updatedTicket] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         WHERE t.id = ?`,
        [id]
      );

      return ResponseUtil.success(res, 'Payment status updated successfully', (updatedTicket as any[])[0]);

    } catch (error: any) {
      console.error('Update payment status error:', error);
      return ResponseUtil.error(res, 'Failed to update payment status', 500, error.message);
    }
  }

  // Cancel ticket
  static async cancelTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Check if ticket exists and belongs to user
      const [tickets] = await pool.execute(
        'SELECT * FROM tickets t JOIN matches m ON t.match_id = m.id WHERE t.id = ? AND t.user_id = ?',
        [id, userId]
      );

      const ticket = (tickets as any[])[0];

      if (!ticket) {
        return ResponseUtil.notFound(res, 'Ticket not found');
      }

      if (ticket.status === 'used') {
        return ResponseUtil.badRequest(res, 'Cannot cancel used ticket');
      }

      if (ticket.status === 'cancelled') {
        return ResponseUtil.badRequest(res, 'Ticket is already cancelled');
      }

      // Check if match is still more than 24 hours away
      const matchDate = new Date(ticket.match_date);
      const now = new Date();
      const hoursDifference = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDifference < 24) {
        return ResponseUtil.badRequest(res, 'Cannot cancel ticket less than 24 hours before the match');
      }

      await pool.execute(
        'UPDATE tickets SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      return ResponseUtil.success(res, 'Ticket cancelled successfully');

    } catch (error: any) {
      console.error('Cancel ticket error:', error);
      return ResponseUtil.error(res, 'Failed to cancel ticket', 500, error.message);
    }
  }

  // Validate ticket (Admin only - for entry)
  static async validateTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const { reference } = req.params;

      // Get ticket information
      const [tickets] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         WHERE t.booking_reference = ?`,
        [reference]
      );

      const ticket = (tickets as any[])[0];

      if (!ticket) {
        return ResponseUtil.notFound(res, 'Invalid ticket');
      }

      if (ticket.status !== 'paid') {
        return ResponseUtil.badRequest(res, 'Ticket is not paid or has been cancelled');
      }

      if (ticket.status === 'used') {
        return ResponseUtil.badRequest(res, 'Ticket has already been used');
      }

      // Check if it's the match day (allow entry 4 hours before match)
      const matchDate = new Date(ticket.match_date);
      const now = new Date();
      const hoursBeforeMatch = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursBeforeMatch > 4) {
        return ResponseUtil.badRequest(res, 'Entry not allowed yet. Gates open 4 hours before match');
      }

      if (hoursBeforeMatch < -2) {
        return ResponseUtil.badRequest(res, 'Entry time has expired');
      }

      // Mark ticket as used
      await pool.execute(
        'UPDATE tickets SET status = "used", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [ticket.id]
      );

      return ResponseUtil.success(res, 'Ticket validated successfully', {
        ticket: {
          booking_reference: ticket.booking_reference,
          match: `${ticket.home_team} vs ${ticket.away_team}`,
          date: ticket.match_date,
          venue: ticket.venue,
          ticket_type: ticket.ticket_type,
          quantity: ticket.quantity
        }
      });

    } catch (error: any) {
      console.error('Validate ticket error:', error);
      return ResponseUtil.error(res, 'Failed to validate ticket', 500, error.message);
    }
  }

  // Get all tickets (Admin only)
  static async getAllTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const match_id = req.query.match_id as string;

      let whereClause = '';
      const params: any[] = [];

      if (status) {
        whereClause += 'WHERE t.status = ?';
        params.push(status);
      }

      if (match_id) {
        whereClause += whereClause ? ' AND t.match_id = ?' : 'WHERE t.match_id = ?';
        params.push(match_id);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM tickets t ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get tickets
      const [tickets] = await pool.execute(
        `SELECT t.*, m.home_team, m.away_team, m.match_date, m.venue, m.competition,
                u.name as user_name, u.email as user_email
         FROM tickets t
         JOIN matches m ON t.match_id = m.id
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'All tickets retrieved successfully', tickets, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get all tickets error:', error);
      return ResponseUtil.error(res, 'Failed to get tickets', 500, error.message);
    }
  }
}