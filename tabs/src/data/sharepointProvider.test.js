const apiProvider = require('./apiProvider');
const provider = require('./sharepointProvider');

jest.mock('./apiProvider');

test('getSPUserByMail', () => {
  apiProvider.apiGet.mockImplementation(() => {
    return Promise.resolve({
      graphClientMessage: {
        value: [
          {
            id: 'userId',
          },
        ],
      },
    });
  });

  apiProvider.getConfiguration.mockImplementation(() => {
    return Promise.resolve({
      graphClientMessage: {
        value: [
          {
            fields: {
              Title: 'SharepointSiteId',
              Value: '',
            },
          },
        ],
      },
    });
  });

  provider.getSPUserByMail().then((data) =>
    expect(data).toEqual({
      id: 'userId',
    }),
  );
});
