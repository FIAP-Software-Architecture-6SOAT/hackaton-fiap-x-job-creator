import { DescribeClusterCommand } from '@aws-sdk/client-eks';
import * as k8s from '@kubernetes/client-node';
import { EKSClient } from '@aws-sdk/client-eks';

const REGION = 'us-east-1';
const CLUSTERNAME = 'prod-fiap-x-cluster';
const DOCKER_IMAGE = 'danilocassola/fiap-x-video-processor:v1.1';

const eksClient = new EKSClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

export const createJob = async (key) => {
  try {
    // Obter detalhes do cluster EKS
    const describeClusterCommand = new DescribeClusterCommand({
      name: CLUSTERNAME,
    });
    const clusterData = await eksClient.send(describeClusterCommand);

    const { cluster } = clusterData;
    const clusterEndpoint = cluster.endpoint;
    const clusterCA = cluster.certificateAuthority.data;

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
                  name: 'VIDEO_NAME',
                  value: key,
                },
                {
                  name: 'AWS_ACCESS_KEY_ID',
                  value: process.env.AWS_ACCESS_KEY_ID,
                },
                {
                  name: 'AWS_SECRET_ACCESS_KEY',
                  value: process.env.AWS_SECRET_ACCESS_KEY,
                },
                {
                  name: 'AWS_SESSION_TOKEN',
                  value: process.env.AWS_SESSION_TOKEN,
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

    // Criar o Job no Kubernetes no namespace 'default'
    const namespace = 'default';
    const response = await k8sBatchApi.createNamespacedJob({ namespace, body: job });
    console.log('Job created:', response);
    return true;
  } catch (error) {
    console.error(`Error creating job: ${error.message}`);
    return false;
  }
};
