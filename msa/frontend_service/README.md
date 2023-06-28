# Thesis Fair Platform frontend

This React project is the frontend for the Thesis Fair Platform

This readme will go over the project structure and the possible relevant react scripts from the default create react app documentation.

# Project structure

## public

This is the static directory of the app which will be looked up first when doing requests. It also contains the index.html which is the entrypoint of the whole appliation.

## src

This is the directory where the JavaScript is. It contains the following files and folders:

- `index.js` which is the JavaScript entrypoint of the application
- `app.js` which handles the routing
- `api.js` which handles everything regarding external input/output
- `api/` which contains a library to communicate with the Microservices Architecture
- `components/` which contain al the components that are reused on (multiple) pages
- `pages/` which contain al the pages per user type

# React create app

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

This command is automatically run when running the development docker-compose.yml

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `make build`

Builds the app for production and packages it into a Docker image.\
To do this it needs to copy the api directory because Docker cannot handle symbolic links outside of its mounted directory. After building the api folder is made as a symbolic link again.

### `make push`

Pushes the Docker image

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
