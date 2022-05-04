# Docker compose
The docker-files in the different service folders should be executed from the git root.

The following environment variables should be used within the docker-compose files:
- `NODE_ENV` -> Set as `NODE_ENV` during building
- `NODE_CMD` -> Command to execute to start the container, either `start` for development with automatic restarting or `production` for production.

# Shared libraries
Are in the libraries folder. The folder name should match their package name on npm so that during build the code can be rewritten to make regex pattern `(\.\./)*libraries/amqpmessaging/index.js` -> `@amicopo/amqpmessaging/index.js`
