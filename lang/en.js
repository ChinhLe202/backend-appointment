export const transValidation = {
    email_incorrect: "Invalid email",
    gender_incorrect: "Invalid gender",
    password_incorrect: "Password must have at least 6 characters",
    password_confirmation_incorrect: "The confirm password is not correct",
};

export const transMailBookingNew = {
    subject: "Email thông báo đặt lịch khám bệnh",
    template: (data) => {
        return `<h3>Cảm ơn bạn đã đặt lịch khám bệnh! </h3>
        <h4>Thông tin lịch khám:</h4>
        <div>Tên bác sĩ: ${data.doctor} </div>
        <div>Thời gian: ${data.time}</div>
        <div>Ngày: ${data.date}</div>
        <div>Trạng thái: <b> Đang chờ xử lý - Lịch khám đang chờ xác nhận</b></div>
        <h4>Hệ thống sẽ gửi mail sau khi lịch khám của bạn được xác nhận. Cảm ơn bạn !</h4>`;
    },
};

export const transMailBookingFailed = {
    subject: "Email thông báo lịch đã bị hủy bỏ",
    template: (data) => {
        return `<h3>Cảm ơn bạn đã đặt lịch khám bệnh, nhưng chúng tôi rất tiếc vì phải hủy lịch  </h3>
        <h4>Thông tin lịch khám bệnh:</h4>
        <div>Tên bác sĩ: ${data.doctor} </div>
        <div>Thời gian: ${data.time}</div>
        <div>Ngày: ${data.date}</div>
        <div>Trạng thái: <b>Đã hủy - ${data.reason}</b></div>
        <h4>Nếu có vấn đề muốn phản hồi vui lòng liên hệ với nhân viên hỗ trợ qua hotline: 0999 999 999. Xin cảm ơn!</h4>`;
    },
};

export const transMailBookingSuccess = {
    subject: "Email thông báo lịch đã được xác nhận",
    template: (data) => {
        return `<h3>Cảm ơn bạn đã đặt lịch khám bệnh </h3>
        <h4>Thông tin lịch khám bệnh:</h4>
        <div>Tên bác sĩ: ${data.doctor} </div>
        <div>Thời gian: ${data.time}</div>
        <div>Ngày: ${data.date}</div>
        <div>Trạng thái: <b>Đã xác nhận</b></div>
        <h4>Xin chân thành cảm ơn !</h4>`;
    },
};

export const transMailRemedy= {
    subject: "Email sending the medical invoice from the doctor",
    template: (data) => {
        return `<h3>Thank you for your trust in booking a medical examination in DoctorCare's system.</h3>
        After you have seen the doctor's office <b> ${data.doctor} </b>, you can review the billing details from this email attachment. </h4>
        <div>The password for extracting attachments has the following form: <i>Full name without accent - 3 digits first phone number - last 2 digits of your birth year</div>
        <br>
        <div>For example: Full name: Hary Pham, with the registered phone number: 0123456789 and born: 1910, the extracted password is: <b> harypham-012-10 </b> </div>
        <br>
        <div>In the event of neither receiving attachments nor decompressing, please contact the support operator<b>911 911</b></div>
        <h4>Thank you !</h4>`;
    },
};
