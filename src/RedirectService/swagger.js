const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/config');
const packageJson = require('./package.json');

/**
 * Swagger definition
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Redirect Service API',
      version: packageJson.version,
      description: 'API for the URL Shortener Redirect Service',
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
        url: '/',
        description: 'Current host'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY'
        }
      },
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
        Url: {
          type: 'object',
          required: ['shortCode', 'originalUrl'],
          properties: {
            shortCode: {
              type: 'string',
              description: 'Short code for the URL',
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
            active: {
              type: 'boolean',
              description: 'Whether the URL is active',
              default: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            lastAccessedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last access timestamp'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration timestamp'
            },
            clicks: {
              type: 'integer',
              description: 'Number of clicks',
              default: 0
            },
            uniqueVisitors: {
              type: 'integer',
              description: 'Number of unique visitors',
              default: 0
            },
            metadata: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  example: 'Example URL'
                },
                description: {
                  type: 'string',
                  example: 'Description for the URL'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  example: ['tag1', 'tag2']
                }
              }
            }
          }
        },
        GeoRule: {
          type: 'object',
          properties: {
            US: {
              type: 'string',
              format: 'uri',
              example: 'https://us-example.com'
            },
            GB: {
              type: 'string',
              format: 'uri',
              example: 'https://uk-example.com'
            },
            default: {
              type: 'string',
              format: 'uri',
              example: 'https://global-example.com'
            }
          }
        },
        AnalyticsSummary: {
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
            }
          }
        }
      }
    },
    security: [
      {
        apiKeyAuth: []
      }
    ],
    tags: [
      {
        name: 'Redirect',
        description: 'URL redirection operations'
      },
      {
        name: 'URL Management',
        description: 'Manage URLs and their settings'
      },
      {
        name: 'Analytics',
        description: 'URL analytics and statistics'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Metrics',
        description: 'Service metrics and monitoring'
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js']
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
    customSiteTitle: "URL Shortener Redirect Service API",
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none'
    }
  }));
  
  // Route to get swagger.json
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Log Swagger UI availability
  const port = config.server.port;
  console.log(`API Documentation available at http://localhost:${port}/api-docs`);
};

module.exports = { swaggerDocs }; 