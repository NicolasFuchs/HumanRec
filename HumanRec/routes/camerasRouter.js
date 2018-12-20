const express = require('express');
const router = express.Router();
const videoApp = express();
const fs = require('fs');

// Creates a server socket to send frames data
router.get('/createCameraSocket', function(req, res) {
    const morgan = require('morgan');
    const configServer = require('./config');
    videoApp.set('port', configServer.httpPort);
    videoApp.use(morgan('dev'));
    try {
        const http = require('http');
        const videoServer = http.createServer(videoApp);
        videoServer.listen(req.query.port, '127.0.0.1');
        videoServer.on('error', function(err) {
            console.log('videoServer error : ' + err);
        });
        let socket = require('socket.io')(videoServer);
        socket.on('connection', function(socket) {
            require('./videoEmitter').sendFrames(socket, req.query.cameraNum, req.query.rate);
        });
    } catch (err) {
        console.log(err);
    }
    res.send('');
});

// Creates the server socket to send historical data
router.post('/createHistorySocket', function(req, res) {
    const http = require('http');
    const historyServer = http.createServer(videoApp);
    historyServer.listen(1025, '127.0.0.1');
    historyServer.on('error', function(err) {
        console.log('historyServer error : ' + err);
    });
    let socket = require('socket.io')(historyServer);
    socket.on('connection', function(socket) {
        require('./videoEmitter').setHistorySocket(socket);
    });
    res.send('History socket set');
});

// Creates the server socket to send individuals data
router.post('/createIndividualsSocket', function(req, res) {
    const http = require('http');
    const individualsServer = http.createServer(videoApp);
    individualsServer.listen(1026, '127.0.0.1');
    individualsServer.on('error', function(err) {
        console.log('unknownServer error : ' + err);
    });
    let socket = require('socket.io')(individualsServer);
    socket.on('connection', function(socket) {
        require('./videoEmitter').setIndividualsSocket(socket);
    });
    res.send('Unknown socket set');
});

// Retrieves all cameras of the system
router.get('/getCameras', function(req, res) {
    res.send(JSON.parse(fs.readFileSync('routes/cameras.txt')));
});

// Adds a camera to the system
router.post('/addCamera', function(req, res) {
    let cameras = JSON.parse(fs.readFileSync('routes/cameras.txt'));
    cameras.push(req.body);
    fs.writeFileSync('routes/cameras.txt', JSON.stringify(cameras));
    res.send('Camera added');
});

// Updates a camera of the system (name)
router.put('/updateCamera', function(req, res) {
    let persistance = JSON.parse(fs.readFileSync('routes/cameras.txt'));
    for (let i = 0; i < persistance.length; i++) {
        if (req.body.oldCameraName === persistance[i].cameraName) {
            persistance[i].cameraName = req.body.newCameraName;
        }
    }
    fs.writeFileSync('routes/cameras.txt', JSON.stringify(persistance));
    let filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    let cameras = filters.cameras;
    cameras.splice(cameras.indexOf(req.body.oldCameraName), 1, req.body.newCameraName);
    fs.writeFileSync('routes/filters.txt', JSON.stringify(filters));
    res.send('Camera updated');
});

// Removes camera(s) from persistance and filters
router.delete('/removeCameras', function(req, res) {
    if (req.body.cameras === undefined) {
        res.send('No camera removed');
    } else {
        let persistance = JSON.parse(fs.readFileSync('routes/cameras.txt'));
        for (let i = 0; i < persistance.length; i++) {
            if (req.body.cameras.includes(persistance[i].cameraName)) {
                persistance.splice(i, 1);
                if (i > 0) {
                    i--;
                }
            }
        }
        fs.writeFileSync('routes/cameras.txt', JSON.stringify(persistance));
        let filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
        const cameras = req.body.cameras;
        for (let i = 0; i < cameras.length; i++) {
            const index = filters.cameras.indexOf(cameras[i]);
            if (index !== -1) {
                filters.cameras.splice(index, 1);
            }
        }
        fs.writeFileSync('routes/filters.txt', JSON.stringify(filters));
        res.send('Camera(s) removed');
    }
});

module.exports.videoApp = videoApp;
module.exports = router;