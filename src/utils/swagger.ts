import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Web Scraper API',
      version: '1.0.0',
      description: 'Web Scraping API for the Dual-Interface Application',
      license: {
        name: 'MIT',
        url: 'https://spdx.org/licenses/MIT.html',
      },
      contact: {
        name: 'API Support',
        url: 'https://yourwebsite.com/support',
        email: 'support@yourwebsite.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:6969',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'], // paths to files containing annotations
};

export const specs = swaggerJsdoc(options);
