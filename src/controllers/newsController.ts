import { Request, Response } from 'express';
import { pool } from '../config/database';
import { ResponseUtil } from '../utils/response';
// import { News } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class NewsController {
  // Get all published news
  static async getAllNews(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const category = req.query.category as string;

      let whereClause = 'WHERE n.status = "published"';
      const params: any[] = [];

      if (category) {
        whereClause += ' AND c.name = ?';
        params.push(category);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM news n 
         LEFT JOIN categories c ON n.category_id = c.id 
         ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get news
      const [news] = await pool.execute(
        `SELECT n.*, c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         ${whereClause}
         ORDER BY n.published_at DESC, n.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'News retrieved successfully', news, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get news error:', error);
      return ResponseUtil.error(res, 'Failed to get news', 500, error.message);
    }
  }

  // Get news by slug
  static async getNewsBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const [news] = await pool.execute(
        `SELECT n.*, c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         WHERE n.slug = ? AND n.status = "published"`,
        [slug]
      );

      const article = (news as any[])[0];

      if (!article) {
        return ResponseUtil.notFound(res, 'News article not found');
      }

      return ResponseUtil.success(res, 'News article retrieved successfully', article);

    } catch (error: any) {
      console.error('Get news by slug error:', error);
      return ResponseUtil.error(res, 'Failed to get news article', 500, error.message);
    }
  }

  // Create new news (Admin only)
  static async createNews(req: AuthenticatedRequest, res: Response) {
    try {
      const authorId = req.user?.id;
      const {
        title,
        slug,
        content,
        excerpt,
        category_id,
        status
      } = req.body;

      // Check if slug is unique
      const [existingNews] = await pool.execute(
        'SELECT id FROM news WHERE slug = ?',
        [slug]
      );

      if ((existingNews as any[]).length > 0) {
        return ResponseUtil.badRequest(res, 'Slug already exists');
      }

      let featured_image = null;
      if (req.file) {
        featured_image = `/uploads/news/${req.file.filename}`;
      }

      const published_at = status === 'published' ? new Date() : null;

      const [result] = await pool.execute(
        `INSERT INTO news (
          title, slug, content, excerpt, featured_image, 
          category_id, author_id, status, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, slug, content, excerpt, featured_image, category_id, authorId, status, published_at]
      );

      const newsId = (result as any).insertId;

      const [newNews] = await pool.execute(
        `SELECT n.*, c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         WHERE n.id = ?`,
        [newsId]
      );

      return ResponseUtil.success(res, 'News created successfully', (newNews as any[])[0], 201);

    } catch (error: any) {
      console.error('Create news error:', error);
      return ResponseUtil.error(res, 'Failed to create news', 500, error.message);
    }
  }

  // Update news (Admin only)
  static async updateNews(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        slug,
        content,
        excerpt,
        category_id,
        status
      } = req.body;

      // Check if news exists
      const [existingNews] = await pool.execute(
        'SELECT * FROM news WHERE id = ?',
        [id]
      );

      if ((existingNews as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'News not found');
      }

      const currentNews = (existingNews as any[])[0];

      // Check if slug is unique (if changed)
      if (slug !== currentNews.slug) {
        const [duplicateNews] = await pool.execute(
          'SELECT id FROM news WHERE slug = ? AND id != ?',
          [slug, id]
        );

        if ((duplicateNews as any[]).length > 0) {
          return ResponseUtil.badRequest(res, 'Slug already exists');
        }
      }

      let featured_image = currentNews.featured_image;
      if (req.file) {
        featured_image = `/uploads/news/${req.file.filename}`;
      }

      // Update published_at if status changed to published
      let published_at = currentNews.published_at;
      if (status === 'published' && currentNews.status !== 'published') {
        published_at = new Date();
      }

      await pool.execute(
        `UPDATE news SET 
          title = ?, slug = ?, content = ?, excerpt = ?, featured_image = ?,
          category_id = ?, status = ?, published_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [title, slug, content, excerpt, featured_image, category_id, status, published_at, id]
      );

      const [updatedNews] = await pool.execute(
        `SELECT n.*, c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         WHERE n.id = ?`,
        [id]
      );

      return ResponseUtil.success(res, 'News updated successfully', (updatedNews as any[])[0]);

    } catch (error: any) {
      console.error('Update news error:', error);
      return ResponseUtil.error(res, 'Failed to update news', 500, error.message);
    }
  }

  // Delete news (Admin only)
  static async deleteNews(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Check if news exists
      const [existingNews] = await pool.execute(
        'SELECT id FROM news WHERE id = ?',
        [id]
      );

      if ((existingNews as any[]).length === 0) {
        return ResponseUtil.notFound(res, 'News not found');
      }

      await pool.execute('DELETE FROM news WHERE id = ?', [id]);

      return ResponseUtil.success(res, 'News deleted successfully');

    } catch (error: any) {
      console.error('Delete news error:', error);
      return ResponseUtil.error(res, 'Failed to delete news', 500, error.message);
    }
  }

  // Get latest news
  static async getLatestNews(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;

      const [news] = await pool.execute(
        `SELECT n.id, n.title, n.slug, n.excerpt, n.featured_image, n.published_at,
                c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         WHERE n.status = "published"
         ORDER BY n.published_at DESC, n.created_at DESC
         LIMIT ?`,
        [limit]
      );

      return ResponseUtil.success(res, 'Latest news retrieved successfully', news);

    } catch (error: any) {
      console.error('Get latest news error:', error);
      return ResponseUtil.error(res, 'Failed to get latest news', 500, error.message);
    }
  }

  // Get all news for admin
  static async getAllNewsAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause = '';
      const params: any[] = [];

      if (status) {
        whereClause = 'WHERE n.status = ?';
        params.push(status);
      }

      // Get total count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM news n ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Get news
      const [news] = await pool.execute(
        `SELECT n.*, c.name as category_name, u.name as author_name 
         FROM news n
         LEFT JOIN categories c ON n.category_id = c.id
         LEFT JOIN users u ON n.author_id = u.id
         ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const totalPages = Math.ceil(total / limit);

      return ResponseUtil.success(res, 'All news retrieved successfully', news, 200, {
        total,
        page,
        limit,
        totalPages
      });

    } catch (error: any) {
      console.error('Get all news admin error:', error);
      return ResponseUtil.error(res, 'Failed to get news', 500, error.message);
    }
  }

  // Generate slug from title
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}