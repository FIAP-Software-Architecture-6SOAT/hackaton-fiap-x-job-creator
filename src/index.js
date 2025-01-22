import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { createJob } from './createJob.js';

const sqsClient = new SQSClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const QUEUE_URL = process.env.QUEUE_URL;

const pollSQS = async () => {
  try {
    const receiveMessageCommand = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    });

    const data = await sqsClient.send(receiveMessageCommand);

    if (data.Messages) {
      for (const message of data.Messages) {
        const { key } = JSON.parse(message.Body);

        const createdJob = await createJob(key);

        if (createdJob) {
          const deleteMessageCommand = new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });
  
          await sqsClient.send(deleteMessageCommand);
          console.log(`Message deleted: ${message.MessageId}`);
        }

      }
    }
  } catch (error) {
    console.error(`Error polling SQS: ${error.message}`);
  }
};

const startPolling = () => {
  console.log('Listening for messages on SQS...');
  // setInterval(pollSQS, 10000); // Poll SQS a cada 10 segundos
  setInterval(pollSQS, 1000); // Poll SQS a cada 1 segundos
};

startPolling();