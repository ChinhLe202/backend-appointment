import db from "./../models";

//Lấy thông tin chi tiết về một chuyên khoa theo ID, bao gồm:
// -Thông tin chuyên khoa (id, bame, image, description)
// -Bài viết liên quan đến chuyên khoa (title, contentHTML)
// -Danh sách các địa điểm (id, name)
let getSpecializationById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            let specialization = await db.Specialization.findOne({
                where: { id: id },
                attributes: ['id', 'name', 'image', 'description'],
            });
            //Nếu ko tìm thấy chuyên khoa thì reject
            if (!specialization) {
                reject("Can't get specialization-id: " + id);
            }
            //Tìm bài viết liên quan đến chuyên khoa
            let post = await db.Post.findOne({
                where: { forSpecializationId: id },
                attributes: ['id', 'title', 'contentHTML']
            });

            //Lấy danh sách các địa điểm (nơi khám)
            let places = await db.Place.findAll({
                attributes: ['id', 'name']
            });

            //Trả kết quả bao gồm chuyên khoa, bài viết, danh sách nơi khám
            resolve({
                specialization: specialization,
                post: post,
                places: places
            });
        } catch (err) {
            reject(err);
        }
    })
};

//Lấy danh sách tất cả các chuyên khoa
let getAllSpecializations = () => {
    return new Promise(async(resolve, reject) => {
        try {
            let listSpecializations = await db.Specialization.findAll({
                attributes: ['id', 'name', 'image', 'description'],
                order: [
                    ['name', 'ASC']
                ],
            });
            console.log('data')
            resolve(listSpecializations);
        } catch (e) {
            reject(e);
        }
    });
};

//Xóa chuyên khoa theo ID, đồng thời xóa tất cả bác sĩ có chuyên khoa đó
let deleteSpecializationById = (id) => {
    return new Promise(async(resolve, reject) => {
        try {
            //Xóa chuyên khoa
            await db.Specialization.destroy({
                where: { id: id }
            });
            //Tìm tất cả các bác sĩ thuộc chuyên khoa đó
            let infos = await db.Doctor_User.findAll({
                where: {
                    specializationId: id
                }
            });
            //Lấy danh sách id của các bác sĩ để xóa
            let arrId = [];
            infos.forEach((x) => {
                arrId.push(x.id);
            });
            //Xóa bác sĩ theo danh sách id đã lấy
            await db.Doctor_User.destroy({ where: { id: arrId } });
            resolve(true);

        } catch (e) {
            reject(e);
        }
    });
};

module.exports = {
    getSpecializationById: getSpecializationById,
    getAllSpecializations: getAllSpecializations,
    deleteSpecializationById: deleteSpecializationById
};