import createError from 'http-errors';
import express from 'express';
import morgan from 'morgan';
// import cookieParser from 'cookie-parser';

import auth from './auth.js';
import login from './routes/login.js';
import graphql from './graphql.js';

const createApp = async () => {
  const app = express();

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // app.use(cookieParser());


  app.use('/login', login);
  app.use(auth);
  app.use('/graphql', await graphql());

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

  return app;
}

const app = createApp();
export default app;
