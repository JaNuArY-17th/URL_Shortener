require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 