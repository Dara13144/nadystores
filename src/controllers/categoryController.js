const db = require('../config/database');
const productService = require('../services/productService');

function getCategories(req, res, next) {
  try {
    const categories = db.filter('categories', c => c.status === 'active')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Enrich with count of products
    const enriched = categories.map(cat => {
      const prods = db.filter('products', p => p.category_id === cat.id && p.status === 'active');
      return {
        ...cat,
        product_count: prods.length
      };
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
}

function getCategoryBySlug(req, res, next) {
  try {
    const category = db.find('categories', c => c.slug === req.params.slug && c.status === 'active');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const productsResult = productService.getAllProducts({
      category: category.slug,
      ...req.query
    });

    res.json({
      success: true,
      data: {
        category,
        products: productsResult.products,
        total: productsResult.total
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategories,
  getCategoryBySlug
};
