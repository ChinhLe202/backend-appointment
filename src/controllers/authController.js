import { validationResult } from "express-validator";
import authService from "../services/authService";
import userService from "../services/userService";
import db from "./../models";
const jwt = require('jsonwebtoken');
const authService2 = require('../services/authService').authService;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
let getLogin = (req, res) => {
    return res.render("auth/login.ejs", {
        error: req.flash("error"),
    });
};

let getRegister = (req, res) => {
    return res.render("auth/register.ejs");
};

let postRegister = async (req, res) => {
    let hasErrors = validationResult(req).array({
        onlyFirstError: true
    });
    if (!hasErrors.length) {
        try {

            // await authService.register(req.body.name, req.body.rg_email, req.body.rg_password, req.protocol, req.get("host")).then(async (user) => {
            console.log(user);
            // res.redirect('login');
            // let linkVerify = `${req.protocol}://${req.get("host")}/verify/${user.local.verifyToken}`;
            // await authService.register({user}, linkVerify)
            // .then((message) => {
            //     req.flash("success", message);
            //     res.redirect('/login');
            // })
            // .catch((err) => {
            //     console.log(err);
            // });
            // }).catch((err) => {
            //     console.log(err);
            // });
        } catch (err) {
            req.flash("errors", err);
            res.render('/register', {
                oldData: req.body
            });
        }
    } else {
        let errEmail = '', errPassword = '', errPasswordConfirm = '';
        hasErrors.forEach((err) => {
            if (err.param === 'rg_email') errEmail = err.msg;
            if (err.param === 'rg_password') errPassword = err.msg;
            if (err.param === 'rg_password_again') errPasswordConfirm = err.msg;
        });
        res.render("auth/register", {
            errEmail: errEmail,
            errPassword: errPassword,
            errPasswordConfirm: errPasswordConfirm,
            hasErrors: hasErrors,
            oldData: req.body
        })
    }
};

let verifyAccount = async (req, res) => {
    let errorArr = [];
    let successArr = [];
    try {
        let verifySuccess = await auth.verifyAccount(req.params.token);
        successArr.push(verifySuccess);
        req.flash("success", successArr);
        return res.redirect("/login");

    } catch (error) {
        console.log(error);
    }
};

let getLogout = (req, res) => {
    req.session.destroy(function(err) {
        console.log(err);
        return res.redirect("/login");
    });

};

let checkLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
};

let checkLoggedOut = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect("/users");
    }
    next();
};

let loginApi = async (req, res)=>{
    try {
        // Xác thực người dùng
        const user = await authService2.authenticate(req);
        if (!user) {
            // Trường hợp không xác thực được
            return res.status(401).json({
              status: 'error',
              message: 'Email hoặc mật khẩu không chính xác.',
            });
          }
        // Tạo token JWT
        const token = authService2.generateToken(user);

        // Trả về token và thông tin người dùng
        res.status(200).json({
            message: 'Đăng nhập thành công',
            token: token,
            // user: {
            //     id: user.id,
            //     email: user.email,
            //     role: user.role,
            //     status: user.status,
            // },
        });
    } catch (error) {
        res.status(401).json({ message: error.message || 'Đăng nhập thất bại' });
    }
}

const registerApi = async (req, res) => {
    try {
        // Validate input data
        const validationError = validateUser(req.body); // Hàm validate bạn đã sử dụng
        if (validationError) {
          return res.status(400).json({
            message: "Validation error",
            errors: validationError,
          });
        }

        const {
            name,
            email,
            password,
            address,
            phone,
            //avatar,
            gender,
            description,
            roleId,
            isActive,
            otpCode
          } = req.body;

        const verification = await db.EmailVerifications.findOne({
            where: {
                email,
                otp_code: otpCode,
                expires_at: { [Op.gt]: new Date() }, // Kiểm tra thời hạn
            },
            });
        
            if (!verification) {
            return res.status(400).json({ message: "Mã xác nhận không hợp lệ hoặc đã hết hạn." });
        }
        
    
        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email đã được sử dụng." });
        }
    
        // Mã hóa mật khẩu
        //const hashedPassword = await authService.hashPassword(password);
    
        // Tạo user qua service
        const newUser = await userService.createUser({
          name,
          email,
          password: password, // Lưu mật khẩu đã hash
          address,
          phone,
          //avatar,
          gender,
          description,
          roleId,
          isActive: isActive || 1,
        });
    
        return res
          .status(201)
          .json({ message: "Đăng kí thành công.", data: newUser });
      } catch (error) {
        console.error("Lỗi khi tạo user:", error);
        return res.status(500).json({
          message: "Có lỗi xảy ra.",
          error: error.message || "Đã xảy ra lỗi trong quá trình xử lý.",
        });
      }
};

const sendVerificationCode = async (req, res) => {
    try {
      const { email } = req.body;
  
      // Kiểm tra email đã tồn tại trong hệ thống chưa
      const existingUser = await userService.findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng." });
      }
  
      // Tạo mã OTP
      const otpCode = await authService2.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
      console.log(otpCode, expiresAt);
      // Lưu mã OTP vào DB
      await db.EmailVerifications.create({ email, otp_code: otpCode, expires_at: expiresAt });
  
      // Gửi email OTP
      await authService2.sendVerificationEmail(email, otpCode);
  
      res.status(200).json({ message: "Mã xác nhận đã được gửi đến email của bạn." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Gửi mã xác nhận thất bại.", error: error.message });
    }
  };

// Xác minh tài khoản
const verifyAccountApi = async (req, res) => {
    try {
        const { token } = req.params;

        // Xác minh token
        const result = await authService2.verifyToken(token);

        res.status(200).json({ message: result });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Account verification failed' });
    }
};

// Reset mật khẩu
const resetPasswordApi = async (req, res) => {
    try {
        const { email } = req.body;

        // Tạo link xác minh
        const linkVerify = `${process.env.CLIENT_URL}/reset-password?token=${authService.generateResetToken(email)}`;

        // Gửi email reset password
        const result = await authService2.resetPassword(email, linkVerify);

        res.status(200).json({ message: result ? 'Reset email sent' : 'Failed to send reset email' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Reset password failed' });
    }
};

// Thiết lập mật khẩu mới
const setNewPasswordApi = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Thiết lập mật khẩu mới
        await authService2.setNewPassword(email, password);

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to update password' });
    }
};

const validateUser = (data) => {
    const errors = [];
  
    if (!data.name || data.name.trim() === "") {
      errors.push("Vui lòng nhập tên.");
    }
  
    if (!data.email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(data.email)) {
      errors.push("Định dạng email không đúng.");
    }
  
    if (!data.password || data.password.length < 6) {
      errors.push("Mật khẩu cần dài hơn 6 kí tự.");
    }
  
    if (data.phone && !/^(03|05|07|08|09)\d{8}$/.test(data.phone)) {
        errors.push("Định dạng số điện thoại Việt Nam chưa đúng.");
    }
  
    return errors.length > 0 ? errors : null;
  };

  const checkAuthWithJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token missing or invalid' });
    }

    const token = authHeader.split(' ')[1]; // Lấy token sau "Bearer"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Dùng secret để xác minh
        req.user = decoded; // Lưu thông tin user từ token vào req.user
        next(); // Tiếp tục xử lý route
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const changePassword = async (req, res) => {
    console.log(req.body);
    const { email, currentPassword, newPassword } = req.body;
    try {
        // Gọi service đổi mật khẩu
        const result = await authService.changePassword(email, currentPassword, newPassword);
        console.log(result);
        // Trả về thông báo thành công
        res.status(200).send({ message: result });
    } catch (error) {
        // Trả về thông báo lỗi nếu có lỗi xảy ra
        res.status(400).send({ message: error });
    }
};
module.exports = {
    getLogin: getLogin,
    getRegister: getRegister,
    postRegister: postRegister,
    verifyAccount: verifyAccount,
    getLogout: getLogout,
    checkLoggedIn: checkLoggedIn,
    checkLoggedOut: checkLoggedOut,
    loginApi: loginApi,
    registerApi: registerApi,
    verifyAccountApi: verifyAccountApi,
    resetPasswordApi: resetPasswordApi,
    setNewPasswordApi: setNewPasswordApi,
    sendVerificationCode: sendVerificationCode,
    checkAuthWithJWT: checkAuthWithJWT,
    changePassword: changePassword
};
