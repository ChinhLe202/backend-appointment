require('dotenv').config();
import homeService from "../services/homeService";
import userService from "../services/userService";
import supporterService from "../services/supporterService";
import patientService from "../services/patientService";

const statusNewId = 4;
const statusPendingId = 3;
const statusFailedId = 2;
const statusSuccessId = 1;

//Lấy giao diện quản lý bệnh nhân(chờ xác nhận)
let getNewPatients = (req, res) => {
    //render data = js/ getForPatientsTabs
    return res.render('main/users/admins/managePatient.ejs', {
        user: req.user
    })
};
//API lấy tất cả các bài viết đã đăng
let getAllPosts = async(req, res) => {
    try {
        let posts = await supporterService.getAllPosts();
        return res.status(200).json({ "data": posts })
    } catch (e) {
        return res.status(500).json(e);
    }
};
//Giao diện tạo bài viết mới(đổ dữ liệu phòng khám, bác sĩ, chuyên khoa)
let getCreatePost = async(req, res) => {
    let clinics = await homeService.getClinics();
    let doctors = await userService.getInfoDoctors();
    let specializations = await homeService.getSpecializations();
    return res.render('main/users/admins/createPost.ejs', {
        user: req.user,
        clinics: clinics,
        doctors: doctors,
        specializations: specializations
    });
};

//API xử lý gửi form tạo bài viết
let postCreatePost = async(req, res) => {
    try {
        let item = req.body;
        item.writerId = req.user.id;
        item.createdAt = Date.now();
        let post = await supporterService.postCreatePost(item);
        return res.status(200).json({
            status: 1,
            message: post
        })
    } catch (e) {
        return res.status(500).json(e);
    }
};
//Giao diện quản lý danh sách bài viết(phân quyền)
let getManagePosts = async(req, res) => {
    try {
        let role = "";
        if (req.user) {
            if (req.user.roleId === 1) role = "admin";
        }
        let object = await supporterService.getPostsPagination(1, +process.env.LIMIT_GET_POST, role);
        return res.render('main/users/admins/managePost.ejs', {
            user: req.user,
            posts: object.posts,
            total: object.total
        })
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
//API phân trang danh sách bài viết
let getPostsPagination = async(req, res) => {
    try {
        let page = +req.query.page;
        let limit = +process.env.LIMIT_GET_POST;
        if (!page) {
            page = 1;
        }
        let object = await supporterService.getPostsPagination(page, limit);
        return res.status(200).json(object);
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
//Lấy dữ liệu tab bệnh nhân(tab xác nhận, tab đã đặt lịch, tab cancel)
let getForPatientsTabs = async(req, res) => {
    try {
        let object = await patientService.getForPatientsTabs();
        return res.status(200).json({
            'message': 'success',
            'object': object
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
//API thay đổi trạng thái bệnh nhân
let postChangeStatusPatient = async(req, res) => {
    try {
        console.log(req.body);
        let id = req.body.patientId;
        let status = req.body.status;
        let statusId = '';
        let content = '';
        if (status === 'pending') {
            statusId = statusPendingId;
            content = "New appointments have been received";
        } else if (status === 'failed') {
            statusId = statusFailedId;
            if (req.body.reason) {
                content = `${req.body.reason}`;
            }

        } else if (status === 'confirmed') {
            statusId = statusSuccessId;
            content = "The appointment has been successfully booked";
        }


        let data = {
            id: id,
            statusId: statusId,
            updatedAt: Date.now()
        };

        let logs = {
            supporterId: req.user.id,
            patientId: id,
            content: content
        };

        let patient = await patientService.changeStatusPatient(data, logs);
        return res.status(200).json({
            'message': 'success',
            'patient': patient
        })

    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
//Giao diện quản lý bình luận từ khách hàng
let getManageCustomersPage = async(req, res) => {
    try {
        let comments = await patientService.getComments();
        return res.render("main/users/admins/manageCustomer.ejs", {
            user: req.user,
            comments: comments
        });
    } catch (e) {
        console.log(e)
    }
};
//API lấy lịch sử thao tác (log) của bệnh nhân
let getLogsPatient = async(req, res) => {
    try {
        let logs = await patientService.getLogsPatient(req.body.patientId);
        return res.status(200).json(logs);
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
//API đánh dấu bình luận đã xử lý
let postDoneComment = async(req, res) => {
    try {
        let comment = await supporterService.doneComment(req.body.commentId);
        return res.status(200).json(comment);
    } catch (e) {
        console.log(e);
        return res.status(500).json(e);
    }
};
module.exports = {
    getNewPatients: getNewPatients,
    getManagePosts: getManagePosts,
    getCreatePost: getCreatePost,
    postCreatePost: postCreatePost,
    getAllPosts: getAllPosts,
    getPostsPagination: getPostsPagination,
    getForPatientsTabs: getForPatientsTabs,
    postChangeStatusPatient: postChangeStatusPatient,
    getManageCustomersPage: getManageCustomersPage,
    getLogsPatient: getLogsPatient,
    postDoneComment: postDoneComment
};