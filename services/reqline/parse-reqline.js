const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const httpRequest = require('@app-core/http-request');
const ReqlineMessages = require('@app-core/messages/reqline');

async function parseReqline({ reqline }) {
  console.log('Input reqline:', reqline);
  const startTimestamp = Date.now();

  // Split the reqline by pipe delimiter and normalize whitespace
  const parts = reqline
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  console.log('Parts:', parts);

  // Validate minimum parts (HTTP and URL)
  if (parts.length < 2) {
    throwAppError(ReqlineMessages.MISSING_REQUIRED_KEYWORD, ERROR_CODE.INVLDREQ || 'BADREQERR');
  }

  // Initialize request object
  const request = {
    query: {},
    body: {},
    headers: {},
    full_url: '',
  };

  let method;
  let url;

  // Parse each part
  for (let i = 0; i < parts.length; i++) {
    // Split on first space only to allow for URLs with spaces
    const [keyword, ...valueParts] = parts[i].split(' ');
    const value = valueParts.join(' '); // Rejoin remaining parts for URL or JSON
    console.log(`Part ${i}: keyword=${keyword}, value=${value}`);

    // Validate keyword and value existence
    if (!keyword || !value) {
      throwAppError(ReqlineMessages.INVALID_SPACING, ERROR_CODE.INVLDREQ || 'BADREQERR');
    }

    // Validate keyword is uppercase
    if (keyword !== keyword.toUpperCase()) {
      throwAppError(ReqlineMessages.KEYWORDS_UPPERCASE, ERROR_CODE.INVLDREQ || 'BADREQERR');
    }

    switch (keyword) {
      case 'HTTP':
        if (i !== 0) {
          throwAppError(ReqlineMessages.HTTP_FIRST, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        method = value;
        if (!['GET', 'POST'].includes(method)) {
          throwAppError(ReqlineMessages.INVALID_HTTP_METHOD, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        break;
      case 'URL':
        if (i !== 1) {
          throwAppError(ReqlineMessages.URL_SECOND, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        url = value;
        request.full_url = value;
        break;
      case 'QUERY':
        try {
          request.query = JSON.parse(value);
        } catch (e) {
          console.log('QUERY parse error:', e.message);
          throwAppError(ReqlineMessages.INVALID_QUERY_JSON, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        break;
      case 'HEADERS':
        try {
          request.headers = JSON.parse(value);
        } catch (e) {
          console.log('HEADERS parse error:', e.message);
          throwAppError(ReqlineMessages.INVALID_HEADERS_JSON, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        break;
      case 'BODY':
        try {
          request.body = JSON.parse(value);
        } catch (e) {
          console.log('BODY parse error:', e.message);
          throwAppError(ReqlineMessages.INVALID_BODY_JSON, ERROR_CODE.INVLDREQ || 'BADREQERR');
        }
        break;
      default:
        throwAppError(ReqlineMessages.UNKNOWN_KEYWORD, ERROR_CODE.INVLDREQ || 'BADREQERR');
    }
  }

  // Validate required keywords
  if (!method) {
    throwAppError(ReqlineMessages.MISSING_HTTP_KEYWORD, ERROR_CODE.INVLDREQ || 'BADREQERR');
  }
  if (!url) {
    throwAppError(ReqlineMessages.MISSING_URL_KEYWORD, ERROR_CODE.INVLDREQ || 'BADREQERR');
  }

  // Build full URL with query parameters
  if (Object.keys(request.query).length > 0) {
    const queryString = Object.entries(request.query)
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      .join('&');
    request.full_url += `?${queryString}`;
  }

  // Make HTTP request
  try {
    const response = await httpRequest({
      method: method.toLowerCase(),
      url: request.full_url,
      headers: request.headers,
      data: method === 'POST' ? request.body : undefined,
    });

    const stopTimestamp = Date.now();
    return {
      request,
      response: {
        http_status: response.status,
        duration: stopTimestamp - startTimestamp,
        request_start_timestamp: startTimestamp,
        request_stop_timestamp: stopTimestamp,
        response_data: response.data,
      },
    };
  } catch (error) {
    console.log('HTTP request error:', error.message);
    throwAppError(ReqlineMessages.INTERNAL_REQ_ERROR, ERROR_CODE.INVLDREQ);
  }
}

module.exports = parseReqline;
