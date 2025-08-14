import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ResponseUtil } from '../utils/response';
import { Match } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class MatchController {
  // Get all matches with pagination
  static async getAllMatches(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const competition = req.query.competition as string;

      let whereClause = '';
      const params: any[] = [];

      if (status) {
        whereClause += 'WHERE status = ?';
        params.push(status);
      }

      if (competition) {
        whereClause += whereClause ? ' AND competition = ?' : 'WHERE competition = ?';
        params.push(competition);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM matches ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get matches
      const [matches] = await pool.execute(
        `SELECT * FROM matches ${whereClause} ORDER BY match_date ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'Matches retrieved successfully', matches, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get matches error:', error);
      return ResponseUtil.error(res, 'Failed to get matches', 500, error.message);
    }
  }

  // Get match by ID
  static async getMatchById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [matches] = await pool.execute(
        'SELECT * FROM matches WHERE id = ?',
        [id]
      );

      const match = (matches as Match[])[0];

      if (!match) {
        return ResponseUtil.notFound(res, 'Match not found');
      }

      return ResponseUtil.success(res, 'Match retrieved successfully', match);

    } catch (error: any) {
      console.error('Get match error:', error);
      return ResponseUtil.error(res, 'Failed to get match', 500, error.message);
    }
  }

  // Create new match (Admin only)
  static async createMatch(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        home_team,
        away_team,
        match_date,
        venue,
        competition,
        ticket_price_vip,
        ticket_price_tribune,
        ticket_price_economy,
        description
      } = req.body;

      const [result] = await pool.execute(
        `INSERT INTO matches (
          home_team, away_team, match_date, venue, competition,
          ticket_price_vip, ticket_price_tribune, ticket_price_economy, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          home_team, away_team, match_date, venue, competition,
          ticket_price_vip, ticket_price_tribune, ticket_price_economy, description
        ]
      );

      const matchId = (result as any).insertId;

      const [newMatch] = await pool.execute(
        'SELECT * FROM matches WHERE id = ?',
        [matchId]
      );

      return ResponseUtil.success(res, 'Match created successfully', (newMatch as any[])[0], 201);

    } catch (error: any) {
      console.error('Create match error:', error);
      return ResponseUtil.error(res, 'Failed to create match', 500, error.message);
    }
  }

  // Update match (Admin only)
  static async updateMatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        home_team,
        away_team,
        match_date,
        venue,
        competition,
        home_score,
        away_score,
        status,
        ticket_price_vip,
        ticket_price_tribune,
        ticket_price_economy,
        description
      } = req.body;

      // Check if match exists
      const [existingMatch] = await pool.execute(
        'SELECT id FROM matches WHERE id = ?',
        [id]
      );

      if ((existingMatch as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'Match not found');
      }

      await pool.execute(
        `UPDATE matches SET 
          home_team = ?, away_team = ?, match_date = ?, venue = ?, competition = ?,
          home_score = ?, away_score = ?, status = ?, ticket_price_vip = ?,
          ticket_price_tribune = ?, ticket_price_economy = ?, description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          home_team, away_team, match_date, venue, competition,
          home_score, away_score, status, ticket_price_vip,
          ticket_price_tribune, ticket_price_economy, description, id
        ]
      );

      const [updatedMatch] = await pool.execute(
        'SELECT * FROM matches WHERE id = ?',
        [id]
      );

      return ResponseUtil.success(res, 'Match updated successfully', (updatedMatch as any[])[0]);

    } catch (error: any) {
      console.error('Update match error:', error);
      return ResponseUtil.error(res, 'Failed to update match', 500, error.message);
    }
  }

  // Delete match (Admin only)
  static async deleteMatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if match exists
      const [existingMatch] = await pool.execute(
        'SELECT id FROM matches WHERE id = ?',
        [id]
      );

      if ((existingMatch as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'Match not found');
      }

      await pool.execute('DELETE FROM matches WHERE id = ?', [id]);

      return ResponseUtil.success(res, 'Match deleted successfully');

    } catch (error: any) {
      console.error('Delete match error:', error);
      return ResponseUtil.error(res, 'Failed to delete match', 500, error.message);
    }
  }

  // Get upcoming matches
  static async getUpcomingMatches(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;

      const [matches] = await pool.execute(
        'SELECT * FROM matches WHERE match_date > NOW() AND status = "scheduled" ORDER BY match_date ASC LIMIT ?',
        [limit]
      );

      return ResponseUtil.success(res, 'Upcoming matches retrieved successfully', matches);

    } catch (error: any) {
      console.error('Get upcoming matches error:', error);
      return ResponseUtil.error(res, 'Failed to get upcoming matches', 500, error.message);
    }
  }

  // Get recent results
  static async getRecentResults(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;

      const [matches] = await pool.execute(
        'SELECT * FROM matches WHERE status = "finished" ORDER BY match_date DESC LIMIT ?',
        [limit]
      );

      return ResponseUtil.success(res, 'Recent results retrieved successfully', matches);

    } catch (error: any) {
      console.error('Get recent results error:', error);
      return ResponseUtil.error(res, 'Failed to get recent results', 500, error.message);
    }
  }
}