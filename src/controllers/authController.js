import { validationResult } from "express-validator";
import authService from "../services/authService";
const authService2 = require('../services/authService').authService;
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

        // Tạo token JWT
        const token = authService2.generateToken(user);

        // Trả về token và thông tin người dùng
        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        res.status(401).json({ message: error.message || 'Login failed' });
    }
}

const registerApi = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await userService.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already in use' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await authService2.hashPassword(password);

        // Tạo người dùng mới
        const newUser = await userService.createUser({
            username,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Registration failed' });
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
    setNewPasswordApi: setNewPasswordApi
};
