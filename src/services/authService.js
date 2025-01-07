import { address } from "faker/lib/locales/az";
import {tranRegisterEmail, tranForgotPassword} from "../../lang/en";
import {sendEmail} from "./../config/mailer";
import mailer from "./../config/mailer";
import userService from "./../services/userService";
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcrypt = require('bcrypt');
require('dotenv').config();
const SECRET_KEY = process.env.JWT_SECRET;
let register = ({user}, linkVerify) => {
    return new Promise(async (resolve, reject) => {
        let isEmailSend = await sendEmail(user.local.email, tranRegisterEmail.subject, tranRegisterEmail.template(linkVerify));
        if (isEmailSend) resolve(tranRegisterEmail.sendSuccess(user.local.email));
        else reject(tranRegisterEmail.sendFail);
    });
};
let verifyAccount = (token) => {
    return new Promise(async (resolve, reject) => {
        await userService.verifyAccount(token)
            .then(() => {
                resolve(tranRegisterEmail.account_active);
            })
            .catch((err) => {
                reject(err);
            });
    });
};
let resetPassword = (email, linkVerify) => {
    return new Promise(async (resolve, reject) => {
        let isEmailSend = await sendEmail(email, tranForgotPassword.subject, tranForgotPassword.template(linkVerify));
        if (isEmailSend) resolve(true);
        else reject(false);
    });
};



let setNewPassword = (email, password) => {
    return new Promise(async (resolve, reject) => {
        await userService.findUserByEmail(email)
            .then(async (user) => {
                if (!user) reject("user not found");
                else {
                    await userService.setNewPassword(email, password);
                    resolve(true);
                }
            }).catch((err) => {
                reject(err);
            });
    });
};

let changePassword = (email, currentPassword, newPassword) => {
    return new Promise(async (resolve, reject) => {
        await userService.findUserByEmail(email)
            .then(async (user) => {
                if (!user) {
                    reject("Không tìm thấy tài khoản");
                } else {
                    // Kiểm tra mật khẩu hiện tại với mật khẩu đã lưu trong cơ sở dữ liệu
                    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
                    if (!isPasswordValid) {
                        reject("Mật khẩu hiện tại không chính xác");
                    } else {
                        // Mã hóa lại mật khẩu mới trước khi lưu vào cơ sở dữ liệu
                        const hashedPassword = await bcrypt.hash(newPassword, 7);
                        await setNewPassword(email , hashedPassword);
                        resolve("Mật khẩu đã được thay đổi thành công");
                    }
                }
            }).catch((err) => {
                console.log(err)
                reject(err);
            });
    });
};
class AuthService {
    async authenticate(req) {
        return new Promise((resolve, reject) => {
            passport.authenticate('local', async (err, user, info) => {
                if (err) {
                    console.error('Error during authentication:', err);
                    return reject({ message: 'Authentication error', error: err });
                }
                if (!user) {
                    console.warn('Invalid credentials:', info);
                    return reject({ message: 'Invalid credentials' });
                }
                // Nếu xác thực thành công
                resolve(user);
            })(req);
        });
    }

    async changePassword(email,currentPassword,newPassword ) {
        try {
            const result = await changePassword(email, currentPassword, newPassword);
            console.log(result);
            res.status(200).send({ message: result });
        } catch (error) {
            res.status(400).send({ message: error });
        }
    }

    generateToken(user) {
        const payload = {
            id: user.id,
            name: user.name,
            address: user.address,
            phone: user.phone,
            gender: user.gender,
            email: user.email,
            role: user.roleId || 0, // Thêm vai trò (mặc định là user)
            status: user.isActive || 0 // Thêm trạng thái (mặc định là active)
        };
        return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
    }

    async verifyPassword(inputPassword, storedPassword) {
        // So sánh mật khẩu người dùng nhập với mật khẩu trong cơ sở dữ liệu
        return bcrypt.compare(inputPassword, storedPassword);
    }

    async generateOTP(){
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6 chữ số
    };

    async sendVerificationEmail (email, otpCode) {
        const mailOptions = {
          from: '"Your App" <your-email@gmail.com>',
          to: email,
          subject: "Xác nhận email của bạn",
          html: `
            <p>Xin chào,</p>
            <p>Mã xác nhận của bạn là:</p>
            <h2>${otpCode}</h2>
            <p>Mã có hiệu lực trong 10 phút.</p>
          `,
        };
        await mailer.sendEmailNormal(email,"Mã OTP xác nhận đăng kí tài khoản", mailOptions.html);
    };
}
const instance = new AuthService();
module.exports = {
    register,
    verifyAccount,
    resetPassword,
    setNewPassword,
    changePassword,
    authService: instance, // Singleton instance
};