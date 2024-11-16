import db from "./../models";
import mailer from "./../config/mailer";
import { transMailBookingNew, transMailBookingSuccess, transMailBookingFailed } from "../../lang/en";
import helper from "../helper/client";


const statusPendingId = 3;
const statusFailedId = 2;
const statusSuccessId = 1;
const statusNewId = 4;
const { Op, fn, col, literal } = require('sequelize');

let getInfoBooking = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let patient = await db.Patient.findOne({
                where: { id: id },
                attributes: [ 'id', 'doctorId' ]
            });

            if (!patient) {
                reject(`Can't get patient with id = ${id}`);
            }
            let doctor = await db.User.findOne({
                where: { id: patient.doctorId },
                attributes: [ 'name', 'avatar' ]
            });

            patient.setDataValue('doctorName', doctor.name);
            patient.setDataValue('doctorAvatar', doctor.avatar);
            resolve(patient);
        } catch (e) {
            reject(e);
        }
    });
};

let getForPatientsTabs = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let newPatients = await db.Patient.findAll({
                where: {
                    statusId: statusNewId
                },
                order: [ [ 'updatedAt', 'DESC' ] ],
            });

            let pendingPatients = await db.Patient.findAll({
                where: {
                    statusId: statusPendingId
                },
                order: [ [ 'updatedAt', 'DESC' ] ],
            });

            let confirmedPatients = await db.Patient.findAll({
                where: {
                    statusId: statusSuccessId
                },
                order: [ [ 'updatedAt', 'DESC' ] ],
            });

            let canceledPatients = await db.Patient.findAll({
                where: {
                    statusId: statusFailedId
                },
                order: [ [ 'updatedAt', 'DESC' ] ],
            });

            resolve({
                newPatients: newPatients,
                pendingPatients: pendingPatients,
                confirmedPatients: confirmedPatients,
                canceledPatients: canceledPatients
            });
        } catch (e) {
            reject(e);
        }
    });
};

let changeStatusPatient = (data, logs) => {
    return new Promise(async (resolve, reject) => {
        try {

            let patient = await db.Patient.findOne({
                where: { id: data.id }
            });

            let doctor = await db.User.findOne({
                where: { id: patient.doctorId },
                attributes: [ 'name', 'avatar' ],
            });


            //update tổng số lượt đặt bác sĩ khi status = thành công
            if (data.statusId === statusSuccessId) {
                let schedule = await db.Schedule.findOne({
                    where: { doctorId: patient.doctorId, time: patient.timeBooking, date: patient.dateBooking }
                });

                let sum = +schedule.sumBooking;
                await schedule.update({ sumBooking: sum + 1 });
            }

            //update tổng số lượt đặt bác sĩ khi status = hủy
            if (data.statusId === statusFailedId) {
                let schedule = await db.Schedule.findOne({
                    where: { doctorId: patient.doctorId, time: patient.timeBooking, date: patient.dateBooking }
                });

                let sum = +schedule.sumBooking;
                await schedule.update({ sumBooking: sum - 1 });
            }


            await patient.update(data);

            //update logs
            let log = await db.SupporterLog.create(logs);

            //send email
            if (data.statusId === statusSuccessId) {
                let dataSend = {
                    time: patient.timeBooking,
                    date: patient.dateBooking,
                    doctor: doctor.name
                };
                await mailer.sendEmailNormal(patient.email, transMailBookingSuccess.subject, transMailBookingSuccess.template(dataSend));
            }
            if (data.statusId === statusFailedId && patient.email) {
                let dataSend = {
                    time: patient.timeBooking,
                    date: patient.dateBooking,
                    doctor: doctor.name,
                    reason: log.content
                };
                await mailer.sendEmailNormal(patient.email, transMailBookingFailed.subject, transMailBookingFailed.template(dataSend));
            }

            resolve(patient);
        } catch (e) {
            reject(e);
        }
    });
};

let isBookAble = async (doctorId, date, time) => {
    let schedule = await db.Schedule.findOne({
        where: {
            doctorId: doctorId,
            date: date,
            time: time
        },
        attributes: [ 'id', 'doctorId', 'date', 'time', 'maxBooking', 'sumBooking' ]
    });

    if (schedule) {
        return schedule.sumBooking < schedule.maxBooking;
    }
    return false;
};

let createNewPatient = (data) => {
    return new Promise((async (resolve, reject) => {
        try {
            console.log(data.doctorId, data.dateBooking, data.timeBooking)
            let schedule = await db.Schedule.findOne({
                where: {
                    doctorId: data.doctorId,
                    date: data.dateBooking,
                    time: data.timeBooking
                },
            }).then(async (schedule) => {
                if (schedule && schedule.sumBooking < schedule.maxBooking) {
                    let patient = await db.Patient.create(data);
                    data.patientId = patient.id;
                    await db.Patient.update({ patientId: patient.id }, { where: { id: patient.id } });
                    
                    //await db.ExtraInfo.create(data);

                    //tăng sumBooking
                    let sum = +schedule.sumBooking;
                    await schedule.update({ sumBooking: sum + 1 });

                    let doctor = await db.User.findOne({
                        where: { id: patient.doctorId },
                        attributes: [ 'name', 'avatar' ]
                    });

                    //update logs
                    let logs = {
                        patientId: patient.id,
                        content: "The patient made an appointment from the system ",
                        createdAt: Date.now()
                    };

                    await db.SupporterLog.create(logs);

                    let dataSend = {
                        time: patient.timeBooking,
                        date: patient.dateBooking,
                        doctor: doctor.name
                    };

                    let isEmailSend = await mailer.sendEmailNormal(patient.email, transMailBookingNew.subject, transMailBookingNew.template(dataSend));
                    if (!isEmailSend) {
                        console.log("An error occurs when sending an email to: " + patient.email);
                        console.log(isEmailSend);
                    }
                    await db.patient_exam.create(data);
                    resolve(patient);
                } else {
                    resolve("Max booking")
                }

            });

        } catch (e) {
            reject(e);
        }
    }));
};

let getDetailPatient = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let patient = await db.Patient.findOne({
                where: { id: id },
                include: { model: db.ExtraInfo, required: false }
            });
            resolve(patient)
        } catch (e) {
            reject(e);
        }
    });
};
let getListBookingPatient = (keySearch) => {
    return new Promise(async (resolve, reject) => {
        try {
            let patient = await db.Patient.findAll({
                where: {
                    [Op.or]: [
                        { email: keySearch },
                        { phone: keySearch }
                    ]
                },
                include: {
                    model: db.User, 
                    required: false,
                    //attributes: ['name', 'email', 'address', 'phone']
                },
                order: [['id', 'DESC']]
            });
            resolve(patient);
        } catch (e) {
            reject(e);
        }
    });
};

let getLogsPatient = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            let logs = await db.SupporterLog.findAll({
                where: {
                    patientId: id
                }
            });

            if (logs.length) {
                await Promise.all(logs.map(async (log) => {
                    if (log.supporterId) {
                        let supporter = await db.User.findOne({
                            where: { id: log.supporterId },
                            attributes: [ 'name' ]
                        });
                        log.setDataValue('supporterName', supporter.name);
                    } else {
                        log.setDataValue('supporterName', '');
                    }
                    return log;
                }));
            }
            resolve(logs);
        } catch (e) {
            reject(e);
        }
    });
};

let getComments = () => {
    return new Promise(async (resolve, reject) => {
        try {
            let comments = await db.Comment.findAll({
                where: {
                    status: false
                }
            });
            resolve(comments);

        } catch (e) {
            reject(e)
        }
    });
};

let getDailyBookingStats = (month, year) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Lấy thông tin bệnh nhân theo ngày, lọc theo tháng và năm
            let dailyStats = await db.Patient.findAll({
                attributes: [
                    ['dateBooking', 'date'], // Sử dụng trực tiếp chuỗi `dateBooking`
                    [fn('COUNT', col('id')), 'count']
                ],
                where: {
                    [Op.and]: [
                        literal(`STR_TO_DATE(dateBooking, '%d/%m/%Y') >= '${year}-${month.toString().padStart(2, '0')}-01'`),
                        literal(`STR_TO_DATE(dateBooking, '%d/%m/%Y') < '${year}-${(month + 1).toString().padStart(2, '0')}-01'`)
                    ]
                },
                group: ['dateBooking'],
                order: [[col('dateBooking'), 'ASC']]
            });
            console.log(dailyStats);
            // Chuyển đổi kết quả để trả về mảng dữ liệu cho biểu đồ
            const result = dailyStats.map(stat => ({
                date: stat.getDataValue('date'),
                count: stat.getDataValue('count')
            }));

            resolve(result);
        } catch (e) {
            reject(e);
        }
    });
};
module.exports = {
    getInfoBooking: getInfoBooking,
    getForPatientsTabs: getForPatientsTabs,
    changeStatusPatient: changeStatusPatient,
    createNewPatient: createNewPatient,
    getDetailPatient: getDetailPatient,
    getLogsPatient: getLogsPatient,
    getComments: getComments,
    getListBookingPatient: getListBookingPatient,
    getDailyBookingStats: getDailyBookingStats
};
