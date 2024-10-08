const express = require("express");
const router = express.Router();
const appointService = require("../service/appointmentService");

router.get("/getAppointmentDetails", (req, res) => {
    appointService.getAppointmentDetails()
        .then(response => res.status(200).json(response))
        .catch(error => res.status(400).json(error));
});

module.exports = router;