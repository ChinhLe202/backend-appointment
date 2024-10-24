'use strict';
module.exports = (sequelize, DataTypes) => {
    const patient_exam = sequelize.define('patient_exam', {
        patientId: DataTypes.INTEGER,
        numberVisit: DataTypes.INTEGER,
        dateBooking: DataTypes.STRING,
        statusId: DataTypes.INTEGER,
        timeBooking: DataTypes.STRING,
        exam: DataTypes.STRING,
        prescription: DataTypes.STRING,
        content: DataTypes.STRING,
        createdAt: DataTypes.DATE
    }, {});
    patient_exam.associate = function(models) {
        models.patient_exam.belongsTo(models.Patient, { foreignKey: 'patientId' });
        models.patient_exam.belongsTo(models.Status, { foreignKey: 'statusId' });
    };
    return patient_exam;
};
