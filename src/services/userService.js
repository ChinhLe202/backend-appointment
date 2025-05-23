import bcrypt from "bcryptjs";
import db from "./../models";
import helper from "../helper/client";
import elastic from "./../config/elastic";
import _ from "lodash";

const Sequelize = require('sequelize');
const Op = Sequelize.Op;

import moment from "moment";
import { name } from "faker/lib/locales/az";

let salt = 7;
//Tạo bác sĩ liên kết với các chuyên khoa, phòng khám
let createDoctor = (doctor) => {
    doctor.roleId = 2;
    doctor.password = bcrypt.hashSync(doctor.password, salt);
    return new Promise((async(resolve, reject) => {
        let newDoctor = await db.User.create(doctor);
        let item = {
            doctorId: newDoctor.id,
            clinicId: doctor.clinicId,
            specializationId: doctor.specializationId
        };
        await db.Doctor_User.create(item);

        //create doctor elastic

        resolve(newDoctor)
    }));
};

//Lấy thông tin list bác sĩ(phòng khám, chuyên khoa, số lượng bệnh nhân)
let getInfoDoctors = () => {
    return new Promise((async(resolve, reject) => {
        try {
            let doctors = await db.User.findAll({
                where: { roleId: 2 },
                include: [
                    { model: db.Doctor_User, required: false },
                    { model: db.Patient, required: false, where: { statusId: 1 } }
                ]
            });
            await Promise.all(doctors.map(async(doctor) => {
                if (doctor.Doctor_User) {
                    let clinic = await helper.getClinicById(doctor.Doctor_User.clinicId);
                    let specialization = await helper.getSpecializationById(doctor.Doctor_User.specializationId);
                    let countBooking = doctor.Patients.length;
                    doctor.setDataValue('clinicName', clinic.name);
                    doctor.setDataValue('clinicAddress', clinic.address);
                    doctor.setDataValue('specializationName', specialization.name);
                    doctor.setDataValue('countBooking', countBooking);
                } else {
                    doctor.setDataValue('clinicName', "null");
                    doctor.setDataValue('clinicAddress', "");
                    doctor.setDataValue('specializationName', "null");
                    doctor.setDataValue('countBooking', 0);
                }
                return doctor;
            }));
            resolve(doctors);
        } catch (e) {
            reject(e);
        }

    }));
};
//Tìm kiếm bác sĩ
let getInfoDoctorsFilter = (searchText, clinicId, specializationId) => {
    return new Promise((async(resolve, reject) => {
        try {
            let doctors = await db.User.findAll({
                where: {
                    roleId: 2,
                    ...(searchText ? {
                        name: {
                            [db.Sequelize.Op.like]: `%${searchText}%`
                        }
                    } : {})
                },
                include: [{
                        model: db.Doctor_User,
                        required: true,
                        where: {
                            ...(specializationId ? { specializationId } : {}),
                            ...(clinicId ? { clinicId } : {})
                        }
                    },
                    {
                        model: db.Patient,
                        required: false,
                        where: { statusId: 1 }
                    }
                ]
            });
            await Promise.all(doctors.map(async(doctor) => {
                if (doctor.Doctor_User) {
                    let clinic = await helper.getClinicById(doctor.Doctor_User.clinicId);
                    let specialization = await helper.getSpecializationById(doctor.Doctor_User.specializationId);
                    let countBooking = doctor.Patients.length;
                    doctor.setDataValue('clinicName', clinic.name);
                    doctor.setDataValue('clinicAddress', clinic.address);
                    doctor.setDataValue('specializationName', specialization.name);
                    doctor.setDataValue('countBooking', countBooking);
                } else {
                    doctor.setDataValue('clinicName', "null");
                    doctor.setDataValue('clinicAddress', "");
                    doctor.setDataValue('specializationName', "null");
                    doctor.setDataValue('countBooking', 0);
                }
                return doctor;
            }));
            resolve(doctors);
        } catch (e) {
            reject(e);
        }

    }));
};
//Tìm kiếm người dùng theo email
let findUserByEmail = (email) => {
    return new Promise(async(resolve, reject) => {
        try {
            let user = await db.User.findOne({
                where: { email: email },
            });
            resolve(user);
        } catch (e) {
            reject(e);
        }
    });
};
//So sánh passworf user với password mã hóa trong db
let comparePassword = (password, user) => {
    return bcrypt.compare(password, user.password);
};
//Tìm người dùng theo ID
let findUserById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            let user = await db.User.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'avatar', 'roleId', 'isActive']
            });
            resolve(user);
        } catch (e) {
            reject(e);
        }
    });
};

//Chuyển đổi chuỗi ngày tháng sang đối tượng date
function stringToDate(_date, _format, _delimiter) {
    let formatLowerCase = _format.toLowerCase();
    let formatItems = formatLowerCase.split(_delimiter);
    let dateItems = _date.split(_delimiter);
    let monthIndex = formatItems.indexOf("mm");
    let dayIndex = formatItems.indexOf("dd");
    let yearIndex = formatItems.indexOf("yyyy");
    let month = parseInt(dateItems[monthIndex]);
    month -= 1;
    return new Date(dateItems[yearIndex], month, dateItems[dayIndex]);

}
//Lấy thông tin số lượng bệnh nhân, bác sĩ, post và bác sĩ tốt nhất trong 1 tháng
let getInfoStatistical = (month) => {
    return new Promise(async(resolve, reject) => {
        try {
            let startDate = Date.parse(stringToDate(`01/${month}/2025`, "dd/MM/yyyy", "/"));
            let endDate = Date.parse(stringToDate(`31/${month}/2025`, "dd/MM/yyyy", "/"));

            let patients = await db.Patient.findAndCountAll({
                attributes: ['id', 'doctorId'],
                where: {
                    createdAt: {
                        [Op.between]: [startDate, endDate],
                    },
                }
            });

            let doctors = await db.User.findAndCountAll({
                attributes: ['id'],
                where: {
                    roleId: 2,
                    createdAt: {
                        [Op.between]: [startDate, endDate],
                    }
                }
            });

            let posts = await db.Post.findAndCountAll({
                attributes: ['id', 'writerId'],
                where: {
                    forClinicId: -1,
                    forSpecializationId: -1,
                    forDoctorId: -1,
                    createdAt: {
                        [Op.between]: [startDate, endDate],
                    }
                }
            });

            let bestDoctor = '';

            if (+patients.count > 0) {
                let bestDoctorIdArr = _(patients.rows)
                    .groupBy('doctorId')
                    .map((v, doctorId) => ({
                        doctorId,
                        patientId: _.map(v, 'id')
                    }))
                    .value();
                let doctorObject = _.maxBy(bestDoctorIdArr, function(o) {
                    return o.patientId.length;
                });
                bestDoctor = await db.User.findOne({
                    where: {
                        id: doctorObject.doctorId
                    },
                    attributes: ['id', 'name']
                });
                bestDoctor.setDataValue("count", doctorObject.patientId.length);
            }

            let bestSupporter = '';
            if (+posts.count > 0) {
                let bestSupporterIdArr = _(posts.rows)
                    .groupBy('writerId')
                    .map((v, writerId) => ({
                        writerId,
                        postId: _.map(v, 'id')
                    }))
                    .value();
                let supporterObject = _.maxBy(bestSupporterIdArr, function(o) {
                    return o.postId.length;
                });
                bestSupporter = await db.User.findOne({
                    where: {
                        id: supporterObject.writerId
                    },
                    attributes: ['id', 'name']
                });
                bestSupporter.setDataValue("count", supporterObject.postId.length);
            }

            resolve({
                patients: patients,
                doctors: doctors,
                posts: posts,
                bestDoctor: bestDoctor,
                bestSupporter: bestSupporter
            });
        } catch (e) {
            reject(e);
        }
    });
};
//Lấy thông tin thống kê bệnh nhân của bác sĩ trong một tháng
let getInfoDoctorChart = (month) => {
    return new Promise(async(resolve, reject) => {
        try {
            let startDate = Date.parse(stringToDate(`01/${month}/2025`, "dd/MM/yyyy", "/"));
            let endDate = Date.parse(stringToDate(`31/${month}/2025`, "dd/MM/yyyy", "/"));
            let patients = await db.Patient.findAndCountAll({
                attributes: ['id', 'doctorId', 'statusId', 'isSentForms'],
                where: {
                    createdAt: {
                        [Op.between]: [startDate, endDate],
                    },
                }
            });
            resolve({ patients: patients })
        } catch (e) {
            reject(e);
        }
    });
};

//Trả về dữ liệu tĩnh thay vì truy vấn cơ sở dữ liệu
// let getInfoDoctorChart = month => {
//     return new Promise(async(resolve, reject) => {
//         try {
//             // Trả về dữ liệu tĩnh thay vì truy vấn cơ sở dữ liệu
//             resolve({
//                 patients: {
//                     count: 10,
//                     rows: [
//                         { id: 1, doctorId: 1, statusId: 1, isSentForms: true },
//                         { id: 2, doctorId: 1, statusId: 1, isSentForms: false },
//                         { id: 3, doctorId: 2, statusId: 1, isSentForms: true },
//                         { id: 4, doctorId: 2, statusId: 1, isSentForms: false },
//                     ],
//                 },
//             });
//         } catch (e) {
//             reject(e);
//         }
//     });
// };

//Tạo lịch hẹn cho tất cả bác sĩ trong 3 ngày tiếp theo
let createAllDoctorsSchedule = () => {
        return new Promise(async(resolve, reject) => {
            try {
                let timeArr = ['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
                    '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'
                ]
                let threeDaySchedules = [];
                for (let i = 0; i < 3; i++) {
                    let date = moment(new Date()).add(i, 'days').locale('en').format('DD/MM/YYYY');
                    threeDaySchedules.push(date);
                }

                let doctors = await db.User.findAll({
                    where: {
                        roleId: 2
                    },
                    attributes: ['id', 'name'],
                    raw: true
                });

                //only create once
                let isCreatedBefore = false;

                //only check the first doctor with date and time
                let check = await db.Schedule.findAll({
                    where: {
                        doctorId: doctors[0].id,
                        date: threeDaySchedules[0],
                        time: timeArr[0]
                    }
                })

                if (check && check.length > 0) isCreatedBefore = true;

                if (!isCreatedBefore) {
                    if (doctors && doctors.length > 0) {
                        await Promise.all(
                            doctors.map((doctor) => {
                                threeDaySchedules.map(day => {
                                    timeArr.map(async(time) => {
                                        let schedule = {
                                            doctorId: doctor.id,
                                            date: day,
                                            time: time,
                                            maxBooking: 2,
                                            sumBooking: 0
                                        }
                                        await db.Schedule.create(schedule);
                                    })
                                })
                            })
                        )
                    }
                    resolve("Appointments are created successful (in 3 days). Please check your database (schedule table)")
                } else {
                    resolve("Appointments are duplicated. Please check your database (schedule table)")
                }
            } catch (e) {
                reject(e);
            }
        });
    }
    //Lấy thông tin lịch hẹn của tất cả các bác sĩ
let getAllDoctorsSchedule = () => {
        return new Promise(async(resolve, reject) => {
            try {
                let schedules = await db.Schedule.findAll({
                    attributes: ['doctorId', 'date', 'time'],
                    raw: true
                });
                resolve(schedules)
            } catch (e) {
                reject(e);
            }
        })
    }
    //Tạo người dùng mới và mã hóa password
const createUser = async(userData) => {
    try {
        const salt = await bcrypt.genSalt(10);
        userData.password = bcrypt.hashSync(userData.password, salt);
        const newUser = await db.User.create({
            ...userData,
            createdAt: new Date(),
            //updatedAt: new Date(),
        });
        return newUser;
    } catch (error) {
        throw new Error(error.message);
    }
};

//Cập nhật mật khẩu mới cho người dùng qua email
async function setNewPassword(email, newPassword) {
    try {
        // Kiểm tra email có tồn tại không
        console.log(email, newPassword);
        let user = await db.User.findOne({
            where: { email: email },
        });
        if (!user) {
            return { success: false, message: 'Email không tồn tại' };
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        await user.save();

        return { success: true, message: 'Mật khẩu đã được cập nhật thành công' };
    } catch (error) {
        console.error('Lỗi khi cập nhật mật khẩu:', error);
        return { success: false, message: 'Đã xảy ra lỗi khi cập nhật mật khẩu' };
    }
}
module.exports = {
    createDoctor: createDoctor,
    getInfoDoctors: getInfoDoctors,
    findUserByEmail: findUserByEmail,
    findUserById: findUserById,
    comparePassword: comparePassword,
    getInfoStatistical: getInfoStatistical,
    getInfoDoctorChart: getInfoDoctorChart,
    createAllDoctorsSchedule: createAllDoctorsSchedule,
    getAllDoctorsSchedule: getAllDoctorsSchedule,
    getInfoDoctorsFilter: getInfoDoctorsFilter,
    createUser: createUser,
    setNewPassword: setNewPassword
};