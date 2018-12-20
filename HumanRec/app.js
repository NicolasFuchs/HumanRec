const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const favicon = require('serve-favicon');

const camerasRouter = require('./routes/camerasRouter');
const historyRouter = require('./routes/historyRouter');
const individualsRouter = require('./routes/individualsRouter');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true, parameterLimit:50000 }));    //Set to true to enable arrays in json
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')));

//Needed to handle access (CORS)
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');  //DANGEROUS
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

/*const AmazonService = require('./routes/AmazonRekognition.js');
const amazonService = new AmazonService();
amazonService.deleteCollection('humanRec', function() {
    console.log('collection deleted');
    amazonService.createCollection('humanRec', function() {
        console.log('collection created');
    });
});*/

app.use('/cameras', camerasRouter);
app.use('/history', historyRouter);
app.use('/individuals', individualsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
