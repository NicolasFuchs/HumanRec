const express = require('express');
const router = express.Router();
const fs = require('fs');

const settings = require('../Settings.js');
const AmazonService = require('./AmazonRekognition.js');
const amazonService = new AmazonService();

// Retrieves one specific individual (Individual details part display)
router.get('/getOneIndividual', function(req, res) {
    const individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    res.send(individuals[req.query.identifier]);
});

// Retrieves all detected individuals (Detected Individuals part display)
router.get('/getAllIndividuals', function(req, res) {
    res.send(JSON.parse(fs.readFileSync('routes/individuals.txt')));
});

// Adds a new individual to the system (automatic or manual mode)
router.post('/addIndividual', function(req, res) {
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    individuals[req.body.identifier] = {age: req.body.age, description: req.body.description, comment: req.body.comment, known: req.body.known, tracking: req.body.tracking, images: []};
    fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
    addImgs(0, req.body, function() {
        res.send('Individual added');
    });
});

// Updates an individual in the system (information only, no image)
router.put('/updateIndividual', function(req, res) {
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    if (req.body.hasOwnProperty('tracking')) {
        individuals[req.body.identifier].tracking = req.body.tracking;
        fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
        res.send('Individual updated');
    } else {
        individuals[req.body.oldIdentifier].age = req.body.newAge;
        individuals[req.body.oldIdentifier].description = req.body.newDescription;
        individuals[req.body.oldIdentifier].comment = req.body.newComment;
        fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
        if (req.body.oldIdentifier === req.body.newIdentifier) {
            res.send('Individual updated');
        } else {
            let images = []; let faceIDs = [];
            for (let i = 0; i < individuals[req.body.oldIdentifier].images.length; i++) {
                images.push(individuals[req.body.oldIdentifier].images[i].base64Img);
                faceIDs.push(individuals[req.body.oldIdentifier].images[i].faceId);
            }
            deleteImgs(faceIDs, [req.body.oldIdentifier], true, function() {
                let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
                individuals = JSON.parse(JSON.stringify(individuals).replace(req.body.oldIdentifier, req.body.newIdentifier));
                individuals[req.body.newIdentifier].known = 'yes';
                fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
                addImgs(0, {
                    identifier: req.body.newIdentifier,
                    images: images
                }, function() {
                    res.send('Individual updated');
                });
            });
        }
    }
});

// Removes an individual from the system
router.delete('/removeIndividual', function(req, res) {
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    let faceIDs = [];
    for (let i = 0; i < individuals[req.body.identifier].images.length; i++) {
        faceIDs.push(individuals[req.body.identifier].images[i].faceId);
    }
    deleteImgs(faceIDs, [req.body.identifier], true, function() {
        let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
        delete individuals[req.body.identifier];
        fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
        res.send('Individual deleted');
    });
});

// Merges several individuals images into the last selected individual
router.put('/mergeImages', function(req, res) {
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    let images = []; let faceIDs = [];
    for (let i = 0; i < req.body.identifiers.length; i++) {
        for (let j = 0; j < individuals[req.body.identifiers[i]].images.length; j++) {
            images.push(individuals[req.body.identifiers[i]].images[j].base64Img);
            faceIDs.push(individuals[req.body.identifiers[i]].images[j].faceId);
        }
    }
    addImgs(0, {
        identifier: req.body.targetIdentifier,
        images: images
    }, function() {
        res.send(images);
    });
});

// Adds individual image(s) to the system
router.put('/addImages', function(req, res) {
    addImgs(0, req.body, function() {
        res.send('Image(s) added')
    });
});

// Removes individual image from the system
router.put('/removeImage', function(req, res) {
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    let faceIDs = [];
    for (let i = 0; i < individuals[req.body.identifier].images.length; i++) {
        const stockedImage = individuals[req.body.identifier].images[i].base64Img;
        if (stockedImage === req.body.image) {
            faceIDs.push(individuals[req.body.identifier].images[i].faceId);
            break;
        }
    }
    deleteImgs(faceIDs, [req.body.identifier], false, function() {
        res.send('Image(s) deleted');
    });
});

// Adds individual image(s) to the system
function addImgs(index, individual, callback) {
    if (index === individual.images.length) {
        callback();
        return;
    }
    let base64ImgWithPrefix = individual.images[index].trim();
    if (base64ImgWithPrefix.startsWith('url("')) base64ImgWithPrefix = base64ImgWithPrefix.substring(5, base64ImgWithPrefix.length - 2);
    const base64ImgWithoutPrefix = base64ImgWithPrefix.split(',')[1];
    const bytes = new Buffer(base64ImgWithoutPrefix, 'base64');
    amazonService.addFace(settings.collectionID, individual.identifier, bytes, function(data) {
        let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
        individuals[individual.identifier].images.push({base64Img: base64ImgWithPrefix, faceId: data.FaceRecords[0].Face.FaceId});
        fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
        addImgs(++index, individual, callback);
    });
}

// Removes individuals image(s) from the system
function deleteImgs(faceIDs, identifiers, totalErase, callback) {
    amazonService.deleteFaces(settings.collectionID, faceIDs, function() {
        deleteImgsFromIndividualsFile(0, identifiers, faceIDs, totalErase, callback);
    });
}

// Removes individuals image(s) from local persistence
function deleteImgsFromIndividualsFile(index, identifiers, faceIDs, totalErase, callback) {
    if (index === identifiers.length) {
        callback();
        return;
    }
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    if (totalErase) {
        individuals[identifiers[index]].images = [];
    } else {
        for (let i = 0; i < individuals[identifiers[index]].images.length; i++) {
            for (let j = 0; j < faceIDs.length; j++) {
                if (individuals[identifiers[index]].images[i].faceId === faceIDs[j]) {
                    individuals[identifiers[index]].images.splice(i--, 1);
                    faceIDs.splice(j, 1);
                    break;
                }
            }
        }
    }
    fs.writeFileSync('routes/individuals.txt', JSON.stringify(individuals));
    deleteImgsFromIndividualsFile(++index, identifiers, faceIDs, totalErase, callback);
}

module.exports = router;