const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../model/order.Model');
const User = require('../model/user.Model');
const orderController = require('../controller/order.Controller');
const { ObjectId } = require('mongodb');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: "thienvvps34113@fpt.edu.vn",
        pass: "vshf adee rckg kvcz",
    },
});

// Ensure invoice directory exists
const invoicesDir = path.join(__dirname, '../invoices');
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
ensureDirectoryExists(invoicesDir);

// Helper function to validate order details
const validateOrderDetails = (orderDetails) => {
    const { userId, totalAmount, details, shippingAddress } = orderDetails;
  
    if (!userId) {
        throw new Error('Missing required order field: userId');
    }

      if (!ObjectId.isValid(userId)) {
        throw new Error('Invalid userId format');
    }
    
    if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
        throw new Error('Invalid totalAmount: must be a positive number');
    }
  
    if (!Array.isArray(details) || details.length === 0) {
        throw new Error('Invalid details: must be a non-empty array');
    }
  
    details.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
            throw new Error(`Invalid details[${index}].name: must be a string`);
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw new Error(`Invalid details[${index}].quantity: must be a positive number`);
        }
        if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
            throw new Error(`Invalid details[${index}].price: must be a positive number`);
        }
    });
  
    if (!shippingAddress || typeof shippingAddress !== 'object' || shippingAddress == null) {
        throw new Error('Invalid shippingAddress: must be an object');
    }
  
    if (!shippingAddress.street || typeof shippingAddress.street !== 'string') {
        throw new Error('Invalid shippingAddress.street: must be a string');
    }
  
    if (shippingAddress.ward && typeof shippingAddress.ward !== 'string') {
        throw new Error('Invalid shippingAddress.ward: must be a string');
    }
    
    if (shippingAddress.district && typeof shippingAddress.district !== 'string') {
        throw new Error('Invalid shippingAddress.district: must be a string');
    }
  
    if (!shippingAddress.city || typeof shippingAddress.city !== 'string') {
        throw new Error('Invalid shippingAddress.city: must be a string');
    }
  
    return orderDetails;
};
// Create a new order and generate invoice
router.post('/', async (req, res) => {
    try {
        let orderDetails;
         try {
              orderDetails = validateOrderDetails(req.body);
        } catch(error) {
              return res.status(400).json({ error: error.message });
        }
     
        const order = new Order(orderDetails);
        await order.save();

        const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');

        if (!fs.existsSync(fontPath)) {
            return res.status(500).json({ error: 'Font file not found' });
        }

        const doc = new PDFDocument({ margin: 50 });
        const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);

         doc.pipe(writeStream);

        try {
             doc.font(fontPath);
           doc.fontSize(25).text('HÓA ĐƠN BÁN HÀNG', { align: 'center', underline: true });
            doc.moveDown(2);
            doc.fontSize(12).text(`Mã Đơn Hàng: ${order._id}`);
            doc.text(`Ngày Tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
            doc.text(`Tổng Số Tiền: ${orderDetails.totalAmount.toLocaleString('vi-VN')} đ`);
            doc.text(`Phương Thức Thanh Toán: ${orderDetails.paymentMethod || 'Không xác định'}`);
            doc.moveDown();
            doc.fontSize(12).text('Địa Chỉ Giao Hàng:', { underline: true });
            doc.text(`${orderDetails.shippingAddress.street}, ${orderDetails.shippingAddress.ward || ''}`);
            doc.text(`${orderDetails.shippingAddress.district || ''}, ${orderDetails.shippingAddress.city}`);
            doc.moveDown(2);
            doc.fontSize(12).text('Chi Tiết Đơn Hàng:', { underline: true });
            orderDetails.details.forEach((item, index) => {
                doc.moveDown(0.5);
                doc.text(`${index + 1}. Tên Sản Phẩm: ${item.name}`);
                doc.text(`   - Số Lượng: ${item.quantity}`);
                doc.text(`   - Giá: ${item.price.toLocaleString('vi-VN')} đ`);
            });
           doc.end();
       } catch(pdfError) {
            console.error('Error create pdf:', pdfError);
               return  res.status(500).json({ error: 'Failed to create invoice PDF' });
       }

         writeStream.on('finish', async () => {
            try {
                   const user = await User.findById(orderDetails.userId);
                   if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                   }

                const mailOptions = {
                    from: "thienvvps34113@fpt.edu.vn",
                    to: user.email,
                    subject: 'Xác Nhận Đơn Hàng',
                    text: `Cảm ơn bạn đã đặt hàng! Mã đơn hàng của bạn là ${order._id}.`,
                    attachments: [
                        {
                            filename: `invoice-${order._id}.pdf`,
                            path: invoicePath,
                        },
                    ],
                };
                  try {
                      await transporter.sendMail(mailOptions);
                      res.status(201).json({ message: 'Đơn hàng đã được tạo, email đã được gửi!', order });
                  } catch (emailError) {
                      console.error('Error sending email:', emailError);
                      return  res.status(500).json({ error: 'Failed to send email' });
                  }
            } catch (findUserError) {
                  console.error('Error find user:', findUserError);
                 return res.status(500).json({ error: 'Failed to find user' });
            }
        });
         writeStream.on('error', (err) => {
                console.error('Error writing PDF:', err);
              return  res.status(500).json({ error: 'Failed to generate invoice PDF' });
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all orders
router.get('/', orderController.getAllOrders);
router.get('/lichsu/:id', orderController.getOrderHistory);

// Get a single order by ID
router.get('/:id', orderController.getOrderById);

// Update an order
router.put('/:id', orderController.updateOrder);
router.put('/status/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;  // Nhận trạng thái mới từ body của request

    try {
        // Kiểm tra nếu trạng thái hợp lệ
        const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled']; // Danh sách trạng thái hợp lệ
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Tìm và cập nhật trạng thái của đơn hàng
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },  // Cập nhật trạng thái mới
            { new: true } // Trả về đối tượng đã được cập nhật
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order status updated successfully', updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error });
    }
});
// Delete an order
router.delete('/:id', orderController.deleteOrder);

// Get orders by user ID
router.get('/delivered', async (req, res) => {
    try {
        const deliveredOrders = await Order.find({ status: 'delivered' });
        res.json(deliveredOrders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching delivered orders', error });
    }
});

// Get total orders
router.get('/total-orders', async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();  // Đếm tổng số đơn hàng trong cơ sở dữ liệu
        res.json({ totalOrders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi tính tổng đơn hàng." });
    }
});

// Get total income from delivered orders
router.get('/incomes/total', async (req, res) => {
    try {
        const totalIncome = await Order.aggregate([
            { $match: { status: 'delivered' } }, // Lọc các đơn hàng đã giao
            { $group: { _id: null, total: { $sum: "$totalAmount" } } } // Tính tổng doanh thu
        ]);

        res.json({ total: totalIncome[0]?.total || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching total income', error });
    }
});

// Get orders by status
router.get('/status/:status', async (req, res) => {
    const { status } = req.params;
    try {
        const orders = await Order.find({ status });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders by status', error });
    }
});

// Get orders by date
router.get('/date/:date', async (req, res) => {
    const { date } = req.params;
    try {
        const orders = await Order.find({
            createdAt: {
                $gte: new Date(date),
                $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
            }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders by date', error });
    }
});

// Get total count of orders
router.get('/count', async (req, res) => {
    try {
        const count = await Order.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users count', error });
    }
});
module.exports = router;