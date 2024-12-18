const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userController = require('../controller/user.Controller');
const User = require('../model/user.Model');

// Đăng ký người dùng
router.post('/register', async (req, res) => {
    const { username, password, email, phone, address, role, avatar } = req.body;
    try {
        const newUser = await userController.registerUser({ username, password, email, phone, address, role, avatar });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Đăng nhập người dùng
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { token, user } = await userController.loginUser(email, password);
        res.status(200).json({
            user,
            token,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Lấy số lượng người dùng
router.get('/count', async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users count', error });
    }
});
const multer = require('multer');
const upload = multer({ dest: 'public/img/' });

// Lấy tất cả người dùng
router.get('/', userController.getAllUsers);

// Lấy thông tin người dùng theo ID
router.get('/:id', userController.getUserById);

// Cập nhật thông tin người dùng
router.put('/:id', userController.updateUser);

// Xóa người dùng
router.delete('/:id', userController.deleteUser);

// Kiểm tra token qua Bearer
router.get('/checktoken', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No token provided or incorrect format" });
    }

    const token = authHeader.split(' ')[1];

    try {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Token không hợp lệ" });
            }
            res.status(200).json({ message: "Token hợp lệ", user: decoded });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// Lấy thông tin người dùng từ token
router.get('/detailuser', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(' ')[1];
    try {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Token không hợp lệ" });
            }

            const userInfo = await userController.getUserByEmail(decoded.email);
            if (userInfo) {
                res.status(200).json(userInfo);
            } else {
                res.status(404).json({ message: "Không tìm thấy người dùng" });
            }
        });
    } catch (err) {
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
});
router.post('/', async (req, res) => {
    try {
        const { username, email, password, phone, address, role } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đủ thông tin cần thiết!' });
        }

        // Tạo người dùng mới
        const newUser = new User({
            username,
            email,
            password, // Bạn nên mã hóa mật khẩu bằng bcrypt trước khi lưu
            phone,
            address,
            role,
        });

        await newUser.save();

        res.status(201).json({ message: 'Người dùng đã được thêm thành công!', user: newUser });
    } catch (error) {
        // Xử lý lỗi
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email đã được sử dụng!' });
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi khi thêm người dùng!', error });
    }
});
router.post('/forgot-password', userController.forgotPassword);

// Reset Password Route
router.post('/reset-password/:token', userController.resetPassword);

module.exports = router;
