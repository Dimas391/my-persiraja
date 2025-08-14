import { Router } from 'express';
import { body, param } from 'express-validator';
import { TicketController } from '../controllers/ticketController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, handleValidation } from '../middleware/validation';

const router = Router();

// Validation rules
const purchaseTicketValidation = [
  body('match_id')
    .isInt({ min: 1 })
    .withMessage('Valid match ID is required'),
  
  body('ticket_type')
    .isIn(['vip', 'tribune', 'economy'])
    .withMessage('Invalid ticket type'),
  
  body('quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  
  body('payment_method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['credit_card', 'debit_card', 'bank_transfer', 'gopay', 'ovo', 'dana'])
    .withMessage('Invalid payment method')
];

const updatePaymentStatusValidation = [
  body('payment_status')
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  
  body('payment_reference')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Payment reference too long')
];

const bookingReferenceValidation = [
  param('reference')
    .matches(/^PBA-[A-Z0-9]+-[A-Z0-9]+$/)
    .withMessage('Invalid booking reference format')
];

// Protected user routes
router.post('/purchase', authenticate, validate(purchaseTicketValidation), handleValidation, TicketController.purchaseTicket);
router.get('/my-tickets', authenticate, TicketController.getUserTickets);
router.put('/cancel/:id', authenticate, TicketController.cancelTicket);

// Public route for ticket verification
router.get('/verify/:reference', validate(bookingReferenceValidation), handleValidation, TicketController.getTicketByReference);

// Admin routes
router.get('/all', authenticate, authorize(['admin']), TicketController.getAllTickets);
router.put('/payment-status/:id', authenticate, authorize(['admin']), validate(updatePaymentStatusValidation), handleValidation, TicketController.updatePaymentStatus);
router.post('/validate/:reference', authenticate, authorize(['admin']), validate(bookingReferenceValidation), handleValidation, TicketController.validateTicket);

export default router;