FROM node:latest
LABEL org.opencontainers.image.source https://github.com/UvA-FNWI/ThesisFair


ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app
COPY ./package*.json ./
RUN npm ci

COPY ./files ./files

COPY ./src ./src
RUN  find ./src -type f -exec sed -i -E "s/(\.\.\/)+(.+\/)*libraries/@amicopo/g" {} +
RUN sed -i -E "s/(..\/)+msa\/(.+)\/src\/database.js/..\/dbs\/\2.js/g" ./src/command/initDB.js

CMD node ./src/command/mainCli.js init $events $admins $students $studentVotes $entities $adminRepresentatives $representatives $projects
