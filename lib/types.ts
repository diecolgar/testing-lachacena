export type UserRole = 'user' | 'admin'
export type ListingStatus = 'active' | 'sold' | 'paused' | 'removed'
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'disputed' | 'refunded'
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'closed'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  role: UserRole
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  slug: string
  icon: string | null
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  category_id: number | null
  condition: ListingCondition | null
  status: ListingStatus
  images: string[]
  location: string | null
  views: number
  created_at: string
  updated_at: string
  // Joined fields
  seller?: Profile
  category?: Category
}

export interface Order {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  listing?: Listing
  buyer?: Profile
  seller?: Profile
}

export interface Conversation {
  id: string
  listing_id: string | null
  participant1_id: string
  participant2_id: string
  last_message_at: string
  created_at: string
  // Joined fields
  listing?: Listing
  participant1?: Profile
  participant2?: Profile
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  // Joined fields
  sender?: Profile
}

export interface Dispute {
  id: string
  order_id: string
  reporter_id: string
  reason: string
  description: string | null
  status: DisputeStatus
  admin_id: string | null
  resolution: string | null
  created_at: string
  updated_at: string
  // Joined fields
  order?: Order
  reporter?: Profile
  admin?: Profile
}

export interface Review {
  id: string
  order_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  // Joined fields
  reviewer?: Profile
  reviewee?: Profile
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      categories: { Row: Category; Insert: Omit<Category, 'id'>; Update: Partial<Category> }
      listings: { Row: Listing; Insert: Omit<Listing, 'id' | 'views' | 'created_at' | 'updated_at'>; Update: Partial<Listing> }
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Order> }
      conversations: { Row: Conversation; Insert: Omit<Conversation, 'id' | 'created_at' | 'last_message_at'>; Update: Partial<Conversation> }
      messages: { Row: Message; Insert: Omit<Message, 'id' | 'created_at'>; Update: Partial<Message> }
      disputes: { Row: Dispute; Insert: Omit<Dispute, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Dispute> }
      reviews: { Row: Review; Insert: Omit<Review, 'id' | 'created_at'>; Update: Partial<Review> }
    }
  }
}
