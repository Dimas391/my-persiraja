export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin' | 'user';
  is_verified: boolean;
  verification_token?: string;
  reset_password_token?: string;
  reset_password_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: Date;
  venue: string;
  competition: string;
  home_score?: number;
  away_score?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  ticket_price_vip?: number;
  ticket_price_tribune?: number;
  ticket_price_economy?: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Ticket {
  id: number;
  match_id: number;
  user_id: number;
  ticket_type: 'vip' | 'tribune' | 'economy';
  quantity: number;
  price: number;
  total_price: number;
  booking_reference: string;
  qr_code?: string;
  status: 'pending' | 'paid' | 'cancelled' | 'used';
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Player {
  id: number;
  name: string;
  jersey_number: number;
  position: string;
  age?: number;
  height?: number;
  weight?: number;
  photo?: string;
  biography?: string;
  joined_date?: Date;
  status: 'active' | 'injured' | 'suspended' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface News {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  category_id?: number;
  author_id: number;
  status: 'draft' | 'published';
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: 'jersey' | 'accessories' | 'souvenirs';
  sizes?: string[];
  images?: string[];
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  user_id: number;
  order_number: string;
  total_amount: number;
  shipping_address: string;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  size?: string;
  created_at: Date;
}

export interface Gallery {
  id: number;
  title: string;
  description?: string;
  image_url: string;
  type: 'image' | 'video';
  category?: string;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  id: number;
  email: string;
  role: 'admin' | 'user';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}