const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');

const server = app.listen(env.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`🚀 Digital Subscription Store API Server Started!`);
  logger.info(`🌐 Listening on port: ${env.PORT}`);
  logger.info(`🔧 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 Base URL: http://localhost:${env.PORT}`);
  logger.info(`=======================================================`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection! Shutting down server...', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception! Shutting down server...', err);
  process.exit(1);
});
