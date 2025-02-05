/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { ENV } from './config';
import { createJob } from './createJob';
import { logger } from './logger';

const sqsClient = new SQSClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: ENV.AWS_SESSION_TOKEN,
  },
});

export const pollSQS = async (): Promise<void> => {
  try {
    const receiveMessageCommand = new ReceiveMessageCommand({
      QueueUrl: ENV.QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const data = await sqsClient.send(receiveMessageCommand);

    if (data.Messages) {
      for (const message of data.Messages) {
        const { videoId } = JSON.parse(message.Body as string);

        const createdJob = await createJob(videoId as string);

        if (createdJob) {
          const deleteMessageCommand = new DeleteMessageCommand({
            QueueUrl: ENV.QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });

          await sqsClient.send(deleteMessageCommand);
          logger.info(`Message deleted: ${message.MessageId}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error polling SQS: ${error.message}`);
    } else {
      logger.error('Error polling SQS: %s', error);
    }
  }
};
