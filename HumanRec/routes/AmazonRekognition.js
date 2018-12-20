const settings = require('../Settings.js');
const IRecognition = require('./IRecognition.js');
const AWS = require('aws-sdk');

class AmazonRekognition extends IRecognition {

    constructor() {
        super();
        this.rekognition = new AWS.Rekognition({
            region: settings.region,
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        });
    }

    createCollection(collectionId, callback) {
        const params = {
            CollectionId: collectionId
        };
        this.rekognition.createCollection(params, function(err, data) {
            if (err) {
                // console.log(err, err.stack);
                console.log('createCollection issue');
            } else {
                callback(data);
            }
        });
    }

    deleteCollection(collectionId, callback) {
        const params = {
            CollectionId: collectionId
        };
        this.rekognition.deleteCollection(params, function(err, data) {
            if (err) {
                // console.log(err, err.stack);
                console.log('deleteCollection issue');
            } else {
                callback(data);
            }
        });
    }

    detectFaces(base64ImgWithoutPrefix, callback) {
        const bytes = new Buffer(base64ImgWithoutPrefix, 'base64');
        const params = {
            Image: {
                Bytes: bytes
            }
        };
        this.rekognition.detectFaces(params, function(err, data) {
            if (err) {
                // console.log(err, err.stack);
                console.log('detectFaces issue');
            } else {
                callback(data);
            }
        });
    }

    recognizeFace(base64ImgWithoutPrefix, collectionId, callback) {
        const bytes = new Buffer(base64ImgWithoutPrefix, 'base64');
        const params = {
            CollectionId: collectionId,
            Image: {
                Bytes: bytes,
            },
            FaceMatchThreshold: parseFloat(settings.FaceMatchThreshold),
            MaxFaces: 1
        };
        this.rekognition.searchFacesByImage(params, function(err, data) {
            if (err)  {
                // console.log(err, err.stack);
                console.log('searchFacesByImage issue');
            } else {
                callback(data);
            }
        });
    }

    addFace(collectionId, externalImageId, imageBytes, callback) {
        const params = {
            CollectionId: collectionId,
            DetectionAttributes: [],
            ExternalImageId: externalImageId,
            Image: {
                Bytes: imageBytes
            }
        };
        this.rekognition.indexFaces(params, function(err, data) {
            if (err) {
                // console.log(err, err.stack);
                console.log('IndexFaces issue');
            } else if (data.FaceRecords.length !== 0) {
                callback(data);
            }
        });
    }

    deleteFaces(collectionId, faceIds, callback) {
        const params = {
            CollectionId: collectionId,
            FaceIds: faceIds
        };
        this.rekognition.deleteFaces(params, function(err) {
            if (err) {
                // console.log(err, err.stack);
                console.log('deleteFaces issue');
            } else {    //if (data.DeletedFaces.length !== 0) {
                callback();
            }
        });
    }

}

module.exports = AmazonRekognition;