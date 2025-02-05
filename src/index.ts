/* eslint-disable @typescript-eslint/no-misused-promises */
import { logger } from './logger';
import { pollSQS } from './pollSQS';

const startPolling = (): void => {
  logger.info('Listening for messages on SQS...');
  setInterval(pollSQS, 5000); // Poll SQS a cada 5 segundos
};

startPolling();
