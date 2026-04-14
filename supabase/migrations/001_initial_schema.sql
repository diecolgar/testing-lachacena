-- ============================================================
-- MARKETPLACE SCHEMA
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  location    TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT
);

INSERT INTO public.categories (name, slug, icon) VALUES
  ('Electronics',     'electronics',    '💻'),
  ('Clothing',        'clothing',       '👕'),
  ('Home & Garden',   'home-garden',    '🏠'),
  ('Sports',          'sports',         '⚽'),
  ('Books',           'books',          '📚'),
  ('Vehicles',        'vehicles',       '🚗'),
  ('Toys & Games',    'toys-games',     '🎮'),
  ('Other',           'other',          '📦');

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE public.listings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category_id INTEGER REFERENCES public.categories(id),
  condition   TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'paused', 'removed')),
  images      TEXT[] DEFAULT '{}',
  location    TEXT,
  views       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE public.orders (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  UUID REFERENCES public.listings(id) ON DELETE RESTRICT NOT NULL,
  buyer_id    UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  seller_id   UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'disputed', 'refunded')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================
CREATE TABLE public.conversations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id      UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  participant1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_participants CHECK (participant1_id <> participant2_id)
);

-- Prevent duplicate conversations for the same listing + pair
CREATE UNIQUE INDEX conversations_unique_idx
  ON public.conversations (listing_id, LEAST(participant1_id, participant2_id), GREATEST(participant1_id, participant2_id))
  WHERE listing_id IS NOT NULL;

CREATE TABLE public.messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE public.disputes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
  reporter_id  UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed')),
  admin_id     UUID REFERENCES public.profiles(id),
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id    UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at    BEFORE UPDATE ON public.profiles    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_listings_updated_at    BEFORE UPDATE ON public.listings    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at      BEFORE UPDATE ON public.orders      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_disputes_updated_at    BEFORE UPDATE ON public.disputes    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- Mark listing as sold when order is delivered
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    UPDATE public.listings SET status = 'sold' WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews      ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------- profiles ----------
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE USING (public.is_admin());

-- ---------- categories ----------
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT USING (true);

-- ---------- listings ----------
CREATE POLICY "Active listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated users can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_admin());

CREATE POLICY "Sellers can delete own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id OR public.is_admin());

-- ---------- orders ----------
CREATE POLICY "Buyers and sellers can view their orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers, sellers and admins can update orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());

-- ---------- conversations ----------
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id OR public.is_admin());

CREATE POLICY "Authenticated users can start conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- ---------- messages ----------
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Receivers can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );

-- ---------- disputes ----------
CREATE POLICY "Reporter, order parties and admin can view disputes"
  ON public.disputes FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Order parties can open disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Admin can update disputes"
  ON public.disputes FOR UPDATE
  USING (public.is_admin());

-- ---------- reviews ----------
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Order parties can leave reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.status = 'delivered'
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_listings_seller_id   ON public.listings (seller_id);
CREATE INDEX idx_listings_category_id ON public.listings (category_id);
CREATE INDEX idx_listings_status      ON public.listings (status);
CREATE INDEX idx_listings_created_at  ON public.listings (created_at DESC);
CREATE INDEX idx_orders_buyer_id      ON public.orders (buyer_id);
CREATE INDEX idx_orders_seller_id     ON public.orders (seller_id);
CREATE INDEX idx_orders_status        ON public.orders (status);
CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);
CREATE INDEX idx_messages_unread      ON public.messages (conversation_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_disputes_status      ON public.disputes (status);
CREATE INDEX idx_reviews_reviewee_id  ON public.reviews (reviewee_id);
