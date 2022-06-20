import createError from 'http-errors';
import express from 'express';
import morgan from 'morgan';

import auth from './auth.js';
import login from './routes/login.js';
import graphql from './graphql.js';

const createApp = async () => {
  const newApp = express();

  newApp.use(morgan('dev'));
  newApp.use(express.json({ limit: '10mb' }));
  newApp.use(express.urlencoded({ extended: false, limit: '10mb' }));


  newApp.use('/login', login);
  newApp.use(auth);
  newApp.use('/graphql', await graphql());

  // catch 404 and forward to error handler
  newApp.use((req, res, next) => {
    next(createError(404));
  });

  // error handler
  newApp.use((err, req, res, next) => {
    // set locals, only providing error in development
    const error = req.app.get('env') === 'development' ? err : {};

    let message;
    if (req.headers.accept === 'application/json') {
      message = JSON.stringify(error.message);
    } else {
      message = `${err.message}<br><br><code>${JSON.stringify(error)}</code>`
    }

    // send error page
    res.status(err.status || 500);
    res.send(message);
  });

  return newApp;
}

const app = createApp();
export default app;
