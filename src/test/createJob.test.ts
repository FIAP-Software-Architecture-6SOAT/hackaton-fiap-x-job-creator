/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/unbound-method */
import { DescribeClusterCommand, EKSClient } from '@aws-sdk/client-eks';
import * as k8s from '@kubernetes/client-node';

import { createJob } from '../createJob';
import { logger } from '../logger';

jest.mock('@aws-sdk/client-eks');
jest.mock('@kubernetes/client-node');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockEKSClient = EKSClient as jest.MockedClass<typeof EKSClient>;
const mockKubeConfig = k8s.KubeConfig as jest.MockedClass<typeof k8s.KubeConfig>;
const mockBatchV1Api = k8s.BatchV1Api as jest.MockedClass<typeof k8s.BatchV1Api>;

describe('createJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a job successfully', async () => {
    const mockClusterData = {
      cluster: {
        endpoint: 'https://example.com',
        certificateAuthority: { data: 'cert-data' },
      },
    };

    mockEKSClient.prototype.send = jest.fn().mockResolvedValue(mockClusterData);
    const mockCreateNamespacedJob = jest.fn().mockResolvedValue({});
    mockBatchV1Api.prototype.createNamespacedJob = mockCreateNamespacedJob;

    const mockLoadFromOptions = jest.fn();
    mockKubeConfig.prototype.loadFromOptions = mockLoadFromOptions;
    mockKubeConfig.prototype.makeApiClient = jest.fn().mockReturnValue(
      new mockBatchV1Api({
        baseServer: { makeRequestContext: jest.fn() },
        httpApi: { send: jest.fn() },
        middleware: [],
        authMethods: {},
      })
    );

    await createJob('123');

    expect(mockEKSClient.prototype.send).toHaveBeenCalledWith(expect.any(DescribeClusterCommand));
    expect(mockLoadFromOptions).toHaveBeenCalled();
    expect(mockKubeConfig.prototype.makeApiClient).toHaveBeenCalled();
  });

  it('should log an error if job creation fails', async () => {
    const error = new Error('Job creation error');
    mockEKSClient.prototype.send = jest.fn().mockRejectedValue(error);

    await createJob('123');
    expect(logger.error).toHaveBeenCalledWith(`Error creating job: ${error.message}`);
  });
});
