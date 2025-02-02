import { jest } from '@jest/globals';
import { pollSQS } from '../pollSQS.js';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { createJob } from '../createJob.js';

jest.mock('@aws-sdk/client-sqs');
jest.mock('../createJob.js');
jest.mock('../logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../index.js', () => {
  const originalModule = jest.requireActual('../index.js');
  return {
    ...originalModule,
    startPolling: jest.fn(),
  };
});

jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(global, 'setInterval').mockImplementation((fn) => {
    fn();
    return 123;
  });
  jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  clearInterval.mockRestore();
  setInterval.mockRestore();
});

describe('pollSQS', () => {
  it('should process messages from SQS and delete them after processing', async () => {
    const mockSend = jest.spyOn(SQSClient.prototype, 'send').mockImplementation(jest.fn());

    const mockMessages = [
      {
        MessageId: '1',
        ReceiptHandle: 'handle1',
        Body: JSON.stringify({ videoId: 'video1' }),
      },
    ];

    mockSend.mockResolvedValueOnce({ Messages: mockMessages });
    createJob.mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({});

    await pollSQS();

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledWith(expect.any(ReceiveMessageCommand));
    expect(createJob).toHaveBeenCalledWith('video1');
    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
  });
});
