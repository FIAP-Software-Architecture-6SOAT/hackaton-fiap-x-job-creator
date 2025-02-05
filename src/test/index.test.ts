/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable global-require */
import { logger } from '../logger';
import { pollSQS } from '../pollSQS';

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../pollSQS');

describe('startPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
  });

  it('should log a message and set an interval to poll SQS', () => {
    require('../index');

    expect(logger.info).toHaveBeenCalledWith('Listening for messages on SQS...');
    expect(setInterval).toHaveBeenCalledWith(pollSQS, 5000);
  });
});
