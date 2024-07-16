# syntax=docker/dockerfile:1

FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Install dependencies of libraries
WORKDIR /libraries/mongodbprovisioner
COPY --from=libraries ./mongodbprovisioner/package*.json ./
RUN npm ci --no-progress

WORKDIR /libraries/amqpmessaging
COPY --from=libraries ./amqpmessaging/package*.json ./
RUN npm ci --no-progress

WORKDIR /libraries/thesisfair-api
COPY --from=libraries ./thesisfair-api/package*.json ./
COPY --from=libraries ./thesisfair-api/node_module[s] ./node_modules
RUN npm ci --no-progress

# Install dependencies of microservice
WORKDIR /app
COPY ./package*.json ./
COPY ./node_module[s] ./node_modules
RUN npm ci --no-progress

# Copy library sources
WORKDIR /libraries
COPY --from=libraries ./mongodbprovisioner/*.js ./mongodbprovisioner
COPY --from=libraries ./amqpmessaging/*.js ./amqpmessaging
COPY --from=libraries ./thesisfair-api/*.js ./thesisfair-api

# Copy source of microservice
WORKDIR /app
COPY ./src ./src

ENTRYPOINT npm run production
