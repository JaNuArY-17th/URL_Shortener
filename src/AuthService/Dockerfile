FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

LABEL service="auth-service" \
      description="Authentication and user management service for URL Shortener"

EXPOSE 3000

CMD [ "node", "server.js" ] 