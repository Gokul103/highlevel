const express = require('express');
const oApp = express();

const port = 5000;

oApp.listen(port, () => {
    console.log(`Application started listening on port - ${port}`)
})