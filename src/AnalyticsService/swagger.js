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
      title: 'URL Shortener - Analytics Service API',
      version: '1.0.0',
      description: 'API documentation for the Analytics Service of URL Shortener',
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
        ClickEvent: {
          type: 'object',
          required: ['shortCode', 'timestamp'],
          properties: {
            shortCode: {
              type: 'string',
              description: 'Short code of the URL',
              example: 'abc123'
            },
            originalUrl: {
              type: 'string',
              format: 'uri',
              description: 'Original URL',
              example: 'https://example.com/very/long/url'
            },
            userId: {
              type: 'string',
              description: 'ID of the user who created the URL',
              example: '507f1f77bcf86cd799439011'
            },
            visitorHash: {
              type: 'string',
              description: 'Hashed identifier of the visitor',
              example: '7daf6c79d4802916d83f6266e370b7bf9b5a1f33351e35c713d2d73a1b7201a3'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Time when the click occurred',
              example: '2023-06-23T11:21:15.000Z'
            },
            countryCode: {
              type: 'string',
              description: 'Country code of the visitor',
              example: 'US'
            },
            deviceType: {
              type: 'string',
              description: 'Type of device',
              enum: ['desktop', 'mobile', 'tablet', 'unknown'],
              example: 'desktop'
            }
          }
        },
        UrlStat: {
          type: 'object',
          required: ['shortCode', 'originalUrl'],
          properties: {
            shortCode: {
              type: 'string',
              description: 'Short code of the URL',
              example: 'abc123'
            },
            originalUrl: {
              type: 'string',
              format: 'uri',
              description: 'Original URL',
              example: 'https://example.com/very/long/url'
            },
            totalClicks: {
              type: 'integer',
              description: 'Total number of clicks',
              example: 42
            },
            uniqueVisitors: {
              type: 'integer',
              description: 'Number of unique visitors',
              example: 24
            },
            countryStats: {
              type: 'object',
              description: 'Click statistics by country',
              example: {"US": 15, "GB": 10, "DE": 5}
            }
          }
        },
        AnalyticsOverview: {
          type: 'object',
          properties: {
            totalClicks: {
              type: 'integer',
              example: 1250
            },
            uniqueVisitors: {
              type: 'integer',
              example: 820
            },
            clicksPerUrl: {
              type: 'number',
              format: 'float',
              example: 12.5
            },
            topUrls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  shortCode: {
                    type: 'string',
                    example: 'abc123'
                  },
                  clicks: {
                    type: 'integer',
                    example: 42
                  }
                }
              }
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
                message: 'URL not found'
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
    security: [],
    tags: [
      {
        name: 'Analytics',
        description: 'URL analytics and statistics'
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
    customSiteTitle: 'URL Shortener Analytics Service API',
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