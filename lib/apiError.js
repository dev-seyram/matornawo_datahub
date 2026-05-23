export function sendError(res, error, context) {
  console.error(
    JSON.stringify({
      level: 'error',
      context,
      message: error?.message ?? String(error),
    })
  );
  return res.status(500).json({ error: 'Internal server error' });
}
