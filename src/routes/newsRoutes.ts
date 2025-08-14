import { Router } from 'express';
import { body } from 'express-validator';
import { NewsController } from '../controllers/newsController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, handleValidation } from '../middleware/validation';
import { upload } from '../middleware/upload';

const router = Router();

// Validation rules
const newsValidation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Title must be between 5 and 500 characters'),
  
  body('slug')
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ min: 5, max: 500 })
    .withMessage('Slug must be between 5 and 500 characters'),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 100 })
    .withMessage('Content must be at least 100 characters long'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid category ID'),
  
  body('status')
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published')
];

const updateNewsValidation = [
  body('title')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('Title must be between 5 and 500 characters'),
  
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .isLength({ min: 5, max: 500 })
    .withMessage('Slug must be between 5 and 500 characters'),
  
  body('content')
    .optional()
    .isLength({ min: 100 })
    .withMessage('Content must be at least 100 characters long'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid category ID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published')
];

// Public routes
router.get('/', NewsController.getAllNews);
router.get('/latest', NewsController.getLatestNews);
router.get('/:slug', NewsController.getNewsBySlug);

// Admin routes
router.get('/admin/all', authenticate, authorize(['admin']), NewsController.getAllNewsAdmin);
router.post('/', authenticate, authorize(['admin']), upload.single('featured_image'), validate(newsValidation), handleValidation, NewsController.createNews);
router.put('/:id', authenticate, authorize(['admin']), upload.single('featured_image'), validate(updateNewsValidation), handleValidation, NewsController.updateNews);
router.delete('/:id', authenticate, authorize(['admin']), NewsController.deleteNews);

export default router;