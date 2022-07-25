
FROM node:alpine as frontendBuilder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./public/ ./public
COPY ./src/ ./src

ARG REACT_APP_API_ENDPOINT=http://localhost:3000/
ENV REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT}

RUN npm run build

FROM nginx:alpine
COPY --from=frontendBuilder /app/build/ /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
