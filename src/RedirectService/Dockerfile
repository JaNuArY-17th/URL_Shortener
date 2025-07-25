FROM node:18-alpine

LABEL service="redirect-service" \
      description="URL redirection service with Redis caching for URL Shortener"

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --omit=dev

# Bundle app source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Start the service
CMD [ "node", "server.js" ] 