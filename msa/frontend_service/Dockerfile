# syntax=docker/dockerfile:1

FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /libraries
COPY --from=libraries . .
WORKDIR /libraries/thesisfair-api
RUN npm i

WORKDIR /app
COPY ./package*.json ./
RUN npm i

COPY ./src/ ./src/
COPY ./public/ ./public/

RUN  find ./src -type f -exec sed -i -E 's/(\.\.\/)*libraries/@amicopo/g' {} +

ENTRYPOINT npm run production
