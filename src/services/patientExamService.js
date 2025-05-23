import db from "../models";
import mailer from "../config/mailer";
import { transMailBookingNew, transMailBookingSuccess, transMailBookingFailed } from "../../lang/en";
import helper from "../helper/client";


const statusPendingId = 3;
const statusFailedId = 2;
const statusSuccessId = 1;
const statusNewId = 4;
const { Op } = require('sequelize');


//Tạo lịch khám cho bệnh nhân
let createNewPatientExam = (data) => {
    return new Promise((async(resolve, reject) => {
        try {
            //Kiểm tra lịch khám theo bác sĩ, ngày, giờ
            let schedule = await db.Schedule.findOne({
                where: {
                    doctorId: data.doctorId,
                    date: data.dateBooking,
                    time: data.timeBooking
                },
            }).then(async(schedule) => {
                //Nếu chưa đầy lịch khám
                if (schedule && schedule.sumBooking < schedule.maxBooking) {
                    data.createdAt = new Date();
                    //Tạo mới một bảnh ghi trong bảng patient_exam
                    let patient = await db.patient_exam.create(data);

                    //Đồng thời tạo một bản ghi mới trong bảng Patient
                    let patientld = await db.Patient.create(data);

                    //Tăng số lượng lịch khám hiện tại
                    let sum = +schedule.sumBooking;
                    await schedule.update({ sumBooking: sum + 1 });

                    //Ghi log lịch sử bệnh nhân đặt khám
                    let logs = {
                        patientId: patient.id,
                        content: "The patient made an appointment from the system ",
                        createdAt: Date.now()
                    };

                    await db.SupporterLog.create(logs);
                    //Trả về kết quả lịch khám
                    resolve(patient);
                } else {
                    //Trường hợp đã đặt tối đa số lượt đặt
                    resolve("Max booking")
                }

            });

        } catch (e) {
            reject(e);
        }
    }));
};

//Cập nhật thông tin lịch khám bệnh nhân theo ID
let updatePatientExamById = async(data) => {
    console.log(data)
    return new Promise(async(resolve, reject) => {
        try {
            //Tìm lịch khám theo ID
            let exam = await db.patient_exam.findOne({
                where: { id: data.id },
            });

            if (exam) {
                data.updateAt = new Date();
                // Cập nhật thông tin của exam
                await exam.update(data);
                resolve({
                    message: "Patient exam updated successfully",
                    exam: exam,
                });
            } else {
                resolve({
                    message: "Patient exam not found",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy tất cả các lịch khám của một bệnh nhân theo patientId
let getPatientExamsByPatientId = async(patientId) => {
    return new Promise(async(resolve, reject) => {
        try {
            let exams = await db.patient_exam.findAll({
                where: { patientId: patientId },
            });

            if (exams.length > 0) {
                resolve(exams);
            } else {
                resolve({
                    message: "No exams found for this patient",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy chi tiết lịch khám của bệnh nhân theo patientId, ngày và giờ khám
let getDetailPatientExamsByPatientId = async(patientId, dateBooking, timeBooking) => {
    return new Promise(async(resolve, reject) => {
        try {
            console.log(patientId, dateBooking, timeBooking);
            let exams = await db.patient_exam.findOne({
                where: { patientId: patientId, dateBooking: dateBooking, timeBooking: timeBooking },
            });
            if (exams) {
                resolve(exams);
            } else {
                resolve({
                    message: "No exams found for this patient",
                });
            }
        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    createNewPatientExam: createNewPatientExam,
    updatePatientExamById: updatePatientExamById,
    getPatientExamsByPatientId: getPatientExamsByPatientId,
    getDetailPatientExamsByPatientId: getDetailPatientExamsByPatientId
};