FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Set environment to production
ENV NODE_ENV=production

LABEL service="analytics-service"
LABEL description="Analytics service for URL Shortener"

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --omit=dev

# Create logs directory
RUN mkdir -p logs

# Bundle app source
COPY . .

# Expose port for service
EXPOSE 3002

# Command to run service
CMD [ "node", "server.js" ] 