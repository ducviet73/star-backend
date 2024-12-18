require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const User = require('../model/user.Model');  // Mẫu người dùng của bạn
const userController = require('../controller/user.Controller');
const multer = require('multer');
const upload = multer({ dest: 'public/img/' });
const router = express.Router(); 

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined!');
    process.exit(1); 
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationUrl = `http://localhost:3000/users/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: '<your-email@gmail.com>',
        to: email,
        subject: 'Vui lòng mở email của bạn',
        text: `Vui lòng nhấn vào link bên dưới:\n\n${verificationUrl}`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error('Không thể gửi email xác thực. Vui lòng kiểm tra lại địa chỉ email của bạn.');
    }
};

router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'Không có mã xác thực.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }
        if (user.isVerified) {
            return res.status(400).json({ message: 'Tài khoản của bạn đã được xác thực trước đó.' });
        }
        user.isVerified = true;
        await user.save();
        res.status(200).json({ message: 'Email của bạn đã được xác thực thành công!' });
    } catch (error) {
        console.error("Error during email verification:", error);
        res.status(400).json({ message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.', error: error.message });
    }
});
const adminEmail = 'dangphuong27102003@gmail.com'; // Thay bằng email của bạn

const sendContactEmail = async (name, email, message) => {
    const userMailOptions = {
        from: '<your-email@gmail.com>',
        to: email, 
        subject: 'Chúng tôi đã nhận được yêu cầu của bạn!',
        text: `Cảm ơn bạn ${name} đã liên hệ với chúng tôi. Dưới đây là thông tin yêu cầu của bạn:\n\nTên: ${name}\nEmail: ${email}\nTin nhắn: ${message}\n\nChúng tôi sẽ phản hồi sớm nhất!`,
    };
    const adminMailOptions = {
        from: '<your-email@gmail.com>',
        to: adminEmail,
        subject: 'Yêu cầu mới từ trang liên hệ',
        text: `Bạn vừa nhận được một yêu cầu từ trang liên hệ:\n\nTên: ${name}\nEmail: ${email}\nTin nhắn: ${message}\n\nHãy phản hồi sớm nhất có thể.`,
    };

    try {
        await transporter.sendMail(userMailOptions);
        console.log('Email xác nhận đã được gửi đến người dùng.');

        await transporter.sendMail(adminMailOptions);
        console.log('Email thông báo đã được gửi đến admin.');
    } catch (error) {
        console.error("Lỗi gửi email:", error);
        throw new Error('Không thể gửi email. Vui lòng thử lại.');
    }
};

// Route xử lý yêu cầu liên hệ
router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Tất cả các trường đều là bắt buộc.' });
    }
    try {
        await sendContactEmail(name, email, message);
        res.status(200).json({ message: 'Yêu cầu của bạn đã được gửi đi. Chúng tôi sẽ phản hồi sớm!' });
    } catch (error) {
        console.error("Lỗi gửi yêu cầu:", error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi gửi yêu cầu.' });
    }
});
// Route đăng ký người dùng
router.post('/register', async (req, res) => {
    const { username, password, confirmPassword, email, phone, address } = req.body;
    let missingFields = [];
    if (!username) missingFields.push('username');
    if (!password) missingFields.push('password');
    if (!confirmPassword) missingFields.push('confirmPassword');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');
    if (!address) missingFields.push('address');

    if (missingFields.length > 0) {
        return res.status(400).json({ message: `Vui lòng cung cấp đầy đủ thông tin: ${missingFields.join(', ')}` });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Mật khẩu và xác nhận mật khẩu không khớp!' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'Email đã được sử dụng!' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            phone,
            address,
            isVerified: false  
        });

        const verificationToken = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        try {
            await sendVerificationEmail(email, verificationToken);
            await newUser.save();res.status(200).json({ message: 'Vui lòng kiểm tra email của bạn để xác thực tài khoản.' });
        } catch (emailError) {
            console.error("Error sending verification email:", emailError);
            res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng kiểm tra lại địa chỉ email của bạn.', error: emailError.message });
        }
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng ký hoặc gửi email xác thực!', error: error.message });
    }
});

// Đăng nhập người dùng
const sendOtpEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Mã OTP Đăng Nhập',
        text: `Mã OTP của bạn là: ${otp}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("OTP sent successfully to:", email);  // Log để xác nhận email đã gửi thành công
    } catch (error) {
        console.error('Error sending OTP:', error);  // Log chi tiết lỗi gửi email
        throw new Error('Không thể gửi mã OTP. Vui lòng thử lại.');
    }
};

// Route xác thực mã OTP

// Định nghĩa hàm generateToken để tạo JWT
const generateToken = (user) => {
    const payload = {
        userId: user._id,  
        email: user.email
    };
    const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '1h' }); 

    return token;
};


// API xác thực OTP
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Người dùng không tồn tại.' });
        }
        if (user.otp !== otp) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ.' });
        }
        if (user.otpExpiry < Date.now()) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn.' });
        }
        user.isVerified = true;
        await user.save();
        const token = generateToken(user);  
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token,
            user: user,
            role: user.role 
        });
    } catch (err) {
        console.error('Lỗi trong quá trình xác thực OTP:', err);
        res.status(500).json({ message: 'Đã xảy ra lỗi trong quá trình xác thực OTP.' });
    }
});




router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Người dùng không tồn tại.' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {return res.status(400).json({ message: 'Mật khẩu sai.' });
    }
    const otp = crypto.randomInt(100000, 999999); 
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; 

    await user.save();
    await sendOtpEmail(user.email, otp);
    res.status(200).json({
        message: 'Mã OTP đã được gửi đến email của bạn.',
        otpSent: true 
    });
} catch (error) {
    res.status(500).json({ message: 'Đã xảy ra lỗi khi đăng nhập hoặc gửi mã OTP.', error: error.message });
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

// // Lấy tất cả người dùng
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

router.post('/forgot-password', userController.forgotPassword);

// // Reset Password Route
router.post('/reset-password/:token', userController.resetPassword);




module.exports = router;