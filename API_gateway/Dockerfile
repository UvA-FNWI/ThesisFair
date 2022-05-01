FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=80

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./src ./src
ENTRYPOINT npm run production
