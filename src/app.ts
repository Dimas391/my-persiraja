import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Import konfigurasi
import { testConnection } from './config/database';
// Import migrasi
import { runMigrations } from './config/migrate'; // Impor fungsi migrasi

// Import route
import authRoutes from './routes/authRoutes';
import matchRoutes from './routes/matchRoutes';
import ticketRoutes from './routes/ticketRoutes';
import playerRoutes from './routes/playerRoutes';
import newsRoutes from './routes/newsRoutes';

// Import middleware
import { ResponseUtil } from './utils/response';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/matchess', matchRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/news', newsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  ResponseUtil.success(res, 'Server is running successfully', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  ResponseUtil.success(res, 'Welcome to Persiraja Banda Aceh API', {
    message: 'API is running successfully',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      matches: '/api/matches',
      tickets: '/api/tickets',
      players: '/api/players',
      news: '/api/news',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  ResponseUtil.notFound(res, 'Endpoint not found', `The endpoint ${req.method} ${req.originalUrl} does not exist`);
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return ResponseUtil.validationError(res, 'Validation failed', error.details);
  }

  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ResponseUtil.badRequest(res, 'File size too large');
    }
    return ResponseUtil.badRequest(res, 'File upload error', error.message);
  }

  if (error.name === 'SyntaxError' && error.status === 400 && 'body' in error) {
    return ResponseUtil.badRequest(res, 'Invalid JSON payload');
  }

  // Database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return ResponseUtil.badRequest(res, 'Duplicate entry detected');
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return ResponseUtil.badRequest(res, 'Referenced record does not exist');
  }

  // Default error response
  const statusCode = error.statusCode || error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message || 'Internal server error';

  ResponseUtil.error(res, message, statusCode, 
    process.env.NODE_ENV === 'development' ? error.stack : undefined
  );
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Jalankan migrasi untuk membuat tabel
    await runMigrations(); // Menjalankan migrasi

    // Mulai server setelah migrasi berhasil
    app.listen(PORT, () => {
      console.log(`
🚀 Persiraja Banda Aceh API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server running on port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📡 Base URL: http://localhost:${PORT}
📖 API Documentation: http://localhost:${PORT}/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // Menghentikan aplikasi jika migrasi gagal
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;