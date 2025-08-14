import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ResponseUtil } from '../utils/response';
import { Player } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class PlayerController {
  // Get all players
  static async getAllPlayers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const position = req.query.position as string;
      const status = req.query.status as string;

      let whereClause = '';
      const params: any[] = [];

      if (position) {
        whereClause += 'WHERE position = ?';
        params.push(position);
      }

      if (status) {
        whereClause += whereClause ? ' AND status = ?' : 'WHERE status = ?';
        params.push(status);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM players ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get players
      const [players] = await pool.execute(
        `SELECT * FROM players ${whereClause} ORDER BY jersey_number ASC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'Players retrieved successfully', players, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get players error:', error);
      return ResponseUtil.error(res, 'Failed to get players', 500, error.message);
    }
  }

  // Get player by ID
  static async getPlayerById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [players] = await pool.execute(
        'SELECT * FROM players WHERE id = ?',
        [id]
      );

      const player = (players as Player[])[0];

      if (!player) {
        return ResponseUtil.notFound(res, 'Player not found');
      }

      return ResponseUtil.success(res, 'Player retrieved successfully', player);

    } catch (error: any) {
      console.error('Get player error:', error);
      return ResponseUtil.error(res, 'Failed to get player', 500, error.message);
    }
  }

  // Create new player (Admin only)
  static async createPlayer(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        jersey_number,
        position,
        age,
        height,
        weight,
        biography,
        joined_date,
        status
      } = req.body;

      // Check if jersey number is already taken
      const [existingPlayer] = await pool.execute(
        'SELECT id FROM players WHERE jersey_number = ?',
        [jersey_number]
      );

      if ((existingPlayer as any[]).length > 0) {
        return ResponseUtil.badRequest(res, 'Jersey number is already taken');
      }

      let photo = null;
      if (req.file) {
        photo = `/uploads/players/${req.file.filename}`;
      }

      const [result] = await pool.execute(
        `INSERT INTO players (
          name, jersey_number, position, age, height, weight, 
          photo, biography, joined_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, jersey_number, position, age, height, weight, photo, biography, joined_date, status || 'active']
      );

      const playerId = (result as any).insertId;

      const [newPlayer] = await pool.execute(
        'SELECT * FROM players WHERE id = ?',
        [playerId]
      );

      return ResponseUtil.success(res, 'Player created successfully', (newPlayer as any[])[0], 201);

    } catch (error: any) {
      console.error('Create player error:', error);
      return ResponseUtil.error(res, 'Failed to create player', 500, error.message);
    }
  }

  // Update player (Admin only)
  static async updatePlayer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        jersey_number,
        position,
        age,
        height,
        weight,
        biography,
        joined_date,
        status
      } = req.body;

      // Check if player exists
      const [existingPlayer] = await pool.execute(
        'SELECT * FROM players WHERE id = ?',
        [id]
      );

      if ((existingPlayer as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'Player not found');
      }

      const currentPlayer = (existingPlayer as any[])[0];

      // Check if jersey number is taken by another player
      if (jersey_number !== currentPlayer.jersey_number) {
        const [duplicatePlayer] = await pool.execute(
          'SELECT id FROM players WHERE jersey_number = ? AND id != ?',
          [jersey_number, id]
        );

        if ((duplicatePlayer as any[]).length > 0) {
          return ResponseUtil.badRequest(res, 'Jersey number is already taken by another player');
        }
      }

      let photo = currentPlayer.photo;
      if (req.file) {
        photo = `/uploads/players/${req.file.filename}`;
      }

      await pool.execute(
        `UPDATE players SET 
          name = ?, jersey_number = ?, position = ?, age = ?, height = ?, weight = ?,
          photo = ?, biography = ?, joined_date = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [name, jersey_number, position, age, height, weight, photo, biography, joined_date, status, id]
      );

      const [updatedPlayer] = await pool.execute(
        'SELECT * FROM players WHERE id = ?',
        [id]
      );

      return ResponseUtil.success(res, 'Player updated successfully', (updatedPlayer as any[])[0]);

    } catch (error: any) {
      console.error('Update player error:', error);
      return ResponseUtil.error(res, 'Failed to update player', 500, error.message);
    }
  }

  // Delete player (Admin only)
  static async deletePlayer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if player exists
      const [existingPlayer] = await pool.execute(
        'SELECT id FROM players WHERE id = ?',
        [id]
      );

      if ((existingPlayer as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'Player not found');
      }

      await pool.execute('DELETE FROM players WHERE id = ?', [id]);

      return ResponseUtil.success(res, 'Player deleted successfully');

    } catch (error: any) {
      console.error('Delete player error:', error);
      return ResponseUtil.error(res, 'Failed to delete player', 500, error.message);
    }
  }

  // Get players by position
  static async getPlayersByPosition(req: Request, res: Response) {
    try {
      const { position } = req.params;

      const [players] = await pool.execute(
        'SELECT * FROM players WHERE position = ? AND status = "active" ORDER BY jersey_number ASC',
        [position]
      );

      return ResponseUtil.success(res, 'Players retrieved successfully', players);

    } catch (error: any) {
      console.error('Get players by position error:', error);
      return ResponseUtil.error(res, 'Failed to get players', 500, error.message);
    }
  }

  // Get squad (active players)
  static async getSquad(req: Request, res: Response) {
    try {
      const [players] = await pool.execute(
        'SELECT * FROM players WHERE status = "active" ORDER BY jersey_number ASC'
      );

      // Group players by position
      const squad = {
        goalkeepers: [],
        defenders: [],
        midfielders: [],
        forwards: []
      };

      (players as any[]).forEach(player => {
        switch (player.position.toLowerCase()) {
          case 'goalkeeper':
          case 'gk':
            (squad.goalkeepers as any[]).push(player);
            break;
          case 'defender':
          case 'centre-back':
          case 'left-back':
          case 'right-back':
          case 'df':
            (squad.defenders as any[]).push(player);
            break;
          case 'midfielder':
          case 'central midfielder':
          case 'attacking midfielder':
          case 'defensive midfielder':
          case 'mf':
            (squad.midfielders as any[]).push(player);
            break;
          case 'forward':
          case 'striker':
          case 'winger':
          case 'fw':
            (squad.forwards as any[]).push(player);
            break;
          default:
            (squad.midfielders as any[]).push(player);
        }
      });

      return ResponseUtil.success(res, 'Squad retrieved successfully', squad);

    } catch (error: any) {
      console.error('Get squad error:', error);
      return ResponseUtil.error(res, 'Failed to get squad', 500, error.message);
    }
  }
}