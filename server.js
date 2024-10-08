const express = require("express");
const oApp = express();
const port = 5000;



const firebaseAdmin = require("firebase-admin");
const credentials = require("./firebase.json");


firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(credentials)
});


const appointmentRouter = require("./router/appointmentRouter");
oApp.use("/appointment", appointmentRouter);



oApp.listen(port, () => {
    console.log(`Application started listening on port - ${port}`)
})