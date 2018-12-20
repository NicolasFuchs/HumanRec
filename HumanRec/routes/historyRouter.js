const express = require('express');
const router = express.Router();
const fs = require('fs');

// Retrieves tracking individuals options
router.get('/getTracking', function(req, res) {
    let trackedIndividualsWithImages = {};
    let filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    let individuals = JSON.parse(fs.readFileSync('routes/individuals.txt'));
    for (let i = 0; i < filters.tracking.length; i++) {
        trackedIndividualsWithImages[filters.tracking[i]] = 'url(' + individuals[filters.tracking[i]].images[0].base64Img + ')';
    }
    res.send(trackedIndividualsWithImages);
});

// Retrieves the full image in which the face has been detected
router.get('/getFullImage', function(req, res) {
    /*const historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    const historicsLength = historics[req.query.identifier].length;
    for (let i = 0; i < historicsLength; i++) {
        if (historics[req.query.identifier][i].similarity == req.query.similarity && historics[req.query.identifier][i].date == req.query.date) {
            res.send(historics[req.query.identifier][i].fullImage);
            break;
        }
    }*/
    const historics = require('./videoEmitter.js').getHistorics();
    const historicsLength = historics[req.query.identifier].length;
    for (let i = 0; i < historicsLength; i++) {
        if (historics[req.query.identifier][i].similarity == req.query.similarity && historics[req.query.identifier][i].date == req.query.date) {
            console.log(historics[req.query.identifier][i].fullImage);
            res.send(historics[req.query.identifier][i].fullImage);
            break;
        }
    }
});

// Updates filters
router.put('/updateFilters', function(req, res) {
    const filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    if (req.body.similarity !== undefined) filters.similarity = req.body.similarity;
    if (req.body.cameras !== undefined) {
        if (req.body.cameras === '[]') filters.cameras = [];
        else filters.cameras = req.body.cameras;
    }
    if (req.body.from !== undefined) filters.from = req.body.from;
    if (req.body.to !== undefined) filters.to = req.body.to;
    if (req.body.identifier !== undefined) filters.identifier = req.body.identifier;
    if (req.body.addTrackingIdentifier !== undefined) filters.tracking.push(req.body.addTrackingIdentifier);
    if (req.body.removeTrackingIdentifier !== undefined) filters.tracking.splice(filters.tracking.indexOf(req.body.removeTrackingIdentifier), 1);
    fs.writeFileSync('routes/filters.txt', JSON.stringify(filters));
    res.send('filters changed');
});

// Retrieves all filters
router.get('/getFilters', function(req, res) {
    const filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    res.send(filters);
});

// Retrieves history of an individual
router.get('/getHistory', function(req, res) {
    //const historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    const historics = require('./videoEmitter.js').getHistorics();
    const filteredHistory = (historics[req.query.identifier] === undefined) ? undefined : checkFilters(historics[req.query.identifier]);
    res.send(filteredHistory);
});

// Updates an identifier in history
router.put('/updateHistoryIdentifier', function(req, res) {
    //let historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    let historics = require('./videoEmitter.js').getHistorics();
    historics[req.body.newIdentifier] = historics[req.body.oldIdentifier];
    delete historics[req.body.oldIdentifier];
    //fs.writeFileSync('routes/historics.txt', JSON.stringify(historics));
    res.send('History identifier changed');
});

// Update a camera name in history
router.put('/updateHistoryCamera', function(req, res) {
    //let historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    let historics = require('./videoEmitter.js').getHistorics();
    for (let identifier in historics){
        for (let i = 0; i < historics[identifier].length; i++) {
            if (historics[identifier][i].camera === req.body.oldCameraName) {
                historics[identifier][i].camera = req.body.newCameraName;
            }
        }
    }
    //fs.writeFileSync('routes/historics.txt', JSON.stringify(historics));
    res.send('History camera changed');
});

// Merges histories of several individuals
router.put('/mergeHistories', function(req, res) {
    //let historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    let historics = require('./videoEmitter.js').getHistorics();
    if (historics[req.body.targetIdentifier] === undefined) historics[req.body.targetIdentifier] = [];
    for (let i = 0; i < req.body.identifiersToMerge.length; i++) {
        if (historics[req.body.identifiersToMerge[i]] !== undefined) {
            historics[req.body.targetIdentifier] = historics[req.body.targetIdentifier].concat(historics[req.body.identifiersToMerge[i]]);
        }
    }
    //fs.writeFileSync('routes/historics.txt', JSON.stringify(historics));
    res.send('Histories merged');
});

// Removes history of an individual
router.delete('/removeHistory', function(req, res) {
    //let historics = JSON.parse(fs.readFileSync('routes/historics.txt'));
    let historics = require('./videoEmitter.js').getHistorics();
    delete historics[req.body.identifier];
    //fs.writeFileSync('routes/historics.txt', JSON.stringify(historics));
    res.send('History deleted');
});

// Checks filters of the stored history
function checkFilters(history) {
    const filters = JSON.parse(fs.readFileSync('routes/filters.txt'));
    for (let i = 0; i < history.length; i++) {
        if (parseFloat(history[i].similarity) < parseFloat(filters.similarity)) {
            history.splice(i--, 1);
        } else if (!filters.cameras.includes(history[i].camera)) {
            history.splice(i--, 1);
        }
        // TODO - Check de from et to
    }
    return history;
}

module.exports = router;