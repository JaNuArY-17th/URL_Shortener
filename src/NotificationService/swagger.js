const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const logger = require('./services/logger');

/**
 * Swagger definition
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'URL Shortener - Notification Service API',
      version: '1.0.0',
      description: 'API documentation for the Notification Service of URL Shortener',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      contact: {
        name: 'URL Shortener Team',
        url: 'https://urlshortener.example.com',
        email: 'admin@urlshortener.example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development Server'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        },
        Notification: {
          type: 'object',
          required: ['title', 'message'],
          properties: {
            userId: {
              type: 'string',
              description: 'ID of user receiving the notification',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              description: 'Notification title',
              example: 'URL Created Successfully'
            },
            message: {
              type: 'string',
              description: 'Notification message',
              example: 'Your shortened URL abc123 has been created successfully'
            },
            type: {
              type: 'string',
              description: 'Type of notification',
              enum: ['info', 'success', 'warning', 'error', 'url', 'system'],
              example: 'success'
            },
            read: {
              type: 'boolean',
              description: 'Whether the notification has been read',
              default: false,
              example: false
            },
            data: {
              type: 'object',
              description: 'Additional data related to the notification',
              example: {"shortCode": "abc123", "originalUrl": "https://example.com/very/long/url"}
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Notification creation timestamp',
              example: '2023-06-23T11:21:15.000Z'
            }
          }
        },
        UserPreference: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              description: 'ID of the user',
              example: '507f1f77bcf86cd799439011'
            },
            email: {
              type: 'boolean',
              description: 'Whether to send email notifications',
              default: false,
              example: true
            },
            push: {
              type: 'boolean',
              description: 'Whether to send push notifications',
              default: false,
              example: false
            },
            inApp: {
              type: 'boolean',
              description: 'Whether to show in-app notifications',
              default: true,
              example: true
            },
            emailFrequency: {
              type: 'string',
              description: 'Frequency of email notifications',
              enum: ['immediate', 'hourly', 'daily', 'weekly'],
              default: 'daily',
              example: 'daily'
            }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        BadRequest: {
          description: 'Invalid input parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Invalid input parameters'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Notification not found'
              }
            }
          }
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Authentication required'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'An unexpected error occurred'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Notifications',
        description: 'Notification management endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './models/*.js'
  ]
};

/**
 * Configure Swagger for the Express app
 * @param {Object} app - Express app instance
 */
const swaggerDocs = (app) => {
  // Initialize swagger-jsdoc
  const swaggerSpec = swaggerJsdoc(options);
  
  // Configure Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'URL Shortener Notification Service API',
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true
    }
  }));
  
  // Route to get swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  logger.info(`API Documentation available at http://localhost:${config.server.port}/api-docs`);
};

module.exports = { swaggerDocs }; 