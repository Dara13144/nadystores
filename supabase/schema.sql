-- ============================================================
-- FULL-STACK DIGITAL SUBSCRIPTION STORE DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL
-- ============================================================

-- Enable UUID & Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(150),
    phone VARCHAR(50),
    avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role VARCHAR(30) DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin', 'superadmin')),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    email_verified BOOLEAN DEFAULT false,
    google_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    icon VARCHAR(50) DEFAULT 'Package',
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(300),
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    compare_price NUMERIC(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    product_type VARCHAR(50) DEFAULT 'Subscription',
    delivery_type VARCHAR(50) DEFAULT 'Automatic',
    duration VARCHAR(50) DEFAULT '1 Month',
    image TEXT NOT NULL,
    gallery JSONB DEFAULT '[]'::jsonb,
    stock_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'active',
    featured BOOLEAN DEFAULT false,
    popular BOOLEAN DEFAULT false,
    rating NUMERIC(3, 1) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    is_digital BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    faq JSONB DEFAULT '[]'::jsonb,
    download_file_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. DIGITAL STOCK TABLE (ACCOUNTS, GIFT CARDS, LICENSE KEYS)
CREATE TABLE IF NOT EXISTS digital_stock (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'Account',
    status VARCHAR(30) DEFAULT 'available',
    order_id TEXT,
    sold_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. COUPONS TABLE
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'percentage',
    value NUMERIC(10, 2) NOT NULL,
    minimum_amount NUMERIC(10, 2) DEFAULT 0,
    maximum_discount NUMERIC(10, 2),
    usage_limit INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(50),
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    fee NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(30) DEFAULT 'pending',
    payment_status VARCHAR(30) DEFAULT 'pending',
    delivery_status VARCHAR(30) DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    coupon_code VARCHAR(50),
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_type VARCHAR(50),
    delivered_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(10) DEFAULT 'USD',
    total_deposited NUMERIC(10, 2) DEFAULT 0,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    balance_before NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(10, 2) NOT NULL,
    reference VARCHAR(100),
    status VARCHAR(30) DEFAULT 'completed',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. PAYMENT EVENTS TABLE
CREATE TABLE IF NOT EXISTS payment_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider VARCHAR(50) NOT NULL,
    provider_tx_id VARCHAR(120) NOT NULL,
    order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'processed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_provider_tx UNIQUE (provider, provider_tx_id)
);

-- 11. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    order_number VARCHAR(50),
    status VARCHAR(30) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    replies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    admin_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INDEXES FOR MAXIMUM PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_digital_stock_prod ON digital_stock(product_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_num ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public categories are readable" ON categories FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public products are readable" ON products FOR SELECT USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access categories" ON categories FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access products" ON products FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access users" ON users FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access stock" ON digital_stock FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access orders" ON orders FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access order_items" ON order_items FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access wallets" ON wallets FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access wallet_transactions" ON wallet_transactions FOR ALL TO service_role USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED DATA INSERTS (INITIAL SYSTEM SETUP)
-- ============================================================

-- SEED USERS
INSERT INTO users (id, email, password_hash, username, full_name, role, status, email_verified, created_at, updated_at)
VALUES ('u0000000-0000-0000-0000-000000000099', 'mdara9695@gmail.com', '$2a$10$Z/iDckXe4uVqppFqutmxFO6kkUpjwXyd1XhIxB.e65GddUft2rVEK', 'mdara9695', 'MDara Admin', 'admin', 'active', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin';
INSERT INTO users (id, email, password_hash, username, full_name, role, status, email_verified, created_at, updated_at)
VALUES ('u0000000-0000-0000-0000-000000000001', 'admin@digitalstore.com', '$2a$10$LCbKVCVrhsRL7uMTtXA27uRomtntZwpT6qU4CFgxMjkmEifH68wwK', 'superadmin', 'Shiryu Admin', 'admin', 'active', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
INSERT INTO users (id, email, password_hash, username, full_name, role, status, email_verified, created_at, updated_at)
VALUES ('u0000000-0000-0000-0000-000000000002', 'user@digitalstore.com', '$2a$10$LCbKVCVrhsRL7uMTtXA27uFF.4ekMmsFQAJMyfq6lPrJ2uy4wkmwO', 'demouser', 'Alex Vance', 'user', 'active', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
INSERT INTO users (id, email, password_hash, username, full_name, role, status, email_verified, created_at, updated_at)
VALUES ('6c3ce1a0-08f5-4569-b7e4-e97e186e1b54', 'wallet.test.1790012169704@example.com', '', 'wallettest1790012169704_9520', 'Test Wallet User', 'user', 'active', TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- SEED CATEGORIES
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c1', 'Movie / TV / Show', 'movie-tv-show', 'Ultra HD 4K streaming accounts for Netflix, Prime Video, HBO Max with instant automatic delivery.', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600', 'Tv', 'active', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c2', 'Designing / Video Editing', 'designing-video-editing', 'CapCut Pro, Canva Pro, Alight Motion, and Wink VIP editing subscriptions.', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600', 'Sparkles', 'active', 2, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c3', 'Ai / ChatBot', 'ai-chatbot', 'Gemini AI Pro, ChatGPT Plus, and advanced intelligence tokens.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600', 'Bot', 'active', 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c4', 'VPN / Security', 'vpn-security', 'High-speed VPN Nord, ExpressVPN, and private proxies for encrypted safe browsing.', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600', 'ShieldCheck', 'active', 4, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c5', 'Music & Audio', 'music', 'Spotify Premium, YouTube Music ad-free high bitrate audio accounts.', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600', 'Music', 'active', 5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO categories (id, name, slug, description, image, icon, status, sort_order, created_at, updated_at)
VALUES ('c6', 'Subscription & Gaming', 'subscription', 'Discord Nitro, Telegram Premium, Steam and Game Pass subscriptions.', 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600', 'Gamepad2', 'active', 6, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- SEED PRODUCTS
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p6', 'Gemini AI Pro 18 Free Gift Cards', 'gemini-ai-pro', 'Google Gemini 1.5 Pro & Advanced VIP Bundle ជាមួយ 18 Free Gift Cards Included! សមត្ថភាពវិភាគកូដ, 1M+ Context Window, Multimodal Vision និងការឆ្លើយតបឆ្លាតវៃបំផុត។ ទទួលបានកូដកាដូ Gift Cards ចំនួន 18 សន្លឹកភ្លាមៗបន្ទាប់ពី Checkout ដោយស្វ័យប្រវត្តិ។', 'Gemini AI Pro 18 Free Gift Cards Bundle. 1M+ context window, deep reasoning & instant code delivery.', 'c3', 7.99, 24.99, 'USD', 'Gift Card', 'Automatic', '18 Free Gift Cards (1 Year VIP Access)', '/uploads/gemini-ai-pro-18-giftcards.png', '["/uploads/gemini-ai-pro-18-giftcards.png","https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800","https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800"]'::jsonb, 18, 'active', TRUE, TRUE, 5, 58, TRUE, '["18 Free Gift Cards / Redeem Activation Keys","Google Gemini 1.5 Pro & Advanced Intelligence","1 Million Token Context Window & Multimodal Vision","Python Workspace Execution & Deep Reasoning","Instant Automatic Delivery to Screen & Email"]'::jsonb, '[{"q":"How do I redeem my 18 Free Gift Cards?","a":"Each gift card key is delivered automatically to your screen and order history right after checkout. Simply click Reveal Credentials and apply the gift voucher code on the Google Gemini redeem portal."},{"q":"Are the gift cards stackable or shareable with friends?","a":"Yes! All 18 gift cards can be redeemed consecutively on your own account or shared individually with family and team members."},{"q":"Is delivery instant?","a":"Yes, our automated stock system dispatches your codes in less than 2 seconds!"}]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p1', 'CapCut Pro (Private Account)', 'capcut-pro', 'CapCut Pro Private Account សម្រាប់ Edit វីដេអូកម្រិតខ្ពស់។ Maximum login for 1 private account is 1 device. ទទួលបានគណនី Email + Password ភ្លាមៗបន្ទាប់ពីទូទាត់។', 'CapCut Pro Private Account - Maximum 1 device, instant delivery.', 'c2', 0.5, 1, 'USD', 'Account', 'Automatic', '1 Month', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 4.9, 39, TRUE, '["Auto Captions VIP","Smooth Slow-Motion","All Pro Transitions","Instant Auto Delivery"]'::jsonb, '[{"q":"How many devices can login?","a":"Maximum 1 device per account."}]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p2', 'YouTube Premium (Ad-Free + Background Play)', 'youtube-premium', 'គណនី YouTube Premium ថ្មី (New Account)។ អ្នកនឹងទទួលបាន Email + Password សម្រាប់ចូលប្រើប្រាស់។ គ្មានការរំខានដោយពាណិជ្ជកម្ម និង Background Play នៅពេលបិទអេក្រង់។', 'គណនី YouTube Premium ថ្មី (New Account) គ្មាន Ads និង Background Play.', 'c1', 1.5, 4.99, 'USD', 'Account', 'Automatic', '1 Month', 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 4.8, 48, TRUE, '["Ad-free videos","Play in background","YouTube Music Premium included","Instant Delivery"]'::jsonb, '[{"q":"Does it include YouTube Music?","a":"Yes, full YouTube Music Premium is included."}]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p3', 'Netflix Premium 4K UHD (Private Profile)', 'netflix-premium', 'បន្ទាប់ពីការទូទាត់ខ្ញុំនឹងផ្តល់ឱ្យ អ៊ីមែល និងពាក្យសម្ងាត់ ដូច្នេះអ្នកអាចចូលបាន។ ធានាពេញមួយខែជាមួយ Private PIN Profile ផ្ទាល់ខ្លួន 4K Ultra HD.', 'Private 4K profile with personal PIN. Instant credentials & full warranty.', 'c1', 2.5, 9.99, 'USD', 'Account', 'Automatic', '1 Month', 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 5, 52, TRUE, '["Ultra HD 4K & Spatial Audio","Private dedicated profile & PIN","Works on TV, Mobile, PC","Full Month Warranty"]'::jsonb, '[{"q":"Can I change my profile PIN?","a":"Yes, you can set your own 4-digit PIN."}]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p4', 'Canva Pro (EDU / Pro Lifetime)', 'canva-pro', 'រីករាយជាមួយលក្ខណៈពិសេស Canva Pro & EDU។ Brand Kits, Background Remover, Magic Eraser, និង Premium templates រាប់លាន។', 'Full Canva Pro design perks, brand kit, background remover.', 'c2', 0.5, 2, 'USD', 'Subscription', 'Automatic', '1 Year', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 4.7, 26, TRUE, '["100M+ Premium Stock Photos","Instant Background Remover","Magic Switch AI Tools","Instant Activation"]'::jsonb, '[{"q":"Can I use my existing Canva account?","a":"Yes, an invite link is provided to join the Pro team."}]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p5', 'Alight Motion Premium VIP', 'alight-motion-premium', 'Alight Motion Premium គ្មាន Watermark, គាំទ្រ XML Presets និង Motion Graphics លំដាប់ខ្ពស់។', 'No watermark, export 4K 60FPS, XML presets supported.', 'c2', 2.99, 5.99, 'USD', 'Account', 'Automatic', '1 Year', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', FALSE, TRUE, 4.8, 14, TRUE, '["No watermark on export","Full XML preset import","Vector graphics support","Instant Delivery"]'::jsonb, '[]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p10', 'VPN Nord (2-Year Ultra Security)', 'vpn-nord', 'VPN Nord AES-256 encryption, 6400+ high-speed servers in 111 countries, Threat Protection, and zero logs.', 'Military AES-256 encryption, 6400+ global servers, zero logs.', 'c4', 1.5, 3.5, 'USD', 'Account', 'Automatic', '1 Month', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', FALSE, TRUE, 4.9, 31, TRUE, '["Connect on PC, Android, iOS","Zero logs audited","Unblock any geo-restriction","Instant delivery"]'::jsonb, '[]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p11', 'Spotify Premium Individual', 'spotify-premium', 'Ad-free 320kbps extreme audio streaming, offline song downloads, and unlimited skips on mobile and desktop.', 'Zero ads, unlimited skips, offline song downloads.', 'c5', 2.5, 6.99, 'USD', 'Subscription', 'Automatic', '3 Months', 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 4.8, 42, TRUE, '["Zero advertisements","320kbps Extreme audio","Offline song cache","Direct account activation"]'::jsonb, '[]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;
INSERT INTO products (id, name, slug, description, short_description, category_id, price, compare_price, currency, product_type, delivery_type, duration, image, gallery, stock_count, status, featured, popular, rating, reviews_count, is_digital, features, faq, created_at, updated_at)
VALUES ('p12', 'Discord Nitro 1-Year Full Gift Link', 'discord-nitro', 'Discord Nitro with 2 Server Boosts, 500MB upload limits, custom emojis anywhere, and 4K 60FPS streaming.', '2 Server boosts, 500MB uploads, HD streaming & custom emojis.', 'c6', 4.99, 9.99, 'USD', 'Gift Card', 'Automatic', '1 Month', 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&auto=format&fit=crop', '["https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&auto=format&fit=crop"]'::jsonb, 10, 'active', TRUE, TRUE, 4.9, 29, TRUE, '["Direct gift link redemption","2 Server Boosts included","Custom emojis globally","Instant automatic delivery"]'::jsonb, '[]'::jsonb, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, image = EXCLUDED.image, stock_count = EXCLUDED.stock_count;

-- SEED DIGITAL STOCK
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_1', 'p6', 'GEMINI-PRO-18GIFT-1000-1X9W | PIN: 1100', 'Gift Card', 'sold', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_2', 'p6', 'GEMINI-PRO-18GIFT-1473-I0T7 | PIN: 1107', 'Gift Card', 'sold', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_3', 'p6', 'GEMINI-PRO-18GIFT-1946-029J | PIN: 1114', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_4', 'p6', 'GEMINI-PRO-18GIFT-2419-YZ00 | PIN: 1121', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_5', 'p6', 'GEMINI-PRO-18GIFT-2892-8IMA | PIN: 1128', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_6', 'p6', 'GEMINI-PRO-18GIFT-3365-FVW8 | PIN: 1135', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_7', 'p6', 'GEMINI-PRO-18GIFT-3838-WO94 | PIN: 1142', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_8', 'p6', 'GEMINI-PRO-18GIFT-4311-DN2V | PIN: 1149', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_9', 'p6', 'GEMINI-PRO-18GIFT-4784-98XN | PIN: 1156', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_10', 'p6', 'GEMINI-PRO-18GIFT-5257-KAAV | PIN: 1163', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_11', 'p6', 'GEMINI-PRO-18GIFT-5730-GVV3 | PIN: 1170', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_12', 'p6', 'GEMINI-PRO-18GIFT-6203-8OB8 | PIN: 1177', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_13', 'p6', 'GEMINI-PRO-18GIFT-6676-MSU5 | PIN: 1184', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_14', 'p6', 'GEMINI-PRO-18GIFT-7149-I1VI | PIN: 1191', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_15', 'p6', 'GEMINI-PRO-18GIFT-7622-DSG1 | PIN: 1198', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_16', 'p6', 'GEMINI-PRO-18GIFT-8095-BHWN | PIN: 1205', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_17', 'p6', 'GEMINI-PRO-18GIFT-8568-D9CQ | PIN: 1212', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_gemini_18', 'p6', 'GEMINI-PRO-18GIFT-9041-CTB1 | PIN: 1219', 'Gift Card', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_1', 'p1', 'capcut.user1@streamvault.co|CapCutPass#3000', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_2', 'p1', 'capcut.user2@streamvault.co|CapCutPass#3019', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_3', 'p1', 'capcut.user3@streamvault.co|CapCutPass#3038', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_4', 'p1', 'capcut.user4@streamvault.co|CapCutPass#3057', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_5', 'p1', 'capcut.user5@streamvault.co|CapCutPass#3076', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_6', 'p1', 'capcut.user6@streamvault.co|CapCutPass#3095', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_7', 'p1', 'capcut.user7@streamvault.co|CapCutPass#3114', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_8', 'p1', 'capcut.user8@streamvault.co|CapCutPass#3133', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_9', 'p1', 'capcut.user9@streamvault.co|CapCutPass#3152', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_capcut_10', 'p1', 'capcut.user10@streamvault.co|CapCutPass#3171', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_1', 'p2', 'yt.premium1@cloudpass.io|StreamVideo$800', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_2', 'p2', 'yt.premium2@cloudpass.io|StreamVideo$811', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_3', 'p2', 'yt.premium3@cloudpass.io|StreamVideo$822', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_4', 'p2', 'yt.premium4@cloudpass.io|StreamVideo$833', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_5', 'p2', 'yt.premium5@cloudpass.io|StreamVideo$844', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_6', 'p2', 'yt.premium6@cloudpass.io|StreamVideo$855', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_7', 'p2', 'yt.premium7@cloudpass.io|StreamVideo$866', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_8', 'p2', 'yt.premium8@cloudpass.io|StreamVideo$877', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_9', 'p2', 'yt.premium9@cloudpass.io|StreamVideo$888', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_yt_10', 'p2', 'yt.premium10@cloudpass.io|StreamVideo$899', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_1', 'p3', 'net.vip1@streamvault.co|CinemaPass#4000|Profile: 1 (PIN: 1000)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_2', 'p3', 'net.vip2@streamvault.co|CinemaPass#4023|Profile: 2 (PIN: 1073)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_3', 'p3', 'net.vip3@streamvault.co|CinemaPass#4046|Profile: 3 (PIN: 1146)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_4', 'p3', 'net.vip4@streamvault.co|CinemaPass#4069|Profile: 4 (PIN: 1219)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_5', 'p3', 'net.vip5@streamvault.co|CinemaPass#4092|Profile: 1 (PIN: 1292)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_6', 'p3', 'net.vip6@streamvault.co|CinemaPass#4115|Profile: 2 (PIN: 1365)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_7', 'p3', 'net.vip7@streamvault.co|CinemaPass#4138|Profile: 3 (PIN: 1438)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_8', 'p3', 'net.vip8@streamvault.co|CinemaPass#4161|Profile: 4 (PIN: 1511)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_9', 'p3', 'net.vip9@streamvault.co|CinemaPass#4184|Profile: 1 (PIN: 1584)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_net_10', 'p3', 'net.vip10@streamvault.co|CinemaPass#4207|Profile: 2 (PIN: 1657)', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_1', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8000-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_2', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8037-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_3', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8074-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_4', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8111-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_5', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8148-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_6', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8185-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_7', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8222-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_8', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8259-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_9', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8296-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_canva_10', 'p4', 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-8333-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_1', 'p5', 'alight.vip1@streamvault.co|MotionDesign#90', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_2', 'p5', 'alight.vip2@streamvault.co|MotionDesign#91', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_3', 'p5', 'alight.vip3@streamvault.co|MotionDesign#92', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_4', 'p5', 'alight.vip4@streamvault.co|MotionDesign#93', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_5', 'p5', 'alight.vip5@streamvault.co|MotionDesign#94', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_6', 'p5', 'alight.vip6@streamvault.co|MotionDesign#95', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_7', 'p5', 'alight.vip7@streamvault.co|MotionDesign#96', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_8', 'p5', 'alight.vip8@streamvault.co|MotionDesign#97', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_9', 'p5', 'alight.vip9@streamvault.co|MotionDesign#98', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_alight_10', 'p5', 'alight.vip10@streamvault.co|MotionDesign#99', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_1', 'p10', 'vpn.nord.pro1@safezone.org|NordUltraSecure#500', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_2', 'p10', 'vpn.nord.pro2@safezone.org|NordUltraSecure#513', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_3', 'p10', 'vpn.nord.pro3@safezone.org|NordUltraSecure#526', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_4', 'p10', 'vpn.nord.pro4@safezone.org|NordUltraSecure#539', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_5', 'p10', 'vpn.nord.pro5@safezone.org|NordUltraSecure#552', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_6', 'p10', 'vpn.nord.pro6@safezone.org|NordUltraSecure#565', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_7', 'p10', 'vpn.nord.pro7@safezone.org|NordUltraSecure#578', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_8', 'p10', 'vpn.nord.pro8@safezone.org|NordUltraSecure#591', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_9', 'p10', 'vpn.nord.pro9@safezone.org|NordUltraSecure#604', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_vpn_10', 'p10', 'vpn.nord.pro10@safezone.org|NordUltraSecure#617', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_1', 'p11', 'spot.vip1@tuneshub.me|AudioKing#700', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_2', 'p11', 'spot.vip2@tuneshub.me|AudioKing#717', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_3', 'p11', 'spot.vip3@tuneshub.me|AudioKing#734', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_4', 'p11', 'spot.vip4@tuneshub.me|AudioKing#751', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_5', 'p11', 'spot.vip5@tuneshub.me|AudioKing#768', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_6', 'p11', 'spot.vip6@tuneshub.me|AudioKing#785', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_7', 'p11', 'spot.vip7@tuneshub.me|AudioKing#802', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_8', 'p11', 'spot.vip8@tuneshub.me|AudioKing#819', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_9', 'p11', 'spot.vip9@tuneshub.me|AudioKing#836', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_spot_10', 'p11', 'spot.vip10@tuneshub.me|AudioKing#853', 'Account', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_1', 'p12', 'https://discord.gift/NITRO-18GIFT-1000-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_2', 'p12', 'https://discord.gift/NITRO-18GIFT-1049-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_3', 'p12', 'https://discord.gift/NITRO-18GIFT-1098-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_4', 'p12', 'https://discord.gift/NITRO-18GIFT-1147-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_5', 'p12', 'https://discord.gift/NITRO-18GIFT-1196-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_6', 'p12', 'https://discord.gift/NITRO-18GIFT-1245-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_7', 'p12', 'https://discord.gift/NITRO-18GIFT-1294-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_8', 'p12', 'https://discord.gift/NITRO-18GIFT-1343-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_9', 'p12', 'https://discord.gift/NITRO-18GIFT-1392-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
INSERT INTO digital_stock (id, product_id, value, type, status, created_at)
VALUES ('s_disc_10', 'p12', 'https://discord.gift/NITRO-18GIFT-1441-SHIRYU', 'Link', 'available', NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- SEED WALLETS
INSERT INTO wallets (id, user_id, balance, currency, total_deposited, total_spent, created_at, updated_at)
VALUES ('w99', 'u0000000-0000-0000-0000-000000000099', 500, 'USD', 500, 0, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
INSERT INTO wallets (id, user_id, balance, currency, total_deposited, total_spent, created_at, updated_at)
VALUES ('w1', 'u0000000-0000-0000-0000-000000000001', 500, 'USD', 505, 5, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
INSERT INTO wallets (id, user_id, balance, currency, total_deposited, total_spent, created_at, updated_at)
VALUES ('w2', 'u0000000-0000-0000-0000-000000000002', 90.5, 'USD', 105, 14.5, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
INSERT INTO wallets (id, user_id, balance, currency, total_deposited, total_spent, created_at, updated_at)
VALUES ('0eda1e0f-b69c-4f64-a1c5-8ff123afe763', '6c3ce1a0-08f5-4569-b7e4-e97e186e1b54', 15, 'USD', 22.99, 7.99, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;

-- SEED COUPONS
INSERT INTO coupons (id, code, type, value, minimum_amount, usage_limit, used_count, active, created_at)
VALUES ('cp1', 'PREMIUM10', 'percentage', 10, 0.5, 500, 14, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO coupons (id, code, type, value, minimum_amount, usage_limit, used_count, active, created_at)
VALUES ('cp2', 'NADY20', 'percentage', 20, 1, 200, 8, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO coupons (id, code, type, value, minimum_amount, usage_limit, used_count, active, created_at)
VALUES ('cp3', 'WELCOME10', 'percentage', 10, 0.5, 1000, 2, TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- SEED REVIEWS
INSERT INTO reviews (id, product_id, user_name, rating, comment, verified_purchase, created_at)
VALUES ('r1', 'p3', 'Sophea K.', 5, 'ទិញ Netflix 4K បានភ្លាមៗ ស្កេន Bakong KHQR ចប់ចេញ Credentials លើ Screen ភ្លាម។ សេវាកម្មរហ័ស 100%!', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO reviews (id, product_id, user_name, rating, comment, verified_purchase, created_at)
VALUES ('r2', 'p1', 'Mengly T.', 5, 'CapCut Pro $0.50 ប្រើបានពេញ 1 ខែ ស្រួលកាត់ត Video ខ្លាំងណាស់!', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO reviews (id, product_id, user_name, rating, comment, verified_purchase, created_at)
VALUES ('r3', 'p6', 'Rithy V.', 5, 'Gemini AI Pro 18 Free Gift Cards ប្រើបានពិតៗ ទទួលបានកូដភ្លាមៗបន្ទាប់ពីបង់ប្រាក់! លឿនណាស់!', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO reviews (id, product_id, user_name, rating, comment, verified_purchase, created_at)
VALUES ('r4', 'p2', 'Channa P.', 5, 'YouTube Premium គ្មាន Ads ស្រួលស្ដាប់ភ្លេង Background Play ណាស់!', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO reviews (id, product_id, user_name, rating, comment, verified_purchase, created_at)
VALUES ('r5', 'p4', 'Davit S.', 5, 'Canva Pro ប្រើ Background Remover បានស្រួល អត់បាច់ពិបាកកាត់រូប!', TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. PRODUCTION SECURITY & AUDIT SYSTEM TABLES
-- ============================================================

-- 12.1 SECURITY EVENTS TABLE (Audit Log & Incident Tracking)
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT,
    ip_address VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(20),
    user_agent TEXT,
    status_code INTEGER DEFAULT 200,
    request_count INTEGER DEFAULT 1,
    action VARCHAR(100) DEFAULT 'LOG',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);

-- 12.2 BLOCKED IPS TABLE (Temporary & Persistent Abuse Banlist)
CREATE TABLE IF NOT EXISTS blocked_ips (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ip_address VARCHAR(100) UNIQUE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    violations_count INTEGER DEFAULT 1,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    unblocked BOOLEAN DEFAULT false,
    unblocked_by TEXT,
    unblocked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON blocked_ips(expires_at);

-- 12.3 ACCOUNT LOCKOUTS TABLE (Brute Force Defense)
CREATE TABLE IF NOT EXISTS account_lockouts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);

-- 12.4 ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Anonymous / Service role public read on active products & categories
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active products" ON products FOR SELECT USING (status = 'active');
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (status = 'active');

-- Users can view and manage their own orders & wallet
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT USING (auth.uid()::text = user_id);

-- Admin full access on security events
CREATE POLICY "Admins full access on security_events" ON security_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()::text AND users.role IN ('admin', 'superadmin'))
    );

