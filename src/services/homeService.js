import db from "./../models";
import removeMd from "remove-markdown";
import helper from "../helper/client";
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

require('dotenv').config();

// Lấy toàn bộ chuyên khoa trong hệ thống
let getSpecializations = () => {
    return new Promise((async(resolve, reject) => {
        try {
            let specializations = await db.Specialization.findAll();
            resolve(specializations);
        } catch (e) {
            reject(e);
        }
    }));
};

//Lấy toàn bộ phòng khám trong hệ thống
let getClinics = () => {
    return new Promise((async(resolve, reject) => {
        try {
            let clinics = await db.Clinic.findAll();
            resolve(clinics);
        } catch (e) {
            reject(e);
        }
    }));
};

//Lấy danh sách các bài đăng y khoa (bài viết ko dành riêng cho bác sĩ, chuyên khoa, hay phòng khám nào)
let getDoctors = () => {
    return new Promise((async(resolve, reject) => {
        resolve(true)

    }));
};

let getPosts = (LIMIT_POST) => {
    return new Promise(async(resolve, reject) => {
        try {
            //chỉ get bài đăng y khoa
            let posts = await db.Post.findAll({
                where: {
                    forDoctorId: -1,
                    forSpecializationId: -1,
                    forClinicId: -1
                },
                order: [
                    ['createdAt', 'DESC']
                ],
                limit: LIMIT_POST,
                attributes: ['id', 'title', 'contentHTML', 'contentMarkdown']
            });

            //Chuyển đổi nội dung markdown sang plain text để hiển thị ngắn gọn
            await Promise.all(posts.map(async(post) => {
                let content = removeMd(post.contentMarkdown);
                post.setDataValue('content', content);
                return post;
            }));

            resolve(posts);
        } catch (e) {
            reject(e);
        }
    });
};

//Tìm kiếm trên trang chủ theo từ khóa, trả về danh sách bác sĩ. chuyên khoa và phòng khám phù hợp
let postSearchHomePage = (keyword) => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctors = await db.User.findAll({
                where: {
                    roleId: 2,
                    name: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                attributes: ['id', 'name']
            });

            let specializations = await db.Specialization.findAll({
                where: {
                    name: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                attributes: ['id', 'name']
            });

            let clinics = await db.Clinic.findAll({
                where: {
                    name: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                attributes: ['id', 'name']
            });

            resolve({
                doctors: doctors,
                specializations: specializations,
                clinics: clinics
            })
        } catch (e) {
            console.log(e);
            reject(e);
        }
    });
};

//Lấy dữ liệu hiển thị cho trang tất cả phòng khám
let getDataPageAllClinics = () => {
    return new Promise(async(resolve, reject) => {
        try {
            let clinics = db.Clinic.findAll({
                attributes: ['id', 'name', "image"]
            });

            resolve(clinics);
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy dữ liệu hiển thị cho trang tất cả bác sĩ
let getDataPageAllDoctors = () => {
    return new Promise(async(resolve, reject) => {
        try {
            let doctors = await db.User.findAll({
                where: {
                    roleId: 2
                },
                attributes: ['id', 'name', 'avatar']
            });

            resolve(doctors);
        } catch (e) {
            reject(e);
        }
    });
};

//Lấy dữ liệu hiển thị cho trang tất cả chuyên khoa
let getDataPageAllSpecializations = () => {
    return new Promise(async(resolve, reject) => {
        try {
            let specializations = await db.Specialization.findAll({
                attributes: ['id', 'name', "image"]
            });
            resolve(specializations);
        } catch (e) {
            reject(e);
        }
    });
};


module.exports = {
    getSpecializations: getSpecializations,
    getClinics: getClinics,
    getDoctors: getDoctors,
    getPosts: getPosts,
    postSearchHomePage: postSearchHomePage,
    getDataPageAllClinics: getDataPageAllClinics,
    getDataPageAllDoctors: getDataPageAllDoctors,
    getDataPageAllSpecializations: getDataPageAllSpecializations
};