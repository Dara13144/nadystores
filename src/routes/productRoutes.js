const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/', productController.getProducts);
router.get('/:slug', productController.getProductBySlug);
router.post('/:slug/reviews', authMiddleware, productController.addReview);

module.exports = router;
