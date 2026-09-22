/**
 * 30-Second Request Timeout Middleware (Defends against Slowloris & hung sockets)
 */
function requestTimeoutMiddleware(timeoutMs = 30000) {
  return (req, res, next) => {
    // Webhooks or long uploads can have an extended 60s window
    const duration = req.originalUrl?.includes('/upload') ? 60000 : timeoutMs;

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'GATEWAY_TIMEOUT',
          message: 'The request took too long to process. Please try again.'
        });
      }
    }, duration);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = requestTimeoutMiddleware;
