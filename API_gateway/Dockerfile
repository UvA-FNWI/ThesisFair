FROM node:latest

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./src ./
ENTRYPOINT npm run production
