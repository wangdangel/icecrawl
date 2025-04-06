export const httpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

export const createHttpClient = jest.fn().mockReturnValue(httpClient);
