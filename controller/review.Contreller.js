const Review = require('../model/review.Model');

// Lấy danh sách review cho một sản phẩm
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ id_product: productId })
    .populate('id_user' , 'username') // Lấy toàn bộ đối tượng người dùng
    .exec();

    console.log(reviews); 
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
};



// Tạo review mới
exports.createReview = async (req, res) => {
  try {
    const { id_user, id_product, content } = req.body;
    const review = new Review({ id_user, id_product, content });
    await review.save();
    res.status(201).json({ message: 'Tạo review thành công.', review });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi tạo review.', error });
  }
};

// Xóa review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const deletedReview = await Review.findByIdAndDelete(reviewId);
    if (!deletedReview) {
      return res.status(404).json({ message: 'Review không tồn tại.' });
    }
    res.status(200).json({ message: 'Xóa review thành công.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa review.', error });
  }
};
