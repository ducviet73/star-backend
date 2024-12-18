const express = require('express');
const router = express.Router();
const path = require('path');
const productController = require('../controller/product.Controller');
const multer = require('multer');
const Product = require('../model/order.Model');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/img'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Hàm kiểm tra file upload
const checkFileUpload = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Bạn chỉ được upload file ảnh'));
  }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: checkFileUpload 
});


// Middleware để phục vụ file upload
router.use('/images', express.static(path.join(__dirname, '../public/img')));

// Log dữ liệu request và body
router.use((req, res, next) => {
    console.log(`Request Method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files);
    next();
});

// Định nghĩa các routes và liên kết với các phương thức của controller
router.get('/products', productController.getAllProducts);
router.get('/products/detail/:productId', productController.getProductById);
router.get('/products/search/:keyword', productController.searchProducts);
router.get('/products/category/:categoryId', productController.getProductsByCategory);
router.get('/products/hot', productController.getHotProducts);
router.get('/products/bestselling', productController.getBestSellingProducts);
router.get('/products/sale', productController.getSaleProducts);
router.get('/products/page', async (req, res) => {
    try {
        const { page, limit } = req.query;
        const result = await productController.getAllAdmin(page, limit);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching paginated products:', error);
        res.status(500).json({ message: error.message });
    }
});


router.post('/products', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
    try {
        console.log('Files received for upload:', req.files);
        console.log('Body received for product:', req.body);
        await productController.addProduct(req, res);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Cập nhật sản phẩm
router.put('/products/:id', upload.fields([
    { name: 'image', maxCount: 1 }, // Hình chính
    { name: 'images', maxCount: 10 } // Hình phụ
]), async (req, res) => {
    try {
        console.log('Files received for update:', req.files);
        console.log('Body received for product update:', req.body);
        await productController.updateProduct(req, res);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Xóa sản phẩm
router.delete('/products/:id', async (req, res) => {
    try {
        await productController.deleteProduct(req, res);
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/products/count', async (req, res) => {
  try {
      const count = await Product.countDocuments();
      res.json({ count });
  } catch (error) {
      res.status(500).json({ message: 'Error fetching products count', error });
  }
});

module.exports = router;
