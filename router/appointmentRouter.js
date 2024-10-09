const express = require("express");
const router = express.Router();
const appointService = require("../service/appointmentService");

router.get("/freeSlots", (req, res) => {
    appointService.getFreeSlots(req.query.date, req.query.timezone)
        .then(response => res.status(200).json(response))
        .catch(error => res.status(400).json(error.message));
});

router.post("/bookSlots", (req, res) => {
    appointService.bookSlots(req.body)
        .then(response => res.status(200).json(response))
        .catch(error => {
            error.message === 'AlreadyExists' ? res.status(422).json(error.message) : res.status(400).json(error.message);
        });
});

router.get("/getEvents", (req, res) => {
    appointService.getEventsBetweenDates(req.query.startDate, req.query.endDate)
        .then(response => res.status(200).json(response))
        .catch(error => res.status(400).json(error.message));
})

module.exports = router;