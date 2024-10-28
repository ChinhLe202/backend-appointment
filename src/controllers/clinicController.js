import patient from "../models/patient";
import clinicService from "./../services/clinicService";
import specializationService from "./../services/specializationService"
import patientService from "./../services/patientService";

let getInfoClinicById = async (req, res) => {
    try {
        var clinicId = req.query.id;
        let clinic = await clinicService.getClinicById(clinicId);
        return res.status(200).json({
            message: 'get info clinic successful',
            clinic: clinic
        })
    } catch (e) {
        return res.status(500).json(e);
    }
};

let getListClincs = async (req, res) => {
    try {
        let clinics = await clinicService.getListClinics(); // Gọi tới hàm getInfoDoctors từ service của bạn
        return res.status(200).json({
            status: 1,
            message: 'success',
            clinics: clinics
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching clinics',
            error: e
        });
    }
};

let getTop5Clincs = async (req, res) => {
    try {
        let clinics = await clinicService.getTop5Clinics(); // Gọi tới hàm getInfoDoctors từ service của bạn
        return res.status(200).json({
            status: 1,
            message: 'success',
            clinics: clinics
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching clinics',
            error: e
        });
    }
};

let getListSpecializations = async (req, res) => {
    try {
        let specializations = await specializationService.getAllSpecializations(); // Gọi tới hàm getInfoDoctors từ service của bạn
        return res.status(200).json({
            status: 1,
            message: 'success',
            specializations: specializations
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching specializations',
            error: e
        });
    }
};

let getListBookingPatients = async (req, res) => {
    try {
        console.log(req.params.keySearch);
        let patientBookings = await patientService.getListBookingPatient(req.params.keySearch); // Gọi tới hàm getInfoDoctors từ service của bạn
        return res.status(200).json({
            status: 1,
            message: 'success',
            patientBookings: patientBookings
        });
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 0,
            message: 'Error fetching booking',
            error: e
        });
    }
};
module.exports = {
    getInfoClinicById: getInfoClinicById,
    getListClincs: getListClincs,
    getTop5Clincs: getTop5Clincs,
    getListSpecializations: getListSpecializations,
    getListBookingPatients: getListBookingPatients
};
