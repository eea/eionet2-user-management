const provider = require('./provider');

jest.mock('./provider')


provider.getUser.mockResolvedValue({

});