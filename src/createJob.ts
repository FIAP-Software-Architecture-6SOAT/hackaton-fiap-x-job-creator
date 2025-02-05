import { DescribeClusterCommand, EKSClient } from '@aws-sdk/client-eks';
import * as k8s from '@kubernetes/client-node';

import { ENV } from './config';
import { logger } from './logger';

const REGION = 'us-east-1';
const CLUSTERNAME = 'prod-fiap-x-cluster';
const DOCKER_IMAGE = 'danilocassola/fiap-x-video-processor:v1';

const eksClient = new EKSClient({
  region: REGION,
  credentials: {
    accessKeyId: ENV.AWS_ACCESS_KEY_ID,
    secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
    sessionToken: ENV.AWS_SESSION_TOKEN,
  },
});

export const createJob = async (videoId: string): Promise<boolean> => {
  try {
    // Obter detalhes do cluster EKS
    const describeClusterCommand = new DescribeClusterCommand({
      name: CLUSTERNAME,
    });
    const clusterData = await eksClient.send(describeClusterCommand);

    const { cluster } = clusterData;
    const clusterEndpoint = cluster?.endpoint;
    const clusterCA = cluster?.certificateAuthority?.data;

    // Configurar o kubeconfig
    const kubeconfig = new k8s.KubeConfig();
    kubeconfig.loadFromOptions({
      clusters: [
        {
          name: CLUSTERNAME,
          server: clusterEndpoint,
          caData: clusterCA,
        },
      ],
      contexts: [
        {
          name: CLUSTERNAME,
          cluster: CLUSTERNAME,
          user: CLUSTERNAME,
        },
      ],
      currentContext: CLUSTERNAME,
      users: [
        {
          name: CLUSTERNAME,
          exec: {
            apiVersion: 'client.authentication.k8s.io/v1beta1',
            command: 'aws',
            args: ['eks', 'get-token', '--cluster-name', CLUSTERNAME],
            env: [
              {
                name: 'AWS_REGION',
                value: REGION,
              },
            ],
          },
        },
      ],
    });

    const k8sBatchApi = kubeconfig.makeApiClient(k8s.BatchV1Api);

    const job = new k8s.V1Job();
    const metadata = new k8s.V1ObjectMeta();
    job.apiVersion = 'batch/v1';
    job.kind = 'Job';
    metadata.name = `video-processor-job-${Date.now()}`;
    job.metadata = metadata;

    job.spec = {
      ttlSecondsAfterFinished: 5,
      template: {
        spec: {
          containers: [
            {
              name: 'video-processor',
              image: DOCKER_IMAGE,
              command: ['/bin/sh', '-c', 'npm run process-video'],
              env: [
                {
                  name: 'VIDEO_ID',
                  value: videoId,
                },
                {
                  name: 'AWS_ACCESS_KEY_ID',
                  value: ENV.AWS_ACCESS_KEY_ID,
                },
                {
                  name: 'AWS_SECRET_ACCESS_KEY',
                  value: ENV.AWS_SECRET_ACCESS_KEY,
                },
                {
                  name: 'AWS_SESSION_TOKEN',
                  value: ENV.AWS_SESSION_TOKEN,
                },
                {
                  name: 'AWS_ACCESS_KEY_ID_SES',
                  value: ENV.AWS_ACCESS_KEY_ID_SES,
                },
                {
                  name: 'AWS_SECRET_ACCESS_KEY_SES',
                  value: ENV.AWS_SECRET_ACCESS_KEY_SES,
                },
                {
                  name: 'MONGODB_CONNECTION_STRING',
                  value: ENV.MONGODB_CONNECTION_STRING,
                },
                {
                  name: 'MONGODB_DB_NAME',
                  value: ENV.MONGODB_DB_NAME,
                },
                {
                  name: 'BUCKET_VIDEOS_NAME',
                  value: ENV.BUCKET_VIDEOS_NAME,
                },
                {
                  name: 'BUCKET_IMAGES_ZIP_NAME',
                  value: ENV.BUCKET_IMAGES_ZIP_NAME,
                },
              ],
              resources: {
                requests: {
                  memory: '512Mi',
                  cpu: '500m',
                },
                limits: {
                  memory: '1Gi',
                  cpu: '500m',
                },
              },
            },
          ],
          restartPolicy: 'Never',
        },
      },
      backoffLimit: 4,
    };

    const namespace = 'default';
    await k8sBatchApi.createNamespacedJob({ namespace, body: job });
    logger.info('Job created: %s', metadata.name);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error creating job: ${error.message}`);
    } else {
      logger.error('Error creating job: %s', error);
    }
    return false;
  }
};
