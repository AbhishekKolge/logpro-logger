const axios = require('axios').default;

const logProUrl =
  'https://log-pro-backend-production.up.railway.app/api/v1/logs';

const logProLogger = ({ key }) => {
  const log = async (request, response, data, requestStart) => {
    const { rawHeaders, httpVersion, method, socket, url } = request;
    const { remoteAddress, remoteFamily } = socket;
    const { statusCode, statusMessage } = response;
    const responseHeaders = response.getHeaders();

    const body = {
      timestamp: new Date(requestStart),
      processingTime: Date.now() - requestStart,
      rawHeaders: JSON.stringify(rawHeaders),
      body: JSON.stringify(request.body),
      httpVersion,
      method,
      remoteAddress,
      remoteFamily,
      url,
      statusCode,
      statusMessage,
      headers: JSON.stringify(responseHeaders),
      errorData: statusMessage !== 'OK' ? data : '',
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Auth-Token': key,
    };

    try {
      const ip = await axios('https://api.ipify.org?format=json');
      await axios.post(
        logProUrl,
        { ...body, remoteAddress: ip },
        {
          headers,
        }
      );
    } catch (error) {
      console.log(error.message);
    }
  };

  return (request, response, next) => {
    const requestStart = Date.now();
    let oldSend = response.send;
    response.send = function (data) {
      oldSend.apply(response, arguments);
      log(request, response, data, requestStart);
    };
    next();
  };
};

module.exports = logProLogger;
