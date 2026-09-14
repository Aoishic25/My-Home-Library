FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY app.js ./
COPY views ./views
COPY styles ./styles
COPY assets ./assets

EXPOSE 3000

CMD ["node", "app.js"]
