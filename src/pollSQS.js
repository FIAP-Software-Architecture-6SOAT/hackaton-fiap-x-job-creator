import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { createJob } from './createJob';
import logger from './logger.js';

const sqsClient = new SQSClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const QUEUE_URL = process.env.QUEUE_URL;

export const pollSQS = async () => {
  try {
    const receiveMessageCommand = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const data = await sqsClient.send(receiveMessageCommand);

    if (data.Messages) {
      for (const message of data.Messages) {
        const { videoId } = JSON.parse(message.Body);

        const createdJob = await createJob(videoId);

        if (createdJob) {
          const deleteMessageCommand = new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });

          await sqsClient.send(deleteMessageCommand);
          logger.info(`Message deleted: ${message.MessageId}`);
        }

      }
    }
  } catch (error) {
    logger.error(`Error polling SQS: ${error.message}`);
  }
};
