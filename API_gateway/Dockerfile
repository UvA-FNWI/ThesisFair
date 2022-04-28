FROM node:latest

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./src ./
ENTRYPOINT npm run production
