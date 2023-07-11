# syntax=docker/dockerfile:1

FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
COPY ./node_module[s] ./node_modules
RUN npm i

COPY ./src ./src
RUN  find ./src -type f -exec sed -i -E 's/(\.\.\/)*libraries/@amicopo/g' {} +

ENTRYPOINT npm run production
