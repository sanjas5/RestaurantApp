var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var pg = require('pg');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var customerRouter = require('./routes/customer');
var deliveryRouter = require('./routes/delivery');
var administratorRouter = require('./routes/administrator');
var administratorRestoranaRouter = require('./routes/administrator_restorana');
var checkLoggedUserRouter = require('./middleware/checkLoggedUser');

var app = express();

var connection = require('./connection/connection');

var pool = new pg.Pool(connection);

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Konektovana na bazu!');
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/customer', checkLoggedUserRouter.provjera, customerRouter);
app.use('/delivery', checkLoggedUserRouter.provjera, deliveryRouter);
app.use(
  '/adm',
  checkLoggedUserRouter.provjera,
  checkLoggedUserRouter.checkAdmin,
  administratorRouter
);

app.use(
  '/adm_rest/:restoranNaziv',
  checkLoggedUserRouter.provjera,
  administratorRestoranaRouter
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
