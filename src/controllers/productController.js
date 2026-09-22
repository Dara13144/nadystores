const productService = require('../services/productService');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

function getProducts(req, res, next) {
  try {
    const result = productService.getAllProducts(req.query);
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function getProductBySlug(req, res, next) {
  try {
    const product = productService.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
}

function addReview(req, res, next) {
  try {
    const { rating, comment } = req.body;
    const { slug } = req.params;
    const product = db.find('products', p => p.slug === slug);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const review = {
      id: uuidv4(),
      product_id: product.id,
      user_id: req.user.id,
      user_name: req.user.fullName || req.user.username,
      rating: Number(rating),
      comment,
      verified_purchase: true,
      created_at: new Date().toISOString()
    };

    db.insert('reviews', review);
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductBySlug,
  addReview
};
