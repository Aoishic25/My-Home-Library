FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY app.js ./
COPY lib ./lib
COPY views ./views
COPY styles ./styles
COPY assets ./assets

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "app.js"]
