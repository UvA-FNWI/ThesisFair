import createError from "http-errors";
import express from "express";
import morgan from "morgan";

import auth from "./auth.js";
import login from "./routes/login.js";
import sso from "./routes/sso.js";
import graphql from "./graphql.js";

/**
 * The express app which handles the middleweres, routing and error handling.
 * @returns Express app
 */
const createApp = async () => {
  const newApp = express();
  newApp.disable("x-powered-by");

  newApp.use(morgan("dev"));
  newApp.use(express.json({ limit: "50mb" }));
  newApp.use(express.urlencoded({ extended: false, limit: "50mb" }));

  if (process.env.NODE_ENV === "development") {
    newApp.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Max-Age", "86400");

      if (req.method === "OPTIONS") {
        res.end();
        return;
      }
      next();
    });
  }

  newApp.use("/login", login);
  newApp.use("/sso", sso);
  newApp.use(auth);
  const graphql = await import("./graphql.js");
  newApp.use("/graphql", graphql.default);

  // catch 404 and forward to error handler
  newApp.use((req, res, next) => {
    next(createError(404));
  });

  // error handler
  newApp.use((err, req, res, next) => {
    // set locals, only providing error in development
    const error = req.app.get("env") === "development" ? err : {};

    let message;
    if (req.headers.accept === "application/json") {
      message = JSON.stringify(error.message);
    } else {
      message = `${err.message}<br><br><code>${JSON.stringify(error)}</code>`;
    }

    // send error page
    res.status(err.status || 500);
    res.send(message);
  });

  return newApp;
};

const app = createApp();
export default app;
