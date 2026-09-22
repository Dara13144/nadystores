const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const logger = require('./logger');
const seed = require('../data/seedData');

let supabaseClient = null;

const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

if (env.SUPABASE_URL && supabaseKey) {
  try {
    supabaseClient = createClient(env.SUPABASE_URL, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    logger.info(`🚀 Supabase client connected successfully to ${env.SUPABASE_URL}`);
  } catch (err) {
    logger.error('Failed to initialize Supabase client:', err);
  }
} else {
  logger.warn('ℹ️ No Supabase credentials in .env - running on persistent local database (store.json).');
}

// Local store file path
const storeFilePath = path.join(__dirname, '../data/store.json');

// Memory store initialized with seed
let memoryStore = {
  users: [...seed.initialUsers],
  categories: [...seed.initialCategories],
  products: [...seed.initialProducts],
  digital_stock: [...seed.initialStock],
  coupons: [...seed.initialCoupons],
  orders: [],
  order_items: [],
  wallets: [...seed.initialWallets],
  wallet_transactions: [...seed.initialWalletTransactions],
  payment_events: [],
  reviews: [...seed.initialReviews],
  notifications: [
    {
      id: 'n1',
      user_id: 'u0000000-0000-0000-0000-000000000002',
      title: 'Welcome to Digital Store!',
      message: 'Your account has been created. Enjoy instant delivery on all digital subscriptions.',
      type: 'info',
      is_read: false,
      created_at: new Date().toISOString()
    }
  ],
  support_tickets: [],
  audit_logs: []
};

// Load saved store from disk if exists
try {
  if (fs.existsSync(storeFilePath)) {
    const data = fs.readFileSync(storeFilePath, 'utf8');
    const parsed = JSON.parse(data);
    memoryStore = { ...memoryStore, ...parsed };
    logger.info('Persistent local database loaded from store.json');
  } else {
    fs.writeFileSync(storeFilePath, JSON.stringify(memoryStore, null, 2));
    logger.info('Initialized store.json with default seed data.');
  }
} catch (err) {
  logger.error('Error handling store.json:', err);
}

function persistStore() {
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(memoryStore, null, 2));
  } catch (err) {
    logger.error('Error persisting store.json:', err);
  }
}

// Two-way Supabase Synchronizer
async function syncFromSupabase() {
  if (!supabaseClient) return;

  const tables = ['categories', 'products', 'digital_stock', 'users', 'coupons', 'orders', 'order_items', 'wallets', 'wallet_transactions', 'reviews'];

  try {
    for (const table of tables) {
      const { data, error } = await supabaseClient.from(table).select('*');
      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          memoryStore[table] = data;
          logger.info(`Synced ${data.length} records from Supabase [${table}]`);
        } else if (memoryStore[table]?.length > 0) {
          // Supabase table is empty, auto-push local data to Supabase
          logger.info(`Auto-seeding Supabase [${table}] with ${memoryStore[table].length} local records...`);
          await supabaseClient.from(table).upsert(memoryStore[table], { onConflict: 'id' });
        }
      }
    }
    persistStore();
  } catch (err) {
    logger.warn('Supabase background synchronization notice:', err.message);
  }
}

// Boot sync
if (supabaseClient && process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    syncFromSupabase().catch(e => logger.warn('Initial Supabase sync deferred:', e.message));
  }, 1000);
}

async function safeSupabaseOp(opFn) {
  if (!supabaseClient) return;
  try {
    await opFn(supabaseClient);
  } catch (err) {
    // Non-blocking sync error
  }
}

const db = {
  isSupabaseConfigured: () => !!supabaseClient,
  getSupabase: () => supabaseClient,
  syncFromSupabase,
  
  // High-performance direct access helpers
  get: (table) => memoryStore[table] || [],
  
  find: (table, predicate) => {
    const list = memoryStore[table] || [];
    return list.find(predicate);
  },

  filter: (table, predicate) => {
    const list = memoryStore[table] || [];
    return list.filter(predicate);
  },

  insert: (table, item) => {
    if (!memoryStore[table]) memoryStore[table] = [];
    memoryStore[table].push(item);
    persistStore();

    // Async sync to Supabase if configured
    if (supabaseClient) {
      safeSupabaseOp(client => client.from(table).upsert(item, { onConflict: 'id' }));
    }

    return item;
  },

  update: (table, predicate, updates) => {
    const list = memoryStore[table] || [];
    const index = list.findIndex(predicate);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updated_at: new Date().toISOString() };
      persistStore();

      // Async sync to Supabase if configured
      if (supabaseClient && list[index].id) {
        safeSupabaseOp(client => client.from(table).update(updates).eq('id', list[index].id));
      }

      return list[index];
    }
    return null;
  },

  remove: (table, predicate) => {
    const list = memoryStore[table] || [];
    const index = list.findIndex(predicate);
    if (index !== -1) {
      const deleted = list.splice(index, 1)[0];
      persistStore();

      // Async sync to Supabase if configured
      if (supabaseClient && deleted?.id) {
        safeSupabaseOp(client => client.from(table).delete().eq('id', deleted.id));
      }

      return deleted;
    }
    return null;
  }
};

module.exports = db;
