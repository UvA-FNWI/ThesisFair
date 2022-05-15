import createError from 'http-errors';
import express from 'express';
import morgan from 'morgan';
// import cookieParser from 'cookie-parser';

import graphql from './graphql.js';
// import indexRoute from './routes/index.js';

const createApp = async () => {
  const app = express();

  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  // app.use(cookieParser());

  app.use((req, res, next) => {
    let token = req.headers.authorization;
    if (process.env.DEBUG) {
      token ||= req.query.authorization;
    }
    if (!token) {
      next(createError(401));
    }

    if (!token.startsWith('Bearer ')) {
      next({ status: 401, message: 'Only bearer authentication is allowed' });
    }

    req.user = JSON.parse(token.substring(7));
    if (!req.user) {
      next({ status: 401, message: 'Invalid token' });
    }

    next();
  });

  app.use('/graphql', await graphql());
  // app.use('/', indexRoute);

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
