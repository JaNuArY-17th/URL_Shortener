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
      title: 'URL Shortener - Redirect Service API',
      version: '1.0.0',
      description: 'API documentation for the Redirect Service of URL Shortener',
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
              default: true,
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2023-06-23T11:21:15.000Z'
            },
            lastAccessedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last access timestamp',
              example: '2023-06-23T11:22:15.000Z'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration timestamp',
              example: '2024-06-23T11:21:15.000Z'
            },
            clicks: {
              type: 'integer',
              description: 'Number of clicks',
              default: 0,
              example: 42
            },
            uniqueVisitors: {
              type: 'integer',
              description: 'Number of unique visitors',
              default: 0,
              example: 24
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
        RedirectResponse: {
          type: 'object',
          properties: {
            originalUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/very/long/url'
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
        UrlCreationResponse: {
          type: 'object',
          properties: {
            shortCode: {
              type: 'string',
              example: 'abc123'
            },
            shortUrl: {
              type: 'string',
              example: 'http://localhost:3000/abc123'
            },
            originalUrl: {
              type: 'string',
              example: 'https://example.com/very/long/url'
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-06-23T11:21:15.000Z'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-06-23T11:21:15.000Z'
            },
            services: {
              type: 'object',
              properties: {
                mongodb: {
                  type: 'string',
                  example: 'connected'
                },
                redis: {
                  type: 'string',
                  example: 'connected'
                },
                rabbitmq: {
                  type: 'string',
                  example: 'connected'
                }
              }
            }
          }
        },
        StatsResponse: {
          type: 'object',
          properties: {
            uptime: {
              type: 'number',
              example: 3600
            },
            memory: {
              type: 'object',
              properties: {
                rss: {
                  type: 'string',
                  example: '50MB'
                },
                heapTotal: {
                  type: 'string',
                  example: '30MB'
                },
                heapUsed: {
                  type: 'string',
                  example: '20MB'
                }
              }
            },
            cache: {
              type: 'object',
              properties: {
                hits: {
                  type: 'number',
                  example: 1000
                },
                misses: {
                  type: 'number',
                  example: 250
                },
                ratio: {
                  type: 'string',
                  example: '80%'
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
        name: 'Redirect',
        description: 'URL redirection operations'
      },
      {
        name: 'URL Management',
        description: 'Manage URLs and their settings'
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
    customSiteTitle: 'URL Shortener Redirect Service API',
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