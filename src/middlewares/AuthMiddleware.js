const jwt = require('jsonwebtoken');

module.exports = (request, response, next) => {
  const { authorization } = request.headers;

  if (!authorization) {
    return response.status(400).send({
      error: 'NO_TOKEN_FOUND',
    });
  }

  const token = authorization.replace('Bearer ', '');

  if (!token) {
    return response.status(400).send({
      error: 'NO_TOKEN_FOUND',
    });
  }

  try {
    jwt.verify(token, process.env.API_PASSWORD);
    return next();
  } catch (e) {
    return response.status(400).send({
      error: 'INVALID_TOKEN',
    });
  }
};
