function errorHandler(err, req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.expose ? err.message : 'Internal server error';
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.status(404).send('Not found');
}

module.exports = { errorHandler, notFound };
