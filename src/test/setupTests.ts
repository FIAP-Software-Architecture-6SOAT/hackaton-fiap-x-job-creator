jest.mock('@kubernetes/client-node', () => ({
  // Mock the necessary exports from the module
  KubeConfig: jest.fn(),
  CoreV1Api: jest.fn(),
  AppsV1Api: jest.fn(),
  BatchV1Api: jest.fn().mockImplementation(() => ({
    createNamespacedJob: jest.fn(),
  })),
}));
