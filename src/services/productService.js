const db = require('../config/database');

function getLiveStockCount(productId) {
  const items = db.filter('digital_stock', s => s.product_id === productId && s.status === 'available');
  return items.length;
}

function getAllProducts({
  category,
  productType,
  deliveryType,
  duration,
  minPrice,
  maxPrice,
  search,
  featured,
  popular,
  sort = 'popular',
  limit = 50,
  page = 1
} = {}) {
  let products = db.get('products').filter(p => p.status === 'active');

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.short_description && p.short_description.toLowerCase().includes(q))
    );
  }

  // Category filter (slug or id)
  if (category && category !== 'all') {
    const cat = db.find('categories', c => c.slug === category || c.id === category);
    if (cat) {
      products = products.filter(p => p.category_id === cat.id);
    }
  }

  // Product Type filter
  if (productType && productType !== 'all') {
    products = products.filter(p => p.product_type.toLowerCase() === productType.toLowerCase());
  }

  // Delivery Type filter
  if (deliveryType && deliveryType !== 'all') {
    products = products.filter(p => p.delivery_type.toLowerCase() === deliveryType.toLowerCase());
  }

  // Price range
  if (minPrice !== undefined && minPrice !== '') {
    products = products.filter(p => Number(p.price) >= Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    products = products.filter(p => Number(p.price) <= Number(maxPrice));
  }

  // Flags
  if (featured === true || featured === 'true') {
    products = products.filter(p => p.featured === true);
  }
  if (popular === true || popular === 'true') {
    products = products.filter(p => p.popular === true);
  }

  // Map products with accurate live stock count and category info
  products = products.map(p => {
    const cat = db.find('categories', c => c.id === p.category_id);
    const stock = getLiveStockCount(p.id);
    return {
      ...p,
      category_name: cat ? cat.name : 'General',
      category_slug: cat ? cat.slug : 'general',
      stock_count: stock
    };
  });

  // Sorting
  if (sort === 'price-asc') {
    products.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === 'price-desc') {
    products.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === 'newest') {
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sort === 'popular') {
    products.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  }

  const total = products.length;
  const startIndex = (page - 1) * limit;
  const paginated = products.slice(startIndex, startIndex + Number(limit));

  return {
    products: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
}

function getProductBySlug(slug) {
  const product = db.find('products', p => p.slug === slug && p.status === 'active');
  if (!product) return null;

  const cat = db.find('categories', c => c.id === product.category_id);
  const reviews = db.filter('reviews', r => r.product_id === product.id);
  const stock = getLiveStockCount(product.id);

  // Related products
  const related = db.filter('products', p => p.category_id === product.category_id && p.id !== product.id && p.status === 'active')
    .slice(0, 4)
    .map(p => ({
      ...p,
      stock_count: getLiveStockCount(p.id)
    }));

  return {
    ...product,
    category_name: cat ? cat.name : 'General',
    category_slug: cat ? cat.slug : 'general',
    stock_count: stock,
    reviews,
    related
  };
}

module.exports = {
  getAllProducts,
  getProductBySlug,
  getLiveStockCount
};
