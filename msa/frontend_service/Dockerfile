
FROM node:alpine as frontendBuilder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./public/ ./public
COPY ./src/ ./src

RUN npm run build

FROM nginx:alpine
COPY --from=frontendBuilder /app/build/ /usr/share/nginx/html
