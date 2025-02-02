import logger from './logger.js';
import { pollSQS } from './pollSQS.js';

const startPolling = () => {
  logger.info('Listening for messages on SQS...');
  setInterval(pollSQS, 5000); // Poll SQS a cada 5 segundos
};

startPolling();