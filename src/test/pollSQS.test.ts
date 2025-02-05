/* eslint-disable @typescript-eslint/unbound-method */
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { createJob } from '../createJob';
import { logger } from '../logger';
import { pollSQS } from '../pollSQS';

jest.mock('@aws-sdk/client-sqs');
jest.mock('../createJob');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockSQSClient = SQSClient as jest.MockedClass<typeof SQSClient>;

describe('pollSQS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process and delete messages from SQS', async () => {
    const mockMessages = [
      {
        Body: JSON.stringify({ videoId: '123' }),
        ReceiptHandle: 'receipt-handle-1',
        MessageId: 'message-id-1',
      },
    ];

    mockSQSClient.prototype.send = jest.fn().mockImplementation((command) => {
      if (command instanceof ReceiveMessageCommand) {
        return { Messages: mockMessages };
      }
      return {};
    });

    (createJob as jest.Mock).mockResolvedValue(true);

    await pollSQS();

    expect(mockSQSClient.prototype.send).toHaveBeenCalledWith(expect.any(ReceiveMessageCommand));
    expect(createJob).toHaveBeenCalledWith('123');
    expect(mockSQSClient.prototype.send).toHaveBeenCalledWith(expect.any(DeleteMessageCommand));
    expect(logger.info).toHaveBeenCalledWith('Message deleted: message-id-1');
  });

  it('should log an error if polling fails', async () => {
    const error = new Error('Polling error');
    mockSQSClient.prototype.send = jest.fn().mockRejectedValue(error);

    await pollSQS();

    expect(logger.error).toHaveBeenCalledWith(`Error polling SQS: ${error.message}`);
  });
});
