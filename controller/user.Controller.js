const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const User = require('../model/user.Model');

// Secret JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Cấu hình nơi lưu trữ file upload (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/avatars/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Đảm bảo tên file duy nhất
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF).'), false);
    }
};

const upload = multer({ storage, fileFilter });

// **Đăng ký người dùng**
const registerUser = async ({ username, password, email, phone, address, role, avatar }) => {
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error("Người dùng đã tồn tại.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const avatarPath = avatar || 'uploads/avatars/default-avatar.jpg';

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            phone,
            address,
            role: role || 'user',
            avatar: avatarPath,
        });

        const savedUser = await newUser.save();
        const { password: _, ...userWithoutPassword } = savedUser.toObject();
        return userWithoutPassword;
    } catch (error) {
        throw new Error(`Đăng ký thất bại: ${error.message}`);
    }
};

// **Đăng nhập người dùng**
const loginUser = async (email, password) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Email hoặc mật khẩu không chính xác.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Email hoặc mật khẩu không chính xác.');
        }

        const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        return {
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                createdAt: user.createdAt,
            },
        };
    } catch (error) {
        throw error;
    }
};

// **Lấy tất cả người dùng**
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// **Lấy thông tin người dùng theo ID**
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "Người dùng không tìm thấy" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    const userId = req.params.id;
    const { username, email, phone, address, role } = req.body;
    const avatar = req.file;  // Avatar image file from the request

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Người dùng không tìm thấy." });
        }

        // Update user details (only if provided in the request body)
        user.username = username || user.username;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.address = address || user.address;
        user.role = role || user.role;

        // If there's a new avatar, handle file upload
        if (avatar) {
            // Delete the old avatar file (if it's not the default avatar)
            const oldAvatarPath = path.join(__dirname, '../public/img', user.avatar);
            if (user.avatar !== 'default-avatar.jpg' && fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);  // Delete old avatar file
            }

            // Set the new avatar filename
            user.avatar = avatar.filename;
        }

        // Save updated user data
        const updatedUser = await user.save();
        res.json(updatedUser);  // Return the updated user data in the response
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi trong quá trình cập nhật." });
    }
};

// **Xóa người dùng**
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (user) {
            res.json({ message: "Người dùng đã bị xóa" });
        } else {
            res.status(404).json({ message: "Người dùng không tìm thấy" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// **Lấy người dùng theo email**
const getUserByEmail = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Người dùng không tìm thấy.');
        }
        return user;
    } catch (error) {
        throw new Error(error.message);
    }
};const crypto = require('crypto');
const nodemailer = require('nodemailer');
let resetTokens = {};  // In-memory token storage (temporary)

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ message: "Email không tồn tại." });
        }

        // Generate a password reset token (expires in 1 hour)
        
        // Generate a password reset token (expires in 1 hour)
        const token = crypto.randomBytes(32).toString('hex');  // Example output: 9a3b5c8f...
        const expiresAt = new Date(Date.now() + 3600000); // Token has a 1 hour expiration

        // Store the token data in the resetTokens object with userId and expiration time
        resetTokens[token] = { userId: user._id, expiresAt };
        console.log('Generated Reset Token:', token);  // Log the token to verify
        
        // Create a reset URL
        const resetUrl = `http://localhost:3000/users/reset-password/${token}`;
        
        // Send reset URL to the user's email (using nodemailer)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            to: email,
            subject: 'Yêu cầu đặt lại mật khẩu',
            html: `
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0">
                            <tr>
                                <td align="center" style="padding: 20px; background-color: #f2f2f2;">
                                    <h2>Cập nhật mật khẩu của bạn</h2>
                                    <p>Vui lòng nhập mật khẩu mới và xác nhận lại để cập nhật.</p>
                                    <form action="${resetUrl}" method="POST">
                                        <input type="hidden" name="token" value="${token}">
                                        <div style="margin-bottom: 15px;">
                                            <label for="password">Mật khẩu mới:</label>
                                            <input type="password" id="password" name="password" required>
                                        </div>
                                        <div style="margin-bottom: 15px;">
                                            <label for="confirm-password">Xác nhận mật khẩu mới:</label>
                                            <input type="password" id="confirm-password" name="confirm_password" required>
                                        </div>
                                        <button type="submit" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer;">Cập nhật mật khẩu</button>
                                    </form>
                                    <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
          `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Reset email sent:', info.response);
            }
        });

        res.json({ message: 'Reset link đã được gửi vào email của bạn.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi khi gửi email." });
    }
};

const resetPassword = async (req, res) => {
    const { token } = req.params;  // Token from URL params
    const { password } = req.body; // New password from request body
    
    try {
        // Check if the token exists and has not expired
        const tokenData = resetTokens[token];        
        if (!tokenData || tokenData.expiresAt < Date.now()) {
            return res.status(400).json({ message: 'Mã thông báo không hợp lệ hoặc đã hết hạn' });
        }

        const userId = tokenData.userId;
        console.log(tokenData);
        
        console.log('User ID:', userId);  // Debugging: Check the userId

        // Fetch the user by the ID stored in the token data
        const user = await User.findById(userId);
        console.log('User:', user);
        
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tìm thấy.' });
        }

        // Hash the new password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user's password
        user.password = hashedPassword;
        
        // Save the updated user document
        await user.save();

        // Optionally, clean up the reset token (to prevent reuse)
        delete resetTokens[token];

        res.json({ message: 'Mật khẩu đã được cập nhật thành công.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Đã xảy ra lỗi trong quá trình cập nhật mật khẩu." });
    }
};


module.exports = {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUserByEmail,
    forgotPassword,
    resetPassword 
};
