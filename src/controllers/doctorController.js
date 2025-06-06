import doctorService from "./../services/doctorService";
import userService from "./../services/userService";
import patientExamService from "./../services/patientExamService";
import _ from "lodash";
import moment from "moment";
import multer from "multer";

const MAX_BOOKING = 2;

//Hàm chuyển chuỗi ngày dạng dd/MM/yyyy thành object date
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

//Hàm lấy lịch khám bác sĩ trong 3 ngày tới
let getSchedule = async(req, res) => {
    try {
        let threeDaySchedules = [];
        for (let i = 0; i < 3; i++) {
            let date = moment(new Date()).add(i, 'days').locale('en').format('DD/MM/YYYY');
            threeDaySchedules.push(date);
        }
        let data = {
            threeDaySchedules: threeDaySchedules,
            doctorId: req.user.id
        };
        let schedules = await doctorService.getDoctorSchedules(data);
        //Convert và sắp xếp lịch theo thứ tự ngày
        schedules.forEach((x) => {
            x.date = Date.parse(stringToDate(x.date, "dd/MM/yyyy", "/"))
        });

        schedules = _.sortBy(schedules, x => x.date);

        schedules.forEach((x) => {
            x.date = moment(x.date).format("DD/MM/YYYY")
        });

        return res.render("main/users/admins/schedule.ejs", {
            user: req.user,
            schedules: schedules,
            threeDaySchedules: threeDaySchedules
        })
    } catch (e) {
        console.log(e)
    }
};

//Hàm render form tạo lịch cho bác sĩ
let getCreateSchedule = (req, res) => {
    return res.render("main/users/admins/createSchedule.ejs", {
        user: req.user
    })
};

//Tạo lịch khám mới cho bác sĩ
let postCreateSchedule = async(req, res) => {
    await doctorService.postCreateSchedule(req.user, req.body.schedule_arr, MAX_BOOKING);
    return res.status(200).json({
        "status": 1,
        "message": 'success'
    })
};

//Lấy lịch khám của bác sĩ theo ngày
let getScheduleDoctorByDate = async(req, res) => {
    try {
        let object = await doctorService.getScheduleDoctorByDate(req.body.doctorId, req.body.date);
        let data = object.schedule;
        let doctor = object.doctor;
        return res.status(200).json({
            status: 1,
            message: data,
            doctor: doctor
        });
    } catch (e) {
        console.log(e)
        return res.status(500).json(e);
    }
};

//Lấy thông tin chi tiết của bác sĩ theo ID
let getInfoDoctorById = async(req, res) => {
    try {
        let doctor = await doctorService.getInfoDoctorById(req.body.id);
        return res.status(200).json({
            'message': 'success',
            'doctor': doctor
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};

//Quản lý danh sách cuộc hẹn của bác sĩ trong ngày
let getManageAppointment = async(req, res) => {
    // let date = "30/03/2025";
    let currentDate = moment().format('DD/MM/YYYY');
    let canActive = false;
    let date = '';
    if (req.query.dateDoctorAppointment) {
        date = req.query.dateDoctorAppointment;
        if (date === currentDate) canActive = true;
    } else {
        //get currentDate
        date = currentDate;
        canActive = true;
    }

    let data = {
        date: date,
        doctorId: req.user.id
    };

    let appointments = await doctorService.getPatientsBookAppointment(data);
    // sort by range time
    let sort = _.sortBy(appointments, x => x.timeBooking);
    //group by range time
    let final = _.groupBy(sort, function(x) {
        return x.timeBooking;
    });

    return res.render("main/users/admins/manageAppointment.ejs", {
        user: req.user,
        appointments: final,
        date: date,
        active: canActive
    })
};

//Trả về giao diện thống kê biểu đồ bác sĩ
let getManageChart = (req, res) => {
    return res.render("main/users/admins/manageChartDoctor.ejs", {
        user: req.user
    })
};

//Gửi file đính kèm(phiếu khám) cho bệnh nhân
let postSendFormsToPatient = (req, res) => {
    FileSendPatient(req, res, async(err) => {
        if (err) {
            console.log(err);
            if (err.message) {
                console.log(err.message);
                return res.status(500).send(err.message);
            } else {
                console.log(err);
                return res.status(500).send(err);
            }
        }
        try {

            let patient = await doctorService.sendFormsForPatient(req.body.patientId, req.files);
            return res.status(200).json({
                status: 1,
                message: 'sent files success',
                patient: patient
            })
        } catch (e) {
            console.log(e);
            return res.status(500).send(e);
        }
    });
};

//Cấu hình lưu trữ file cho bệnh nhân
let storageFormsSendPatient = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, "src/public/images/patients/remedy");
    },
    filename: (req, file, callback) => {
        let imageName = `${Date.now()}-${file.originalname}`;
        callback(null, imageName);
    }
});
//Cấu hình middleware multer xử lý upload file
let FileSendPatient = multer({
    storage: storageFormsSendPatient,
    limits: { fileSize: 1048576 * 20 }
}).array("filesSend");

//Tạo dữ liệu cho biểu đồ thống kê bác sĩ
let postCreateChart = async(req, res) => {
    try {
        let object = await userService.getInfoDoctorChart(req.body.month);
        return res.status(200).json(object);
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};

//Tự động tạo cho tất cả bác sĩ
let postAutoCreateAllDoctorsSchedule = async(req, res) => {
        try {
            let data = await userService.createAllDoctorsSchedule();
            return res.status(200).json(data);
        } catch (e) {
            console.log(e);
            return res.status(500).json(e);
        }
    }
    //Lấy danh sách tất cả bác sĩ
let getListDoctors = async(req, res) => {
    try {
        let doctors = await userService.getInfoDoctors(); // Gọi tới hàm getInfoDoctors từ service của bạn
        return res.status(200).json({
            status: 1,
            message: 'success',
            doctors: doctors
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching doctors',
            error: e
        });
    }
};
//Lọc danh sách bác sĩ theo tên, phòng khám, chuyên khoa
let getListDoctorsFilter = async(req, res) => {
    try {
        let clinicId = req.query.clinicId;
        let specializationId = req.query.specializationId;
        let searchText = req.query.searchText;
        let doctors = await userService.getInfoDoctorsFilter(searchText, clinicId, specializationId);
        return res.status(200).json({
            status: 1,
            message: 'success',
            doctors: doctors
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching doctors',
            error: e
        });
    }
};
//Tạo thông tin phiếu khám cho bệnh nhân
let postPatientExam = async(req, res) => {
    try {
        let item = req.body;
        item.createdAt = Date.now();
        console.log(item);
        let patientExam = await patientExamService.createNewPatientExam(item);
        return res.status(200).json({
            status: 1,
            message: 'success',
            patientExam: patientExam
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};

//Cập nhật phiếu khám
let updatePatientExam = async(req, res) => {
    //let examId = req.params.id;  // Lấy id từ params
    let data = req.body; // Lấy thông tin cần cập nhật từ body request

    try {
        let result = await patientExamService.updatePatientExamById(data);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Hàm để lấy danh sách patient_exam theo patientId
let getPatientExams = async(req, res) => {
    let patientId = req.query.patientId; // Lấy patientId từ params
    try {
        let result = await patientExamService.getPatientExamsByPatientId(patientId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
//Hàm lấy chi tiết phiếu bệnh theo bệnh nhân và ngày/giờ khám
let getDetailPatientExam = async(req, res) => {
    let patientId = req.query.patientId;
    let dateBooking = req.query.dateBooking;
    let timeBooking = req.query.timeBooking;
    try {
        let result = await patientExamService.getDetailPatientExamsByPatientId(patientId, dateBooking, timeBooking);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
module.exports = {
    getSchedule: getSchedule,
    getCreateSchedule: getCreateSchedule,
    postCreateSchedule: postCreateSchedule,
    getScheduleDoctorByDate: getScheduleDoctorByDate,
    getInfoDoctorById: getInfoDoctorById,
    getManageAppointment: getManageAppointment,
    getManageChart: getManageChart,
    postSendFormsToPatient: postSendFormsToPatient,
    postCreateChart: postCreateChart,
    postAutoCreateAllDoctorsSchedule: postAutoCreateAllDoctorsSchedule,
    getListDoctors: getListDoctors,
    postPatientExam: postPatientExam,
    getPatientExams: getPatientExams,
    updatePatientExam: updatePatientExam,
    getDetailPatientExam: getDetailPatientExam,
    getListDoctorsFilter: getListDoctorsFilter
};