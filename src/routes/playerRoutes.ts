import { Router } from 'express';
import { body } from 'express-validator';
import { PlayerController } from '../controllers/playerController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, handleValidation } from '../middleware/validation';
import { upload } from '../middleware/upload';

const router = Router();

// Validation rules
const playerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Player name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('jersey_number')
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
  
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isLength({ max: 100 })
    .withMessage('Position too long'),
  
  body('age')
    .optional()
    .isInt({ min: 16, max: 45 })
    .withMessage('Age must be between 16 and 45'),
  
  body('height')
    .optional()
    .isFloat({ min: 1.50, max: 2.20 })
    .withMessage('Height must be between 1.50m and 2.20m'),
  
  body('weight')
    .optional()
    .isFloat({ min: 50, max: 120 })
    .withMessage('Weight must be between 50kg and 120kg'),
  
  body('biography')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Biography too long'),
  
  body('joined_date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('status')
    .optional()
    .isIn(['active', 'injured', 'suspended', 'inactive'])
    .withMessage('Invalid status')
];

const updatePlayerValidation = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('jersey_number')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),
  
  body('position')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Position too long'),
  
  body('age')
    .optional()
    .isInt({ min: 16, max: 45 })
    .withMessage('Age must be between 16 and 45'),
  
  body('height')
    .optional()
    .isFloat({ min: 1.50, max: 2.20 })
    .withMessage('Height must be between 1.50m and 2.20m'),
  
  body('weight')
    .optional()
    .isFloat({ min: 50, max: 120 })
    .withMessage('Weight must be between 50kg and 120kg'),
  
  body('biography')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Biography too long'),
  
  body('joined_date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('status')
    .optional()
    .isIn(['active', 'injured', 'suspended', 'inactive'])
    .withMessage('Invalid status')
];

// Public routes
router.get('/', PlayerController.getAllPlayers);
router.get('/squad', PlayerController.getSquad);
router.get('/position/:position', PlayerController.getPlayersByPosition);
router.get('/:id', PlayerController.getPlayerById);

// Admin routes
router.post('/', authenticate, authorize(['admin']), upload.single('photo'), validate(playerValidation), handleValidation, PlayerController.createPlayer);
router.put('/:id', authenticate, authorize(['admin']), upload.single('photo'), validate(updatePlayerValidation), handleValidation, PlayerController.updatePlayer);
router.delete('/:id', authenticate, authorize(['admin']), PlayerController.deletePlayer);

export default router;