import db from "../models";
import mailer from "../config/mailer";
import { transMailBookingNew, transMailBookingSuccess, transMailBookingFailed } from "../../lang/en";
import helper from "../helper/client";


const statusPendingId = 3;
const statusFailedId = 2;
const statusSuccessId = 1;
const statusNewId = 4;
const { Op } = require('sequelize');



let createNewPatientExam = (data) => {
    return new Promise((async (resolve, reject) => {
        try {
            let schedule = await db.Schedule.findOne({
                where: {
                    doctorId: data.doctorId,
                    date: data.dateBooking,
                    time: data.timeBooking
                },
            }).then(async (schedule) => {
                if (schedule && schedule.sumBooking < schedule.maxBooking) {
                    data.createdAt = new Date();
                    let patient = await db.patient_exam.create(data);
                    
                    let patientld = await db.Patient.create(data);

                    let sum = +schedule.sumBooking;
                    await schedule.update({ sumBooking: sum + 1 });

                    let logs = {
                        patientId: patient.id,
                        content: "The patient made an appointment from the system ",
                        createdAt: Date.now()
                    };

                    await db.SupporterLog.create(logs);
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

let updatePatientExamById = async (data) => {
    console.log(data)
    return new Promise(async (resolve, reject) => {
        try {
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
let getPatientExamsByPatientId = async (patientId) => {
    return new Promise(async (resolve, reject) => {
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

let getDetailPatientExamsByPatientId = async (patientId, dateBooking, timeBooking) => {
    return new Promise(async (resolve, reject) => {
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
