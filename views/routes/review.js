const express = require('express');
const router = express.Router();
const reviewController = require('../controller/review.Contreller');

// Lấy tất cả reviews của một sản phẩm
router.get('/:productId', reviewController.getReviewsByProduct);

// Tạo review mới
router.post('/', reviewController.createReview);

// Xóa một review
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;
