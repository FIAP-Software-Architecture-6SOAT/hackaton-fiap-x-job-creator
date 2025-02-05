import pino from 'pino';

import { logger } from '../logger';

jest.mock('pino', () =>
  jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  }))
);

describe('Logger', () => {
  it('should create a logger with the correct configuration', () => {
    expect(pino).toHaveBeenCalledWith({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
      },
    });
  });

  it('should log messages correctly', () => {
    logger.info('Info message');
    logger.error('Error message');

    expect(logger.info).toHaveBeenCalledWith('Info message');
    expect(logger.error).toHaveBeenCalledWith('Error message');
  });
});
