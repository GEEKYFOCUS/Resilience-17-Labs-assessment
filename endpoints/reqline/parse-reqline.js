const { createHandler } = require('@app-core/server');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const parseReqline = require('../../services/reqline/parse-reqline'); // Changed variable name

module.exports = createHandler({
  path: '/',
  method: 'post',
  async handler(rc, helpers) {
    const { reqline } = rc.body;
    if (!reqline) {
      throwAppError('Missing reqline in request body', 'MISSING_REQLINE');
    }
    const response = await parseReqline({ reqline });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: response,
    };
  },
});
