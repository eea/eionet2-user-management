describe('apiProvider', () => {
  const requestMock = jest.fn();
  const initializeMock = jest.fn();
  const getAuthTokenMock = jest.fn();

  const loadModule = () => {
    jest.resetModules();
    process.env.REACT_APP_FUNC_ENDPOINT = 'https://func.example';
    process.env.REACT_APP_SHAREPOINT_SITE_ID = 'sp-site-id';
    process.env.REACT_APP_CONFIGURATION_LIST_ID = 'cfg-list-id';

    jest.doMock('@microsoft/teams-js', () => ({
      app: { initialize: initializeMock },
      authentication: { getAuthToken: getAuthTokenMock },
    }));

    jest.doMock('axios', () => ({
      __esModule: true,
      default: { request: requestMock },
    }));

    return require('./apiProvider');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    initializeMock.mockResolvedValue(undefined);
    getAuthTokenMock.mockResolvedValue('teams-token');
    requestMock.mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    delete process.env.REACT_APP_FUNC_ENDPOINT;
    delete process.env.REACT_APP_SHAREPOINT_SITE_ID;
    delete process.env.REACT_APP_CONFIGURATION_LIST_ID;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test('apiGet calls the function endpoint with teams auth', async () => {
    const provider = loadModule();
    requestMock.mockResolvedValue({ data: { graphClientMessage: { value: [] } } });

    const result = await provider.apiGet('/users', 'user');

    expect(result).toEqual({ graphClientMessage: { value: [] } });
    expect(initializeMock).toHaveBeenCalled();
    expect(getAuthTokenMock).toHaveBeenCalled();
    expect(requestMock).toHaveBeenCalledWith({
      method: 'get',
      url: 'https://func.example/api/graphData',
      headers: {
        authorization: 'Bearer teams-token',
      },
      data: undefined,
      params: {
        path: '/users',
        credentialType: 'user',
      },
    });
  });

  test('apiPost sends payload through the graphData endpoint', async () => {
    const provider = loadModule();

    await provider.apiPost('/users', { displayName: 'Alice' });

    expect(requestMock).toHaveBeenCalledWith({
      method: 'post',
      url: 'https://func.example/api/graphData',
      headers: {
        authorization: 'Bearer teams-token',
      },
      data: {
        credentialType: 'app',
        data: { displayName: 'Alice' },
        path: '/users',
      },
      params: undefined,
    });
  });

  test('apiPatch includes the eTag when provided', async () => {
    const provider = loadModule();

    await provider.apiPatch('/users/1', { country: 'RO' }, 'etag-1', 'user');

    expect(requestMock).toHaveBeenCalledWith({
      method: 'patch',
      url: 'https://func.example/api/graphData',
      headers: {
        authorization: 'Bearer teams-token',
      },
      data: {
        credentialType: 'user',
        data: { country: 'RO' },
        path: '/users/1',
        eTag: 'etag-1',
      },
      params: undefined,
    });
  });

  test('apiDelete sends delete requests through the function endpoint', async () => {
    const provider = loadModule();

    await provider.apiDelete('/users/1');

    expect(requestMock).toHaveBeenCalledWith({
      method: 'delete',
      url: 'https://func.example/api/graphData',
      headers: {
        authorization: 'Bearer teams-token',
      },
      data: {
        credentialType: 'app',
        path: '/users/1',
      },
      params: undefined,
    });
  });

  test('getUserMail caches the resolved mail address', async () => {
    const provider = loadModule();
    requestMock.mockResolvedValue({
      data: {
        graphClientMessage: {
          mail: 'user@example.com',
        },
      },
    });

    await expect(provider.getUserMail()).resolves.toBe('user@example.com');
    await expect(provider.getUserMail()).resolves.toBe('user@example.com');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  test('getConfiguration loads and caches the sharepoint configuration', async () => {
    const provider = loadModule();
    requestMock.mockResolvedValue({
      data: {
        graphClientMessage: {
          value: [
            { fields: { Title: 'LoggingListId', Value: 'log-list-id' } },
            { fields: { Title: 'UserListId', Value: 'user-list-id' } },
          ],
        },
      },
    });

    const config = await provider.getConfiguration();

    expect(config).toEqual({
      LoggingListId: 'log-list-id',
      UserListId: 'user-list-id',
      SharepointSiteId: 'sp-site-id',
    });

    await provider.getConfiguration();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  test('getConfiguration returns undefined when loading fails', async () => {
    const provider = loadModule();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    requestMock.mockResolvedValue({ data: {} });

    await expect(provider.getConfiguration()).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
  });

  test('logError writes an error entry when configuration is available', async () => {
    const provider = loadModule();
    requestMock
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            value: [{ fields: { Title: 'LoggingListId', Value: 'log-list-id' } }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            mail: 'user@example.com',
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true } });

    await provider.getConfiguration();

    await provider.logError(
      {
        response: {
          data: {
            error: { body: 'Detailed error' },
          },
        },
      },
      '/users',
      { value: 1 },
    );

    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        method: 'post',
        url: 'https://func.example/api/graphData',
        data: {
          credentialType: 'app',
          data: {
            fields: expect.objectContaining({
              ApplicationName: 'Eionet2-User-Management',
              ApiPath: '/users',
              ApiData: JSON.stringify({ value: 1 }),
              Title: 'Detailed error',
              UserMail: 'user@example.com',
              Logtype: 'Error',
              Timestamp: expect.any(Date),
            }),
          },
          path: '/sites/sp-site-id/lists/log-list-id/items',
        },
      }),
    );
  });

  test('logError uses the missing-index message when present', async () => {
    const provider = loadModule();
    requestMock
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            value: [{ fields: { Title: 'LoggingListId', Value: 'log-list-id' } }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            mail: 'user@example.com',
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true } });

    await provider.getConfiguration();

    await provider.logError(
      {
        message: 'fallback message',
        response: {
          data: {
            message: 'HonorNonIndexedQueriesWarningMayFailRandomly happened',
          },
        },
      },
      '/users',
      null,
    );

    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: {
          credentialType: 'app',
          data: {
            fields: expect.objectContaining({
              Title: 'HonorNonIndexedQueriesWarningMayFailRandomly happened',
            }),
          },
          path: '/sites/sp-site-id/lists/log-list-id/items',
        },
      }),
    );
  });

  test('logError falls back to console when configuration is not loaded', async () => {
    const provider = loadModule();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    requestMock.mockResolvedValueOnce({
      data: {
        graphClientMessage: {
          mail: 'user@example.com',
        },
      },
    });

    await provider.logError({ message: 'failed' }, '/users', {});

    expect(consoleSpy).toHaveBeenCalledWith('Configuration not loaded cannot proceed');
  });

  test('logInfo writes an info entry and can skip the email address', async () => {
    const provider = loadModule();
    requestMock
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            value: [{ fields: { Title: 'LoggingListId', Value: 'log-list-id' } }],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          graphClientMessage: {
            mail: 'user@example.com',
          },
        },
      })
      .mockResolvedValueOnce({ data: { ok: true } })
      .mockResolvedValueOnce({ data: { ok: true } });

    await provider.getConfiguration();

    await provider.logInfo('Created user', '/users', { id: 1 }, 'create', 'other@example.com');
    await provider.logInfo(
      'Created user',
      '/users',
      { id: 1 },
      'create',
      'other@example.com',
      true,
    );

    expect(requestMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: {
          credentialType: 'app',
          data: {
            fields: expect.objectContaining({
              Title: 'Created user',
              UserMail: 'user@example.com',
              Logtype: 'Info',
              Action: 'create',
              AffectedUser: 'other@example.com',
              Timestamp: expect.any(Date),
            }),
          },
          path: '/sites/sp-site-id/lists/log-list-id/items',
        },
      }),
    );
    expect(requestMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        data: {
          credentialType: 'app',
          data: {
            fields: expect.objectContaining({
              UserMail: '',
            }),
          },
          path: '/sites/sp-site-id/lists/log-list-id/items',
        },
      }),
    );
  });
});
