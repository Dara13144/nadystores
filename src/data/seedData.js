const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(10);
const adminPasswordHash = bcrypt.hashSync('Admin@123456', salt);
const userPasswordHash = bcrypt.hashSync('User@123456', salt);

const initialUsers = [
  {
    id: 'u0000000-0000-0000-0000-000000000099',
    email: 'mdara9695@gmail.com',
    password_hash: adminPasswordHash,
    username: 'mdara9695',
    full_name: 'MDara Admin',
    phone: '+855969500000',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'admin',
    status: 'active',
    email_verified: true,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: 'u0000000-0000-0000-0000-000000000002',
    email: 'user@digitalstore.com',
    password_hash: userPasswordHash,
    username: 'demouser',
    full_name: 'Alex Vance',
    phone: '+85598112233',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: 'user',
    status: 'active',
    email_verified: true,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  }
];

const initialCategories = [
  {
    id: 'c1',
    name: 'Movie / TV / Show',
    slug: 'movie-tv-show',
    description: 'Ultra HD 4K streaming accounts for Netflix, Prime Video, HBO Max with instant automatic delivery.',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600',
    icon: 'Tv',
    status: 'active',
    sort_order: 1
  },
  {
    id: 'c2',
    name: 'Designing / Video Editing',
    slug: 'designing-video-editing',
    description: 'CapCut Pro, Canva Pro, Alight Motion, and Wink VIP editing subscriptions.',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600',
    icon: 'Sparkles',
    status: 'active',
    sort_order: 2
  },
  {
    id: 'c3',
    name: 'Ai / ChatBot',
    slug: 'ai-chatbot',
    description: 'Gemini AI Pro, ChatGPT Plus, and advanced intelligence tokens.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600',
    icon: 'Bot',
    status: 'active',
    sort_order: 3
  },
  {
    id: 'c4',
    name: 'VPN / Security',
    slug: 'vpn-security',
    description: 'High-speed VPN Nord, ExpressVPN, and private proxies for encrypted safe browsing.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600',
    icon: 'ShieldCheck',
    status: 'active',
    sort_order: 4
  },
  {
    id: 'c5',
    name: 'Music & Audio',
    slug: 'music',
    description: 'Spotify Premium, YouTube Music ad-free high bitrate audio accounts.',
    image: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600',
    icon: 'Music',
    status: 'active',
    sort_order: 5
  },
  {
    id: 'c6',
    name: 'Subscription & Gaming',
    slug: 'subscription',
    description: 'Discord Nitro, Telegram Premium, Steam and Game Pass subscriptions.',
    image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600',
    icon: 'Gamepad2',
    status: 'active',
    sort_order: 6
  }
];

const initialProducts = [
  {
    id: 'p1',
    name: 'CapCut Pro (Private Account)',
    slug: 'capcut-pro',
    description: 'CapCut Pro Private Account សម្រាប់ Edit វីដេអូកម្រិតខ្ពស់។ Maximum login for 1 private account is 1 device. ទទួលបានគណនី Email + Password ភ្លាមៗបន្ទាប់ពីទូទាត់។',
    short_description: 'CapCut Pro Private Account - Maximum 1 device, instant delivery.',
    category_id: 'c2',
    price: 0.50,
    compare_price: 1.00,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop',
    stock_count: 15,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.9,
    reviews_count: 39,
    features: ['Auto Captions VIP', 'Smooth Slow-Motion', 'All Pro Transitions', 'Instant Auto Delivery']
  },
  {
    id: 'p2',
    name: 'YouTube Premium (Ad-Free + Background Play)',
    slug: 'youtube-premium',
    description: 'គណនី YouTube Premium ថ្មី (New Account)។ អ្នកនឹងទទួលបាន Email + Password សម្រាប់ចូលប្រើប្រាស់។ គ្មានការរំខានដោយពាណិជ្ជកម្ម និង Background Play នៅពេលបិទអេក្រង់។',
    short_description: 'គណនី YouTube Premium ថ្មី (New Account) គ្មាន Ads និង Background Play.',
    category_id: 'c1',
    price: 1.50,
    compare_price: 4.99,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop',
    stock_count: 20,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.8,
    reviews_count: 48,
    features: ['Ad-free videos', 'Play in background', 'YouTube Music Premium included', 'Instant Delivery']
  },
  {
    id: 'p3',
    name: 'Netflix Premium 4K UHD (Private Profile)',
    slug: 'netflix-premium',
    description: 'បន្ទាប់ពីការទូទាត់ខ្ញុំនឹងផ្តល់ឱ្យ អ៊ីមែល និងពាក្យសម្ងាត់ ដូច្នេះអ្នកអាចចូលបាន។ ធានាពេញមួយខែជាមួយ Private PIN Profile ផ្ទាល់ខ្លួន 4K Ultra HD.',
    short_description: 'Private 4K profile with personal PIN. Instant credentials & full warranty.',
    category_id: 'c1',
    price: 2.50,
    compare_price: 9.99,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop',
    stock_count: 12,
    status: 'active',
    featured: true,
    popular: true,
    rating: 5.0,
    reviews_count: 52,
    features: ['Ultra HD 4K & Spatial Audio', 'Private dedicated profile & PIN', 'Works on TV, Mobile, PC', 'Full Month Warranty']
  },
  {
    id: 'p4',
    name: 'Canva Pro (EDU / Pro Lifetime)',
    slug: 'canva-pro',
    description: 'រីករាយជាមួយលក្ខណៈពិសេស Canva Pro & EDU។ Brand Kits, Background Remover, Magic Eraser, និង Premium templates រាប់លាន។',
    short_description: 'Full Canva Pro design perks, brand kit, background remover.',
    category_id: 'c2',
    price: 0.50,
    compare_price: 2.00,
    currency: 'USD',
    product_type: 'Subscription',
    delivery_type: 'Automatic',
    duration: '1 Year',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop',
    stock_count: 30,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.7,
    reviews_count: 26,
    features: ['100M+ Premium Stock Photos', 'Instant Background Remover', 'Magic Switch AI Tools', 'Instant Activation']
  },
  {
    id: 'p5',
    name: 'Alight Motion Premium VIP',
    slug: 'alight-motion-premium',
    description: 'Alight Motion Premium គ្មាន Watermark, គាំទ្រ XML Presets និង Motion Graphics លំដាប់ខ្ពស់។',
    short_description: 'No watermark, export 4K 60FPS, XML presets supported.',
    category_id: 'c2',
    price: 2.99,
    compare_price: 5.99,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Year',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop',
    stock_count: 8,
    status: 'active',
    featured: false,
    popular: true,
    rating: 4.8,
    reviews_count: 14,
    features: ['No watermark on export', 'Full XML preset import', 'Vector graphics support', 'Instant Delivery']
  },
  {
    id: 'p6',
    name: 'Gemini AI Pro & Advanced',
    slug: 'gemini-ai-pro',
    description: 'Google Gemini 1.5 Pro with 1M+ context window, deep reasoning, code generation, and direct workspace integration.',
    short_description: 'Gemini 1.5 Pro 1M context, multimodal code & text intelligence.',
    category_id: 'c3',
    price: 7.99,
    compare_price: 15.00,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
    stock_count: 10,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.9,
    reviews_count: 22,
    features: ['1 Million token context', 'Fast response generation', 'Python code execution', 'Full account login']
  },
  {
    id: 'p7',
    name: 'Wink VIP Video Retouching',
    slug: 'wink-vip',
    description: 'Wink VIP video quality enhancer, 4K face retouching, AI noise removal, and frame rate enhancement.',
    short_description: 'AI 4K quality enhancer & video retouching VIP access.',
    category_id: 'c2',
    price: 0.49,
    compare_price: 1.00,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1534972195531-a756b1146f35?w=600&auto=format&fit=crop',
    stock_count: 14,
    status: 'active',
    featured: false,
    popular: true,
    rating: 4.8,
    reviews_count: 19,
    features: ['4K Video Quality Enhancer', 'AI Face Retouching VIP', 'Auto Cut Background', 'Instant Delivery']
  },
  {
    id: 'p8',
    name: 'HBO Max (Max Premium)',
    slug: 'hbo-max',
    description: 'Stream Warner Bros blockbuster movies, House of the Dragon, DC universe, and Discovery shows in 4K.',
    short_description: 'Blockbuster movies & 4K UHD HBO Max private access.',
    category_id: 'c1',
    price: 1.99,
    compare_price: 4.99,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop',
    stock_count: 9,
    status: 'active',
    featured: false,
    popular: true,
    rating: 4.9,
    reviews_count: 18,
    features: ['Full 4K Ultra HD playback', 'House of the Dragon & DC', 'Ad-free streaming', 'Full replacement warranty']
  },
  {
    id: 'p9',
    name: 'Amazon Prime Video Private',
    slug: 'prime-video',
    description: 'Amazon Prime Video private profile. Stream The Boys, Rings of Power, and global cinema in 4K HDR.',
    short_description: 'The Boys, Rings of Power in 4K HDR. Instant credentials.',
    category_id: 'c1',
    price: 0.75,
    compare_price: 1.00,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=600&auto=format&fit=crop',
    stock_count: 16,
    status: 'active',
    featured: false,
    popular: true,
    rating: 4.7,
    reviews_count: 12,
    features: ['4K Ultra HD & HDR', 'Prime exclusive originals', 'X-Ray movie trivia', 'Instant Delivery']
  },
  {
    id: 'p10',
    name: 'VPN Nord (2-Year Ultra Security)',
    slug: 'vpn-nord',
    description: 'VPN Nord AES-256 encryption, 6400+ high-speed servers in 111 countries, Threat Protection, and zero logs.',
    short_description: 'Military AES-256 encryption, 6400+ global servers, zero logs.',
    category_id: 'c4',
    price: 1.50,
    compare_price: 3.50,
    currency: 'USD',
    product_type: 'Account',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop',
    stock_count: 11,
    status: 'active',
    featured: false,
    popular: true,
    rating: 4.9,
    reviews_count: 31,
    features: ['Connect on PC, Android, iOS', 'Zero logs audited', 'Unblock any geo-restriction', 'Instant delivery']
  },
  {
    id: 'p11',
    name: 'Spotify Premium Individual',
    slug: 'spotify-premium',
    description: 'Ad-free 320kbps extreme audio streaming, offline song downloads, and unlimited skips on mobile and desktop.',
    short_description: 'Zero ads, unlimited skips, offline song downloads.',
    category_id: 'c5',
    price: 2.50,
    compare_price: 6.99,
    currency: 'USD',
    product_type: 'Subscription',
    delivery_type: 'Automatic',
    duration: '3 Months',
    image: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop',
    stock_count: 18,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.8,
    reviews_count: 42,
    features: ['Zero advertisements', '320kbps Extreme audio', 'Offline song cache', 'Direct account activation']
  },
  {
    id: 'p12',
    name: 'Discord Nitro 1-Year Full Gift Link',
    slug: 'discord-nitro',
    description: 'Discord Nitro with 2 Server Boosts, 500MB upload limits, custom emojis anywhere, and 4K 60FPS streaming.',
    short_description: '2 Server boosts, 500MB uploads, HD streaming & custom emojis.',
    category_id: 'c6',
    price: 4.99,
    compare_price: 9.99,
    currency: 'USD',
    product_type: 'Gift Card',
    delivery_type: 'Automatic',
    duration: '1 Month',
    image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&auto=format&fit=crop',
    stock_count: 15,
    status: 'active',
    featured: true,
    popular: true,
    rating: 4.9,
    reviews_count: 29,
    features: ['Direct gift link redemption', '2 Server Boosts included', 'Custom emojis globally', 'Instant automatic delivery']
  }
];

const initialStock = [
  // CapCut Pro
  { id: 's1', product_id: 'p1', value: 'capcut.pro01@streamvault.co|CapCutPass#9921', type: 'Account', status: 'available' },
  { id: 's2', product_id: 'p1', value: 'capcut.pro02@streamvault.co|CapCutPass#4412', type: 'Account', status: 'available' },
  // YouTube Premium
  { id: 's3', product_id: 'p2', value: 'yt.premium01@cloudpass.io|StreamVideo$881', type: 'Account', status: 'available' },
  { id: 's4', product_id: 'p2', value: 'yt.premium02@cloudpass.io|StreamVideo$882', type: 'Account', status: 'available' },
  // Netflix Premium
  { id: 's5', product_id: 'p3', value: 'net.vip.alpha@streamvault.co|CinemaPass#9921|Profile: 3 (PIN: 1842)', type: 'Account', status: 'available' },
  { id: 's6', product_id: 'p3', value: 'net.vip.bravo@streamvault.co|CinemaPass#4412|Profile: 2 (PIN: 9021)', type: 'Account', status: 'available' },
  // Canva Pro
  { id: 's7', product_id: 'p4', value: 'https://www.canva.com/brand/join?token=CNV-PRO-INVITE-7781-SHIRYU', type: 'Link', status: 'available' },
  // Alight Motion
  { id: 's8', product_id: 'p5', value: 'alight.vip01@streamvault.co|MotionDesign#99', type: 'Account', status: 'available' },
  // Gemini AI Pro
  { id: 's9', product_id: 'p6', value: 'ai.gemini01@neuralmail.net|GoogleAiPass$2026', type: 'Account', status: 'available' },
  // Wink VIP
  { id: 's10', product_id: 'p7', value: 'wink.vip01@streamvault.co|RetouchVideo#77', type: 'Account', status: 'available' },
  // HBO Max
  { id: 's11', product_id: 'p8', value: 'hbo.max01@streamvault.co|WarnerCinema#321', type: 'Account', status: 'available' },
  // Prime Video
  { id: 's12', product_id: 'p9', value: 'prime.video01@streamvault.co|AmazonPass#551', type: 'Account', status: 'available' },
  // VPN Nord
  { id: 's13', product_id: 'p10', value: 'vpn.nord.pro99@safezone.org|NordUltraSecure#321', type: 'Account', status: 'available' },
  // Spotify
  { id: 's14', product_id: 'p11', value: 'spot.vip.user1@tuneshub.me|AudioKing99!', type: 'Account', status: 'available' },
  // Discord Nitro
  { id: 's15', product_id: 'p12', value: 'https://discord.gift/XQ99-KLM2-PV78-SHIRYU', type: 'Link', status: 'available' }
];

const initialCoupons = [
  {
    id: 'cp1',
    code: 'PREMIUM10',
    type: 'percentage',
    value: 10,
    minimum_amount: 0.50,
    maximum_discount: 15,
    usage_limit: 500,
    used_count: 14,
    expires_at: '2027-12-31T23:59:59Z',
    active: true
  },
  {
    id: 'cp2',
    code: 'NADY20',
    type: 'percentage',
    value: 20,
    minimum_amount: 1.00,
    maximum_discount: 10,
    usage_limit: 200,
    used_count: 8,
    expires_at: '2027-12-31T23:59:59Z',
    active: true
  },
  {
    id: 'cp3',
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minimum_amount: 0.50,
    maximum_discount: 10,
    usage_limit: 1000,
    used_count: 2,
    expires_at: '2027-12-31T23:59:59Z',
    active: true
  }
];

const initialWallets = [
  {
    id: 'w1',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    balance: 500.00,
    currency: 'USD',
    total_deposited: 500.00,
    total_spent: 0.00,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: 'w2',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    balance: 85.50,
    currency: 'USD',
    total_deposited: 100.00,
    total_spent: 14.50,
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  }
];

const initialWalletTransactions = [
  {
    id: 'wt1',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    type: 'deposit',
    amount: 100.00,
    balance_before: 0.00,
    balance_after: 100.00,
    reference: 'DEP-BAKONG-9912',
    status: 'completed',
    description: 'Initial balance deposit via Bakong KHQR',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

const initialReviews = [
  {
    id: 'r1',
    product_id: 'p3',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    user_name: 'Sophea K.',
    rating: 5,
    comment: 'ទិញ Netflix 4K បានភ្លាមៗ ស្កេន Bakong KHQR ចប់ចេញ Credentials លើ Screen ភ្លាម។ សេវាកម្មរហ័ស 100%!',
    verified_purchase: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'r2',
    product_id: 'p1',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    user_name: 'Mengly T.',
    rating: 5,
    comment: 'CapCut Pro $0.50 ប្រើបានពេញ 1 ខែ ស្រួលកាត់ត Video ខ្លាំងណាស់!',
    verified_purchase: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

module.exports = {
  initialUsers,
  initialCategories,
  initialProducts,
  initialStock,
  initialCoupons,
  initialWallets,
  initialWalletTransactions,
  initialReviews
};
