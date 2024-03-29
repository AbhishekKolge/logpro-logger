const axios = require('axios').default;

const logProUrl =
  'https://log-pro-server.onrender.com/api/v1/logs';

const logProLogger = ({ key, type = 'development' }) => {
  const log = async (request, response, data, requestStart) => {
    const { rawHeaders, httpVersion, method, socket, url } = request;
    const { remoteAddress, remoteFamily } = socket;
    const { statusCode, statusMessage } = response;
    const responseHeaders = response.getHeaders();

    const headersObject = {};

    for (let i = 0; i < rawHeaders.length; i += 2) {
      const key = rawHeaders[i];
      const value = rawHeaders[i + 1];
      headersObject[key] = value;
    }

    let trueClientIp = headersObject['True-Client-Ip'];

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
      if (type !== 'development') {
        if (!trueClientIp) {
          const ipDataRes = await axios('https://api.ipify.org?format=json');
          if (ipDataRes?.data?.ip) {
            trueClientIp = ipDataRes.data.ip;
          }
        }

        await axios.post(
          logProUrl,
          { ...body, remoteAddress: trueClientIp || remoteAddress },
          {
            headers,
          }
        );
        return;
      }
      console.log(
        JSON.stringify({
          ...body,
          remoteAddress: trueClientIp || remoteAddress,
        })
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
