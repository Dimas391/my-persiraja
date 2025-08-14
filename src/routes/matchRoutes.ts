import { Router } from 'express';
import { body } from 'express-validator';
import { MatchController } from '../controllers/matchController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, handleValidation } from '../middleware/validation';

const router = Router();

// Validation rules
const matchValidation = [
  body('home_team')
    .notEmpty()
    .withMessage('Home team is required')
    .isLength({ max: 255 })
    .withMessage('Home team name too long'),
  
  body('away_team')
    .notEmpty()
    .withMessage('Away team is required')
    .isLength({ max: 255 })
    .withMessage('Away team name too long'),
  
  body('match_date')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      const matchDate = new Date(value);
      const now = new Date();
      if (matchDate <= now) {
        throw new Error('Match date must be in the future');
      }
      return true;
    }),
  
  body('venue')
    .notEmpty()
    .withMessage('Venue is required')
    .isLength({ max: 255 })
    .withMessage('Venue name too long'),
  
  body('competition')
    .notEmpty()
    .withMessage('Competition is required')
    .isLength({ max: 255 })
    .withMessage('Competition name too long'),
  
  body('ticket_price_vip')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('VIP ticket price must be a positive number'),
  
  body('ticket_price_tribune')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tribune ticket price must be a positive number'),
  
  body('ticket_price_economy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Economy ticket price must be a positive number'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description too long')
];

const updateMatchValidation = [
  body('home_team')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Home team name too long'),
  
  body('away_team')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Away team name too long'),
  
  body('match_date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('venue')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Venue name too long'),
  
  body('competition')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Competition name too long'),
  
  body('home_score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Home score must be a non-negative integer'),
  
  body('away_score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Away score must be a non-negative integer'),
  
  body('status')
    .optional()
    .isIn(['scheduled', 'live', 'finished', 'postponed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('ticket_price_vip')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('VIP ticket price must be a positive number'),
  
  body('ticket_price_tribune')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tribune ticket price must be a positive number'),
  
  body('ticket_price_economy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Economy ticket price must be a positive number')
];

// Public routes
router.get('/', MatchController.getAllMatches);
router.get('/upcoming', MatchController.getUpcomingMatches);
router.get('/recent-results', MatchController.getRecentResults);
router.get('/:id', MatchController.getMatchById);

// Admin routes
router.post('/', authenticate, authorize(['admin']), validate(matchValidation), handleValidation, MatchController.createMatch);
router.put('/:id', authenticate, authorize(['admin']), validate(updateMatchValidation), handleValidation, MatchController.updateMatch);
router.delete('/:id', authenticate, authorize(['admin']), MatchController.deleteMatch);

export default router;