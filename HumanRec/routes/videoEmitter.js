const cv = require('opencv2');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const MjpegCam = require('mjpeg-camera');
const settings = require('../Settings.js');
const AmazonService = require('./AmazonRekognition.js');

// Camera properties
//const camWidth = 320;
//const camHeight = 240;
const camWidth = 1280;
const camHeight = 720;

// Face detection properties
const rectColor = [0, 0, 255];  //red
const rectThickness = 1;

// Sockets to send data to history and individuals pages
let historySocket = null;
let individualsSocket = null;

module.exports.setHistorySocket = function(socket) {
    historySocket = socket;
};

module.exports.setIndividualsSocket = function(socket) {
    individualsSocket = socket;
};

module.exports.sendFrames = function(socket, cameraNum, camInterval) {
    if (isNaN(parseInt(cameraNum))) {   // IPCamera - cameraNum contains the camera link (mjpeg)
        const IPCam = new MjpegCam({
            name: 'IPCam',              // Should be asked when camera is added
            user: 'root',
            password: 'humanrec',
            url: cameraNum,
            motion: true
        });
        setInterval(function() {
            IPCam.getScreenshot(function(err, im) {
                if (err) {
                    throw err;
                }
                const tmpImgName = 'D:\\WebstormProjects\\HumanRec\\routes\\capturedFrames\\' + new Date().toISOString().replace(/:|\./g, '_') + cameraNum.replace(/:|=|\?|\/|\./g, '_') + '.jpeg';
                fs.writeFileSync(tmpImgName, im);
                cv.readImage(tmpImgName, function(err, im) {
                    if (err) {
                        throw err;
                    } else if (!im.empty()) {
                        //fs.unlinkSync(tmpImgName);
                        detectAndRecognize(socket, im, cameraNum, false);
                    }
                });
            });
        }, camInterval);

    } else {                            // Webcam - cameraNum contains the index like 0, 1, 2 used by OpenCV
        const camera = new cv.VideoCapture(parseInt(cameraNum));
        camera.setWidth(camWidth);
        camera.setHeight(camHeight);
        setInterval(function() {
            camera.read(function(err, im) { //im = [object Matrix]
                if (err) {
                    throw err;
                } else if (!im.empty()) {
                    if (parseInt(camInterval)/1000 >= 1) {
                        im.save('D:\\WebstormProjects\\HumanRec\\routes\\capturedFrames\\' + new Date().toISOString().replace(/:|\./g, '_') + cameraNum.replace(/:|=|\?|\/|\./g, '_') + '.jpeg');

                        /*const Jimp = require('jimp');
                        const filename = 'D:\\WebstormProjects\\HumanRec\\routes\\capturedFrames\\' + new Date().toISOString().replace(/:|\./g, '_') + cameraNum.replace(/:|=|\?|\/|\./g, '_') + '.jpeg';
                        im.save(filename);
                        Jimp.read(filename, function(err, img) {
                            if (err) throw err;
                            img.brightness(0.6);
                            img.write(filename, function() {
                                cv.readImage(filename, function(err, im) {
                                    if (err) {
                                        throw err;
                                    } else if (!im.empty()) {
                                        //fs.unlinkSync(tmpImgName);
                                        detectAndRecognize(socket, im, cameraNum, false);
                                    }
                                });
                            });
                        });*/

                        detectAndRecognize(socket, im, cameraNum, true);
                    } else {
                        socket.emit('frame', {buffer: im.toBuffer()});
                    }
                }
            });
        }, camInterval);
    }
};

function checkFilters(historicalRow, recognizedFaceID) {
    const filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    if (filters.tracking.includes(recognizedFaceID)) {
        if (!historics.hasOwnProperty(recognizedFaceID)) {
            historics[recognizedFaceID] = [];
        }
        historics[recognizedFaceID].push(historicalRow);
    }
    if (    historySocket !== null &&
        recognizedFaceID == filters.identifier &&
        parseFloat(historicalRow.similarity) > parseFloat(filters.similarity) &&
        filters.cameras.includes(historicalRow.camera)) {
        historySocket.emit('historicalRow', historicalRow);
    }
    // TODO - Check de from et to
}

function detectAndRecognize(socket, im, cameraNum, isWebcam) {
    const fullImage = im.clone();
    const amazonService = new AmazonService();
    amazonService.detectFaces(im.toBuffer(), function(detectedFaces) {
        for (let i = 0; i < detectedFaces.FaceDetails.length; i++) {
            const boundingBox = detectedFaces.FaceDetails[i].BoundingBox;
            const left = (boundingBox.Left < 0) ? 0 : boundingBox.Left;
            const top = (boundingBox.Top < 0) ? 0 : boundingBox.Top;
            const width = ((boundingBox.Left + boundingBox.Width) > 1) ? (1 - boundingBox.Left) : boundingBox.Width;
            const height = ((boundingBox.Top + boundingBox.Height) > 1) ? (1 - boundingBox.Top) : boundingBox.Height;
            im.rectangle([left*im.width(), top*im.height()], [width*im.width(), height*im.height()], rectColor, rectThickness);

            im.save('D:\\WebstormProjects\\HumanRec\\routes\\capturedFramesWithDetection\\' + new Date().toISOString().replace(/:|\./g, '_') + cameraNum.replace(/:|=|\?|\/|\./g, '_') + '.jpeg');

            const faceCutImg = fullImage.crop(left*im.width(), top*im.height(), width*im.width(), height*im.height());
            console.log('faceCutImg.width : ' + faceCutImg.width());
            console.log('faceCutImg.height : ' + faceCutImg.height());
            const smallestDimension = (faceCutImg.width() < faceCutImg.height()) ? faceCutImg.width() : faceCutImg.height();
            const resizingFactor = (smallestDimension < 80) ? 80/faceCutImg.width() : 1;
            faceCutImg.resize(faceCutImg.width()*resizingFactor, faceCutImg.height()*resizingFactor);

            const bufferedFaceCutImg = faceCutImg.toBuffer();
            amazonService.recognizeFace(bufferedFaceCutImg, settings.collectionID, function(recognizedFace) {
                if (recognizedFace.FaceMatches.length === 0) {
                    const unknownIndividual = {
                        image: bufferedFaceCutImg,
                        IDName: 'ID_' + uuidv4()
                    };
                    console.log('individualsSocket : ' + individualsSocket);
                    if (individualsSocket !== null) {
                        console.log('Individual emitted');
                        individualsSocket.emit('unknownIndividualRow', JSON.stringify(unknownIndividual));
                    }
                } else {
                    const recognizedFaceID = recognizedFace.FaceMatches[0].Face.ExternalImageId;
                    console.log(recognizedFaceID);
                    const cameras = JSON.parse(fs.readFileSync('routes/cameras.txt'));
                    let cameraName;
                    for (let j = 0; j < cameras.length; j++) {
                        if ((isWebcam && (parseInt(cameras[j].cameraNum) === parseInt(cameraNum))) || (!isWebcam && (cameras[j].IPAddr === cameraNum))) {
                            cameraName = cameras[j].cameraName;
                            break;
                        }
                    }
                    const historicalRow = {
                        fullImage: JSON.parse(JSON.stringify(fullImage.toBuffer())),
                        detectedFace: bufferedFaceCutImg,
                        similarity: recognizedFace.FaceMatches[0].Similarity,
                        camera: cameraName,
                        state: 'has to be defined',
                        date: new Date().toLocaleString({month: 'numeric', day: 'numeric'})
                    };
                    checkFilters(historicalRow, recognizedFaceID);
                }
            });
        }
        socket.emit('frame', {buffer: im.toBuffer()});
    });

    // OpenCV face detection
    /*im.detectObject('./node_modules/opencv/data/haarcascade_frontalface_alt2.xml', {}, function (err, faces) {
        if (err) throw err;
        for (let i = 0; i < faces.length; i++) {
            const face = faces[i];
            im.rectangle([face.x, face.y], [face.width, face.height], rectColor, rectThickness);
        }
        socket.emit('frame', {buffer: im.toBuffer()});
    });*/
}

// The big file is only read at initialization and written at the process exit
process.stdin.resume();
let historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
module.exports.getHistorics = function() {
    return historics;
};
function exitHandler(options, err) {
    fs.writeFileSync('routes/historics.txt', JSON.stringify(historics));
    console.log('process exited');
    process.exit();
}
process.on('exit', exitHandler.bind(null,{cleanup:true}));              //do something when app is closing
process.on('SIGINT', exitHandler.bind(null, {exit:true}));              //catches ctrl+c event
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));   //catches uncaught exceptions