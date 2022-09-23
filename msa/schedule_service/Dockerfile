FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair

RUN apt-get update && apt-get install pip -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app/thesisFairAlgorithm
COPY ./ThesisFairAlgorithm .
RUN pip install .

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app/node
COPY ./package*.json ./
RUN npm ci

COPY ./src ./src
RUN  find ./src -type f -exec sed -i -E 's/(\.\.\/)*libraries/@amicopo/g' {} +

ENTRYPOINT npm run production
