'use strict';
module.exports = (sequelize, DataTypes) => {
    const EmailVerifications = sequelize.define('EmailVerifications', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true, // Đánh dấu là khóa chính
            autoIncrement: true, // Đánh dấu tự động tăng
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false, // Không được phép null
            validate: {
                isEmail: true, // Đảm bảo đúng định dạng email
            },
        },
        otp_code: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP'), // Giá trị mặc định
        },
        
    }, {
        tableName: 'EmailVerifications', // Tên bảng trong DB
        timestamps: false, // Không tự động thêm `createdAt` và `updatedAt`
    });

    return EmailVerifications;
};
