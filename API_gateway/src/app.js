const createError = require('http-errors');
const express = require('express');
// const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());

app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  const error = req.app.get('env') === 'development' ? err : {};

  // send error page
  res.status(err.status || 500);
  res.send(`${err.message}<br><br><code>${JSON.stringify(error)}</code>`);
});

module.exports = app;
