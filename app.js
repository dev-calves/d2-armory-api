// references to dependencies.
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var csrf = require('csurf');
var logger = require('morgan');
var helmet = require('helmet');
var cors = require('cors');

// references to apis.
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var authController = require('./api/auth');
var charactersController = require('./api/characters');

// cors configuration.
var corsOptions = {
  origin: 'http://localhost:4200',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

// create express app
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// mount middleware dependencies.
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // needs to be mounted before csrf.
app.use(csrf({cookie: true}));
app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors(corsOptions));

// mount apis into middleware
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', authController, charactersController);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
