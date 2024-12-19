var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
const connectDb = require('./data/db');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var productRouter = require('./routes/products');
var categoryRouter=require('./routes/category');
var orderRouter = require('./routes/order');
var reviewRoutes = require('./routes/review');
var promotionalRouter = require('./routes/promotional');
var promotionalProductsRouter = require('./routes/PromotionalProduct');

var app = express();
connectDb();
app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use('/img', express.static('img'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', productRouter);
app.use('/users', usersRouter);
app.use('/categories',categoryRouter)
app.use('/orders',orderRouter)
app.use('/api/reviews', reviewRoutes);
app.use('/api/promotions', promotionalRouter);
app.use('/api/promotional-products', promotionalProductsRouter);

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
