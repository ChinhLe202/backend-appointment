import db from "./../models";

const Sequelize = require('sequelize');
const Op = Sequelize.Op;
import moment from "moment";
import patientService from "./patientService";
import mailer from "../config/mailer";
import { transMailRemedy } from "../../lang/en";

var Minizip = require('minizip-asm.js');
var fs = require("fs");
const PATH_ZIP = "src/public/images/patients/remedy/zip";
let maxBooking = 2;
const statusPendingId = 3;
const statusFailedId = 2;
const statusSuccessId = 1;
const statusNewId = 4;
const statusDone = 5;

//Lấy thông tin chi tiết bác sĩ theo id, bao gồm lịch làm việc trong ngày hiện tại, chuyên khoa và đánh giá
let getDoctorWithSchedule = (id, currentDate) => {
    return new Promise((async(resolve, reject) => {
        //select with condition: chọn ngày hiện tại mà tổng đặt đang nhỏ hơn max
        try {
            //Tìm bác sĩ theo id, loại bỏ mật khẩu
            //Bao gồm lịch làm việc có ngày hiện tại và số lượt đặt < maxBooking
            //Bao gồm thông tin chuyên khoa. phòng khám và các đánh giá đã được duyệt
            let doctor = await db.User.findOne({
                where: { id: id },
                attributes: {
                    exclude: ['password']
                },
                include: [{
                        model: db.Schedule,
                        required: false,
                        where: {
                            date: currentDate,
                            sumBooking: {
                                [Op.lt]: maxBooking
                            }
                        }
                    }, {
                        model: db.Doctor_User,
                        attributes: ['specializationId', 'clinicId']
                    },
                    {
                        model: db.Comment,
                        where: { status: true },
                        attributes: ['id', 'timeBooking', 'dateBooking', 'name', 'content', 'createdAt', 'status'],
                        required: false
                    }
                ]
            });

            if (!doctor) {
                reject(`Can't get doctor with id = ${id}`);
            }

            //Lấy thông tin chuyên khoa từ specializationId
            let specializationId = doctor.Doctor_User.specializationId;
            let specialization = await getSpecializationById(specializationId);

            //Lấy thông tin địa chỉ phòng khám từ clinicId
            let clinicId = doctor.Doctor_User.clinicId;
            let clinic = await db.Clinic.findOne({
                where: { id: clinicId },
                attributes: ['address']
            });

            //Xác định thời điểm hiện tại để xử lý disable các lịch đã quá giờ
            let date = new Date();
            let currentHour = `${date.getHours()}:${date.getMinutes()}`;
            let timeNow = moment(`${currentDate} ${currentHour}`, "DD/MM/YYYY hh:mm").toDate();

            //gán thuộc tính isDisable cho mỗi schedule nếu giờ hiện tại đã qua giờ bắt đầu của schedule
            doctor.Schedules.forEach((schedule, index) => {
                let startTime = schedule.time.split('-')[0];
                let timeSchedule = moment(`${schedule.date} ${startTime}`, "DD/MM/YYYY hh:mm").toDate();
                //isDisable nếu time hiện tại > time kế hoạch
                schedule.setDataValue('isDisable', timeNow > timeSchedule);

            });


            //Trả về thông tin bác sĩ, chuyên khoa và phòng khám
            resolve({
                doctor: doctor,
                specialization: specialization,
                clinic: clinic
            });
        } catch (e) {
            reject(e);
        }
    }));
};

//Lấy bài viết gần nhất được gán riêng cho bác sĩ theo id
let getPostForDoctor = (id) => {
    return new Promise((async(resolve, reject) => {
        try {
            let post = await db.Post.findOne({
                where: { forDoctorId: id },
                order: [
                    ['createdAt', 'DESC']
                ], //Lấy bài mới nhất
                attributes: ['id', 'title', 'contentHTML']
            });
            resolve(post);
        } catch (e) {
            reject(e);
        }
    }));
};
//Tạo mới các lịch làm việc cho bác sĩ với mảng thời gian và giới hạn lượt đặt
let postCreateSchedule = (user, arrSchedule, maxBooking) => {
    return new Promise((async(resolve, reject) => {
        try {
            //Tạo từng lịch theo mảng lịch được gửi từ client
            let schedule = await Promise.all(arrSchedule.map(async(schedule) => {
                await db.Schedule.create({
                    'doctorId': user.id,
                    'date': schedule.date,
                    'time': schedule.time,
                    'maxBooking': maxBooking,
                    'sumBooking': 0,
                    'createdAt': Date.now()
                })
            }));
            resolve(schedule);
        } catch (err) {
            reject(err);
        }
    }));
};

//Tạo mới 1 bệnh nhân(bản ghi trong bảng Patient)
let createPatient = (item) => {
    return new Promise((async(resolve, reject) => {
        try {
            let patient = await db.Patient.create(item);

            resolve(patient);
        } catch (e) {
            reject(e);
        }
    }));
};
//Lấy danh sách lịch khám của bác sĩ theo ngày, chỉ lấy lịch chưa đầy số lượng đặt khám (sumBooking < maxBooking)
let getScheduleDoctorByDate = (id, date) => {
    return new Promise((async(resolve, reject) => {
        try {
            //Lấy tất cả các lịch khám của bác sĩ thoe ngày
            let schedule = await db.Schedule.findAll({
                where: {
                    doctorId: id,
                    date: date,
                    sumBooking: {
                        [Op.lt]: maxBooking
                    }
                },
                order: [
                    ['id', 'ASC']
                ]
            });
            //Lấy thông tin bác sĩ theo ID
            let doctor = await getDoctorById(id);

            //Tính thời gian hiện tại
            let dateNow = new Date();
            let currentDate = moment().format('DD/MM/YYYY');
            let currentHour = `${dateNow.getHours()}:${dateNow.getMinutes()}`;
            let timeNow = moment(`${currentDate} ${currentHour}`, "DD/MM/YYYY hh:mm").toDate();

            //Đánh dấu các lịch khám đã qua là isDisable = true
            schedule.forEach((sch, index) => {
                let startTime = sch.time.split('-')[0];
                let timeSchedule = moment(`${sch.date} ${startTime}`, "DD/MM/YYYY hh:mm").toDate();
                //isDisable nếu time hiện tại > time kế hoạch
                sch.setDataValue('isDisable', timeNow > timeSchedule);

            });

            resolve({
                schedule: schedule,
                doctor: doctor
            });
        } catch (e) {
            reject(e);
        }
    }));
};
//Lấy thông tin bác sĩ theo ID, chỉ khi roleId = 2
let getDoctorById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctor = await db.User.findOne({
                where: { id: id, roleId: 2 }
            });
            resolve(doctor);
        } catch (e) {
            reject(e);
        }
    });
};
//Lấy chuyên khoa theo ID
let getSpecializationById = (id) => {
    return new Promise((async(resolve, reject) => {
        try {
            let specialization = await db.Specialization.findOne({ where: { id: id } });
            resolve(specialization);
        } catch (e) {
            reject(e);
        }
    }));
};
//Lấy danh sách bác sĩ thuộc chuyên khoa theo ID và kèm lịch khám của từng bác sĩ trong ngày
let getDoctorsForSpecialization = (id, date) => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctors = await db.Doctor_User.findAll({
                where: { specializationId: id },
                attributes: ['specializationId'],
                include: {
                    model: db.User,
                    attributes: ['id', 'name', 'avatar', 'address', 'description']
                }
            });

            //get schedule each doctor
            //Lấy lịch khám cho từng bác sĩ
            await Promise.all(doctors.map(async(doctor) => {
                let schedule = await db.Schedule.findAll({
                    where: {
                        doctorId: doctor.User.id,
                        date: date,
                        sumBooking: {
                            [Op.lt]: maxBooking
                        }
                    },
                    attributes: ['id', 'date', 'time']
                });


                //Xác định thời gian hiện tại
                let dateNow = new Date();
                let currentDate = moment().format('DD/MM/YYYY');
                let currentHour = `${dateNow.getHours()}:${dateNow.getMinutes()}`;
                let timeNow = moment(`${currentDate} ${currentHour}`, "DD/MM/YYYY hh:mm").toDate();

                //Đánh dấu các lịch đã qua là Disable
                schedule.forEach((sch, index) => {
                    let startTime = sch.time.split('-')[0];
                    let timeSchedule = moment(`${sch.date} ${startTime}`, "DD/MM/YYYY hh:mm").toDate();
                    //isDisable nếu time hiện tại > time kế hoạch
                    sch.setDataValue('isDisable', timeNow > timeSchedule);

                });


                //Gán lịch khám vào object doctor
                doctor.setDataValue('schedule', schedule);
            }));
            resolve(doctors)
        } catch (e) {
            reject(e);
        }
    });
};
//Lấy thông tin bác sĩ chi tiết bao gồm thông tin chuyên khoa và phòng khám
let getInfoDoctorById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctor = await db.User.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'avatar', 'address', 'phone', 'description'],
                include: {
                    model: db.Doctor_User,
                    attributes: ['clinicId', 'specializationId']
                }
            });

            //Lấy tên chuyên khoa
            let specialization = await db.Specialization.findOne({
                where: { id: doctor.Doctor_User.specializationId },
                attributes: ['name']
            });
            //Lấy tên phòng khám
            let clinic = await db.Clinic.findOne({
                where: { id: doctor.Doctor_User.clinicId },
                attributes: ['name']
            });

            //Gán thông tin vào đối tượng doctor
            doctor.setDataValue('specializationName', specialization.name);
            doctor.setDataValue('clinicName', clinic.name);
            resolve(doctor);
        } catch (e) {
            reject(e);
        }
    });
};
//Xóa thông tin bác sĩ theo ID, bao gồm cả bảng Doctor_User nếu tồn tại
let deleteDoctorById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Xóa User
            await db.User.destroy({
                where: { id: id }
            });

            //Tìm bảng liên kết Doctor_User và xóa nếu có
            let doctor = await db.Doctor_User.findOne({
                where: { doctorId: id }
            });
            if (doctor) {
                await db.Doctor_User.destroy({ where: { id: doctor.id } });
            }

            resolve('delete successful')
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy thông tin chi tiết bác sĩ để render lên page edit
let getDoctorForEditPage = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Tìm bác sĩ theo id và bao gồm cả thông tin chuyên môn (Doctor_User)
            let doctor = await db.User.findOne({
                where: { id: id },
                include: {
                    model: db.Doctor_User,

                }
            });
            resolve(doctor)
        } catch (e) {
            reject(e);
        }
    });
};

//Cập nhật thông tin bác sĩ. bao gồm cả bảng User và Doctor_User
let updateDoctorInfo = (data) => {
    console.log(data);
    return new Promise(async(resolve, reject) => {
        try {
            //TÌm bác sĩ theo id, bao gồm thông tin chuyên môn (Doctor_User) nếu có
            let doctor = await db.User.findOne({
                where: { id: data.id },
                include: { model: db.Doctor_User, required: false }
            });
            //Cập nhật bảng User
            await doctor.update(data);
            if (doctor.Doctor_User) {
                await doctor.Doctor_User.update(data);
            } else {
                //Nếu chưa có -> tạo mới
                await db.Doctor_User.create({
                    doctorId: data.id,
                    specializationId: data.specializationId,
                    clinicId: data.clinicId
                })
            }

            resolve(true)
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy danh sách bệnh nhân đã đặt lịch khám với bác sĩ trong ngày cụ thể
let getPatientsBookAppointment = (data) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Tìm các bệnh nhân đã đặt lịch, có trạng thái thành công
            let patients = await db.Patient.findAll({
                where: {
                    doctorId: data.doctorId,
                    dateBooking: data.date,
                    statusId: statusSuccessId
                },
                order: [
                    ['updatedAt', 'ASC']
                ],
                attributes: ['id', 'name', 'email', 'phone', 'description', 'gender', 'year', 'address', 'dateBooking', 'timeBooking', 'description', 'isSentForms', 'patientId', 'doctorId']
            });
            resolve(patients);
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy danh sách lịch khám của bác sĩ trong 3 ngày liên tiếp
let getDoctorSchedules = (data) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Tìm tất cả lịch khám của bác sĩ trong danh sách ngày cung cấp
            let schedules = await db.Schedule.findAll({
                where: {
                    doctorId: data.doctorId,
                    date: {
                        [Op.in]: data.threeDaySchedules
                    }, // Op.in là cho phép tìm nhiều giá trị
                },
            });
            resolve(schedules)
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy danh sách địa điểm làm việc (phòng khám) cho bác sĩ
let getPlacesForDoctor = () => {
    return new Promise(async(resolve, reject) => {
        try {
            //Lấy danh sách các địa điểm. chỉ lấy id và tên
            let places = await db.Place.findAll({
                attributes: ['id', 'name']
            });
            resolve(places);
        } catch (e) {
            reject(e);
        }
    })
};
//Loại bỏ dấu tiếng Việt ra khỏi chuỗi, chuyển 'đ' -> 'd', 'Đ' -> 'D'
let removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

//Gửi form đính kèm cho bệnh nhân qua email, đồng thời cập nhật thông tin form đã gửi
let sendFormsForPatient = (id, files) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Lấy thông tin bệnh nhân theo id
            let patient = await patientService.getDetailPatient(id);
            //Lấy thông tin bác sĩ điều trị bệnh nhân đó
            let doctor = await db.User.findOne({
                where: { id: patient.doctorId },
                attributes: ['name', 'avatar'],
            });
            //Tạo mật khẩu nên file từ tên, sđt và năm sinh của bệnh nhân
            let name = removeAccents(patient.name)
                .split(' ')
                .join('')
                .toLowerCase();
            let phone = patient.phone.substring(0, 3);
            let year = patient.year.substring(2, 4);
            let password = `${name}-${phone}-${year}`;
            //Tạo file zip chứa cá file đính kèm có đặt mật khẩu
            let mz = new Minizip();
            files.forEach(file => {
                let fileSendToPatient = fs.readFileSync(file.path);
                mz.append(file.originalname, fileSendToPatient, {
                    password: password,
                });
            });
            //Lưu file zip vào thư mục và đặt tên file
            let nameZip = `${Date.now()}-patientId-${id}.zip`;
            let pathZip = `${PATH_ZIP}/${nameZip}`;
            fs.writeFileSync(pathZip, new Buffer(mz.zip()));
            //Gửi email kềm file zip cho bệnh nhân
            let filename = `Information-invoice-${patient.dateBooking}.zip`;
            let data = { doctor: doctor.name };
            await mailer.sendEmailWithAttachment(
                patient.email,
                transMailRemedy.subject,
                transMailRemedy.template(data),
                filename,
                pathZip
            );
            //Đánh dấu đã gửi form
            await patient.update({
                isSentForms: true,
            });

            //Nếu bệnh nhân có ExtraInfo -> cập nhật danh sách file đã gửi
            if (patient.ExtraInfo) {
                let image = JSON.parse(patient.ExtraInfo.sendForms);
                let count = 0;
                if (image) {
                    count = Object.keys(image).length;
                } else {
                    image = {};
                }

                //Thêm các file mới vào danh sách
                files.forEach((x, index) => {
                    image[count + index] = x.filename;
                });
                await patient.ExtraInfo.update({
                    sendForms: JSON.stringify(image),
                });
            }

            resolve(patient);
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy thông tin bác sĩ để hiển thị ở trang đánh giá phản hồi
let getDoctorForFeedbackPage = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Tìm bác sĩ theo id, chỉ lấy id, name và avatar
            let doctor = await db.User.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'avatar']
            });
            //Nếu ko tìm thấy thì reject lỗi
            if (!doctor) {
                reject(`Can't get feedback with doctorId=${id}`);
            }
            //Trả về thông tin bác sĩ
            resolve(doctor);
        } catch (e) {
            reject(e);
        }
    });
};

//Tạo feedback cho bác sĩ từ bệnh nhân đã đặt lịch thành công
let createFeedback = (data) => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctorId = data.doctorId;
            let phone = data.feedbackPhone;
            //check patient

            //Kiểm tra bệnh nhân có tồn tại và đặt lịch khám thành công hay chưa
            let patient = await db.Patient.findOne({
                where: {
                    doctorId: doctorId,
                    phone: phone,
                    statusId: statusSuccessId
                },
                attributes: ['name', 'timeBooking', 'dateBooking']
            });

            //Nếu có -> tạo phản hồi và lưu vào bảng Comment
            if (patient) {
                let feedback = {
                    doctorId: doctorId,
                    name: patient.name,
                    timeBooking: patient.timeBooking,
                    dateBooking: patient.dateBooking,
                    phone: phone,
                    content: data.feedbackContent,
                    createdAt: Date.now()
                };
                let cm = await db.Comment.create(feedback);
                resolve(cm);
            } else {
                //Nếu ko có bệnh nhân khớp thì trả về thông báo ko tồn tại
                resolve('patient not exist')
            }

        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    getDoctorForFeedbackPage: getDoctorForFeedbackPage,
    getDoctorWithSchedule: getDoctorWithSchedule,
    postCreateSchedule: postCreateSchedule,
    createPatient: createPatient,
    getPostForDoctor: getPostForDoctor,
    getScheduleDoctorByDate: getScheduleDoctorByDate,
    getDoctorsForSpecialization: getDoctorsForSpecialization,
    getInfoDoctorById: getInfoDoctorById,
    deleteDoctorById: deleteDoctorById,
    getDoctorForEditPage: getDoctorForEditPage,
    updateDoctorInfo: updateDoctorInfo,
    getPatientsBookAppointment: getPatientsBookAppointment,
    getDoctorSchedules: getDoctorSchedules,
    getPlacesForDoctor: getPlacesForDoctor,
    sendFormsForPatient: sendFormsForPatient,
    createFeedback: createFeedback,
};