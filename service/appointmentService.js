const firebaseAdmin = require("firebase-admin");
const moment = require("moment-timezone");

const db = firebaseAdmin.firestore();
const { startHours, endHours, duration, timezone } = require("../config.json");



module.exports = {
    getFreeSlots,
    bookSlots,
    getEventsBetweenDates
};

/**
 * 
 * @param {*} date input date (dd-mm-yyyy)
 * @param {*} requestedTimeZone input time zone
 * @returns array of free slots within the provided date
 */
async function getFreeSlots(date, requestedTimeZone) {
    try {
        let freeSlots = [];
        //Find all booked slots in the given date
        let bookedSlots = await getEvents(date, requestedTimeZone);

        //Find availability on the given date
        let requestedStartTime = moment.tz(`${date} 00:00`, 'YYYY-MM-DD HH:mm', requestedTimeZone).utc();
        let requestedEndTime = moment.tz(`${date} 23:59`, 'YYYY-MM-DD HH:mm', requestedTimeZone).utc();
        let utcStartTime = moment.tz(requestedStartTime, timezone).hours(startHours).utc();
        let utcEndTime = moment(utcStartTime).add(endHours - startHours, 'h');


        while (utcStartTime.isBefore(utcEndTime)) {
            //condition to check whether it falls in same date
            if ((utcStartTime.isSame(requestedStartTime) || utcStartTime.isAfter(requestedStartTime)) &&
                utcStartTime.isBefore(requestedEndTime))
                //condition to avoid booked slots
                if (!checkEventClash(bookedSlots, utcStartTime, utcEndTime))
                    freeSlots.push(moment.tz(utcStartTime, requestedTimeZone).format());
            utcStartTime.add(duration, 'minutes');
        }

        return freeSlots;
    } catch (error) {
        throw new Error(error);
    }
}

/**
 * 
 * @param {*} requestObject contains data to book an event such as date, time, time zone, duration of event
 */
async function bookSlots(requestObject) {
    try {
        const date = requestObject.date, startTime = requestObject.time, reqTimezone = requestObject.timezone, duration = requestObject.duration;
        const eventStartTime = moment.tz(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', reqTimezone).utc();
        const eventEndTime = eventStartTime.clone().add(duration, 'minutes').utc();

        let utcStartTime = moment.tz(eventStartTime, timezone).hours(startHours).minutes(0).utc();
        let utcEndTime = moment(utcStartTime).add(endHours - startHours, 'h');

        if (!eventStartTime.isSameOrAfter(utcStartTime) || !eventEndTime.isSameOrBefore(utcEndTime)) {
            throw "No availability from the doctor";
        }


        const eventDocReference = db.collection('events').doc(date);
        const eventDoc = await eventDocReference.get();

        const newSlot = {
            startTime: eventStartTime.format(),
            endTime: eventEndTime.format(),
            params: requestObject
        };


        if (eventDoc.exists) {
            const existingSlots = eventDoc.data().slots;

            if (checkEventClash(existingSlots, eventStartTime, eventEndTime))
                throw "AlreadyExists";
            await eventDocReference.update({
                slots: firebaseAdmin.firestore.FieldValue.arrayUnion(newSlot)
            });
        } else {
            await eventDocReference.set({
                date,
                slots: [newSlot]
            });
        }
        return;
    }
    catch (error) {
        throw new Error(error);
    }
}

async function getEventsBetweenDates(startDate, endDate) {
    try {
        let startTime = moment.tz(startDate, 'YYYY-MM-DD');
        let endTime = moment.tz(endDate, 'YYYY-MM-DD');
        let events = [];
        while (startTime.isSameOrBefore(endTime)) {
            let eventDoc = await db.collection('events').doc(startTime.format('YYYY-MM-DD')).get();
            if (eventDoc.exists) {
                const existingSlots = eventDoc.data().slots;
                events.push(...existingSlots.map(slot => ({
                    startTime: moment.utc(slot.startTime),
                    endTime: moment.utc(slot.endTime)
                })));
            }
            startTime.add(1, 'day');
        };
        return events;
    } catch (error) {
        throw new Error(error);
    }
}




/**
 * 
 * @param {*} date date for which events to be fetched
 * @param {*} timezone timezone for which events to be fetched
 * @returns array of events within given params
 */
async function getEvents(date, timezone) {
    let startTime = moment.tz(`${date} 00:00`, 'YYYY-MM-DD HH:mm', timezone).utc();
    let endTime = moment.tz(`${date} 24:00`, 'YYYY-MM-DD HH:mm', timezone).utc();

    let aPromises = [db.collection('events').doc(startTime.format('YYYY-MM-DD')).get()];

    if (startTime.format('YYYY-MM-DD') !== endTime.format('YYYY-MM-DD'))
        aPromises.push(db.collection('events').doc(endTime.format('YYYY-MM-DD')).get());


    const eventDocs = await Promise.all(aPromises);
    let bookedSlots = [];

    eventDocs.forEach(eventDoc => {
        if (eventDoc.exists) {
            const existingSlots = eventDoc.data().slots;
            bookedSlots.push(...existingSlots.map(slot => ({
                startTime: moment.utc(slot.startTime),
                endTime: moment.utc(slot.endTime)
            })));
        }
    });
    return bookedSlots;
}


/**
 * 
 * @param {*} slots already booked slots
 * @param {*} eventStartTime Start time to be checked for clash
 * @param {*} eventEndTime End time to be checked for clash
 * @returns 
 */
function checkEventClash(slots, eventStartTime, eventEndTime) {
    for (const slot of slots) {
        const existingStartTime = moment.utc(slot.startTime);
        const existingEndTime = moment.utc(slot.endTime);
        if (
            (eventStartTime.isBetween(existingStartTime, existingEndTime, null, '[)')) ||
            (eventEndTime.isBetween(existingStartTime, existingEndTime, null, '(]'))
        ) {
            return true;
        }
    }
    return false;
}






