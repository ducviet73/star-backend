const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../model/order.Model');
const User = require('../model/user.Model');
const orderController = require('../controller/order.Controller');
// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: "thienvvps34113@fpt.edu.vn",
        pass: "ffkv ivpg fhdy enaw",  
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

// Create a new order and generate invoice
router.post('/', async (req, res) => {
    try {
        const orderDetails = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!orderDetails.userId || !orderDetails.totalAmount || !orderDetails.details || !orderDetails.shippingAddress) {
            return res.status(400).json({ error: 'Missing required order fields' });
        }

        // Tạo đơn hàng mới
        const order = new Order(orderDetails);
        await order.save();

        // Đảm bảo đường dẫn tới font
        const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf'); 

        // Khởi tạo PDFDocument
        const doc = new PDFDocument({ margin: 50 }); // Thêm margin
        const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);

        doc.pipe(writeStream);

        // Sử dụng font chữ hỗ trợ tiếng Việt
        doc.font(fontPath);

        // Header
        doc.fontSize(25).text('HÓA ĐƠN BÁN HÀNG', { align: 'center', underline: true });
        doc.moveDown(2);

        // Thông tin đơn hàng
        doc.fontSize(12).text(`Mã Đơn Hàng: ${order._id}`);
        doc.text(`Ngày Tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
        doc.text(`Tổng Số Tiền: ${orderDetails.totalAmount.toLocaleString('vi-VN')} đ`);
        doc.text(`Phương Thức Thanh Toán: ${orderDetails.paymentMethod}`);
        doc.moveDown();

        // Địa chỉ giao hàng
        doc.fontSize(12).text('Địa Chỉ Giao Hàng:', { underline: true });
        doc.text(`${orderDetails.shippingAddress.street}, ${orderDetails.shippingAddress.ward}`);
        doc.text(`${orderDetails.shippingAddress.district}, ${orderDetails.shippingAddress.city}`);
        doc.moveDown(2);

        // Chi tiết sản phẩm
        doc.fontSize(12).text('Chi Tiết Đơn Hàng:', { underline: true });
        orderDetails.details.forEach((item, index) => {
            doc.moveDown(0.5);
            doc.text(`${index + 1}. Tên Sản Phẩm: ${item.name}`);
            doc.text(`   - Số Lượng: ${item.quantity}`);
            doc.text(`   - Giá: ${item.price.toLocaleString('vi-VN')} đ`);
        });

        // Kết thúc file PDF
        doc.end();

        writeStream.on('finish', async () => {
            try {
                // Tìm email của người dùng
                const user = await User.findById(orderDetails.userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Cấu hình email
                const mailOptions = {
                    from: "thienvvps34113@fpt.edu.vn",
                    to: user.email,
                    subject: 'Order Confirmation',
                    text: `Thank you for your order! Your order ID is ${order._id}.`,
                    attachments: [
                        {
                            filename: `invoice-${order._id}.pdf`,
                            path: invoicePath,
                        },
                    ],
                };

                // Gửi email
                await transporter.sendMail(mailOptions);

                // Phản hồi sau khi hoàn tất
                res.status(201).json({ message: 'Order placed successfully, email sent!', order });
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                res.status(500).json({ error: 'Failed to send email' });
            }
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF:', err);
            res.status(500).json({ error: 'Failed to generate invoice PDF' });
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
{/* <>const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Order = require('../model/order.Model');
const User = require('../model/user.Model');
const orderController = require('../controller/order.Controller');
const mongoose = require('mongoose');
// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: "thienvvps34113@fpt.edu.vn",
        pass: "vshf adee rckg kvcz",  
    },
});

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true },
    details: [
        {
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
        },
    ],
    shippingAddress: {
        street: { type: String, required: true },
        ward: { type: String },
        district: { type: String },
        city: { type: String, required: true },
    },
    paymentMethod: { type: String, default: 'Cash' },
    status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
// Ensure invoice directory exists
const invoicesDir = path.join(__dirname, '../invoices');
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
ensureDirectoryExists(invoicesDir);

// Create a new order and generate invoice
router.post('/', async (req, res) => {
    try {
        const orderDetails = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!orderDetails.userId || !orderDetails.totalAmount || !orderDetails.details || !orderDetails.shippingAddress) {
            return res.status(400).json({ error: 'Missing required order fields' });
        }

        // Tạo đơn hàng mới
        const order = new Order(orderDetails);
        await order.save();

        // Đảm bảo đường dẫn tới font
        const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf'); 

        // Khởi tạo PDFDocument
        const doc = new PDFDocument({ margin: 50 }); // Thêm margin
        const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);

        doc.pipe(writeStream);

        // Sử dụng font chữ hỗ trợ tiếng Việt
        doc.font(fontPath);

        // Header
        doc.fontSize(25).text('HÓA ĐƠN BÁN HÀNG', { align: 'center', underline: true });
        doc.moveDown(2);

        // Thông tin đơn hàng
        doc.fontSize(12).text(`Mã Đơn Hàng: ${order._id}`);
        doc.text(`Ngày Tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
        doc.text(`Tổng Số Tiền: ${orderDetails.totalAmount.toLocaleString('vi-VN')} đ`);
        doc.text(`Phương Thức Thanh Toán: ${orderDetails.paymentMethod}`);
        doc.moveDown();

        // Địa chỉ giao hàng
        doc.fontSize(12).text('Địa Chỉ Giao Hàng:', { underline: true });
        doc.text(`${orderDetails.shippingAddress.street}, ${orderDetails.shippingAddress.ward}`);
        doc.text(`${orderDetails.shippingAddress.district}, ${orderDetails.shippingAddress.city}`);
        doc.moveDown(2);

        // Chi tiết sản phẩm
        doc.fontSize(12).text('Chi Tiết Đơn Hàng:', { underline: true });
        orderDetails.details.forEach((item, index) => {
            doc.moveDown(0.5);
            doc.text(`${index + 1}. Tên Sản Phẩm: ${item.name}`);
            doc.text(`   - Số Lượng: ${item.quantity}`);
            doc.text(`   - Giá: ${item.price.toLocaleString('vi-VN')} đ`);
        });
        // Tạo đơn hàng mới và tạo hóa đơn
router.post('/', async (req, res) => {
    try {
        const orderDetails = req.body;

        // Kiểm tra dữ liệu đầu vào
        const { userId, totalAmount, details, shippingAddress } = orderDetails;

        if (!userId) {
            return res.status(400).json({ error: 'Thiếu userId' });
        }
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Số tiền không hợp lệ hoặc thiếu' });
        }
        if (!Array.isArray(details) || details.length === 0) {
            return res.status(400).json({ error: 'Chi tiết đơn hàng phải là mảng không rỗng' });
        }
        if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
            return res.status(400).json({ error: 'Địa chỉ giao hàng không hợp lệ hoặc thiếu thông tin' });
        }

        // Tạo đơn hàng mới
        const order = new Order(orderDetails);
        await order.save();

        // Tạo file hóa đơn PDF
        const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
        const doc = new PDFDocument({ margin: 50 });
        const invoicePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
        const writeStream = fs.createWriteStream(invoicePath);

        doc.pipe(writeStream);
        doc.font(fontPath);
        doc.fontSize(25).text('HÓA ĐƠN BÁN HÀNG', { align: 'center', underline: true });
        doc.moveDown(2);
        doc.fontSize(12).text(`Mã Đơn Hàng: ${order._id}`);
        doc.text(`Ngày Tạo: ${new Date(order.createdAt).toLocaleString('vi-VN')}`);
        doc.text(`Tổng Số Tiền: ${totalAmount.toLocaleString('vi-VN')} đ`);
        doc.text(`Phương Thức Thanh Toán: ${orderDetails.paymentMethod || 'Không xác định'}`);
        doc.moveDown();
        doc.fontSize(12).text('Địa Chỉ Giao Hàng:', { underline: true });
        doc.text(`${shippingAddress.street}, ${shippingAddress.ward || ''}`);
        doc.text(`${shippingAddress.district || ''}, ${shippingAddress.city}`);
        doc.moveDown(2);
        doc.fontSize(12).text('Chi Tiết Đơn Hàng:', { underline: true });
        details.forEach((item, index) => {
            doc.moveDown(0.5);
            doc.text(`${index + 1}. Tên Sản Phẩm: ${item.name}`);
            doc.text(`   - Số Lượng: ${item.quantity}`);
            doc.text(`   - Giá: ${item.price.toLocaleString('vi-VN')} đ`);
        });
        doc.end();

        writeStream.on('finish', async () => {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
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

                await transporter.sendMail(mailOptions);
                res.status(201).json({ message: 'Đơn hàng đã được tạo, email đã được gửi!', order });
            } catch (emailError) {
                console.error('Lỗi gửi email:', emailError);
                res.status(500).json({ error: 'Gửi email thất bại' });
            }
        });

        writeStream.on('error', (err) => {
            console.error('Lỗi ghi PDF:', err);
            res.status(500).json({ error: 'Tạo hóa đơn PDF thất bại' });
        });
    } catch (error) {
        console.error('Lỗi tạo đơn hàng:', error);
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
    }
});

        // Kết thúc file PDF
        doc.end();

        writeStream.on('finish', async () => {
            try {
                // Tìm email của người dùng
                const user = await User.findById(orderDetails.userId);
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Cấu hình email
                const mailOptions = {
                    from: "thienvvps34113@fpt.edu.vn",
                    to: user.email,
                    subject: 'Order Confirmation',
                    text: `Thank you for your order! Your order ID is ${order._id}.`,
                    attachments: [
                        {
                            filename: `invoice-${order._id}.pdf`,
                            path: invoicePath,
                        },
                    ],
                };

                // Gửi email
                await transporter.sendMail(mailOptions);

                // Phản hồi sau khi hoàn tất
                res.status(201).json({ message: 'Order placed successfully, email sent!', order });
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                res.status(500).json({ error: 'Failed to send email' });
            }
        });

        writeStream.on('error', (err) => {
            console.error('Error writing PDF:', err);
            res.status(500).json({ error: 'Failed to generate invoice PDF' });
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
</> */}