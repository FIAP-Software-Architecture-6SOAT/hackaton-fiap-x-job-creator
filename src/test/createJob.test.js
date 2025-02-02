import { createJob } from '../createJob';
import * as k8s from '@kubernetes/client-node';
import { EKSClient, DescribeClusterCommand } from '@aws-sdk/client-eks';
import logger from '../logger.js';

jest.mock('@aws-sdk/client-eks');
jest.mock('@kubernetes/client-node');
jest.mock('../logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('createJob', () => {
  const mockEksClient = new EKSClient();
  const mockK8sBatchApi = {
    createNamespacedJob: jest.fn(),
  };

  beforeAll(() => {
    EKSClient.mockImplementation(() => mockEksClient);
    k8s.KubeConfig.mockImplementation(() => ({
      loadFromOptions: jest.fn(),
      makeApiClient: jest.fn(() => mockK8sBatchApi),
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a job successfully', async () => {
    const videoId = 'test-video-id';
    const mockClusterData = {
      cluster: {
        endpoint: 'https://mock-endpoint',
        certificateAuthority: { data: 'mock-ca-data' },
      },
    };

    mockEksClient.send.mockResolvedValue(mockClusterData);
    mockK8sBatchApi.createNamespacedJob.mockResolvedValue({});

    const result = await createJob(videoId);

    expect(result).toBe(true);
    expect(mockEksClient.send).toHaveBeenCalledWith(expect.any(DescribeClusterCommand));
    expect(mockK8sBatchApi.createNamespacedJob).toHaveBeenCalledWith({
      namespace: 'default',
      body: expect.objectContaining({
        metadata: expect.objectContaining({
          name: expect.stringContaining('video-processor-job-'),
        }),
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              containers: expect.arrayContaining([
                expect.objectContaining({
                  env: expect.arrayContaining([
                    expect.objectContaining({ name: 'VIDEO_ID', value: videoId }),
                  ]),
                }),
              ]),
            }),
          }),
        }),
      }),
    });
    expect(logger.info).toHaveBeenCalledWith('Job created:', expect.any(Object));
  });

  it('should handle errors gracefully', async () => {
    const videoId = 'test-video-id';
    mockEksClient.send.mockRejectedValue(new Error('EKS error'));
    mockK8sBatchApi.createNamespacedJob.mockResolvedValue({});

    const result = await createJob(videoId);

    expect(result).toBe(false);
    expect(mockEksClient.send).toHaveBeenCalledWith(expect.any(DescribeClusterCommand));
    expect(mockK8sBatchApi.createNamespacedJob).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Error creating job: EKS error');
  });
});
