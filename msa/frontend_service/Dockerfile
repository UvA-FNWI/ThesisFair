#FROM node:alpine
#
#ARG NODE_ENV=production
#ENV NODE_ENV=${NODE_ENV}
#
#EXPOSE 80
#ENV PORT 80
#
#WORKDIR /app
#COPY ./package*.json ./
#
## ARG REACT_APP_API_ENDPOINT=http://localhost:3000/
## ENV REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT}
#
#COPY public .
#COPY src .
#COPY --from=libraries ./thesisfair-api ./src/api
#
#RUN npm i
#
#CMD ["npm", "run", "production"]
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
COPY ./node_modules ./node_modules
RUN npm i

COPY ./src ./src
COPY ./public/ ./public

RUN  find ./src -type f -exec sed -i -E 's/(\.\.\/)*libraries/@amicopo/g' {} +

ENTRYPOINT npm run production
