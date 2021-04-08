import { RequestHandler } from 'express';

/**
 * Filter middleware that acts as a filter to filter messages
 */
function filterMiddleware(filterArray: string[]): RequestHandler {
  return (req, res, next): void => {
    let filtered: boolean = false;

    const message = req.query.text;

    if (typeof message !== 'string') {
      // return response 422
      res.status(422);
      res.send({
        error: 'Invalid payload structure',
      });
      return;
    }

    if (message.length === 0) {
      res.status(422);
      res.send({
        error: 'Message should be longer than 0 characters',
      });
      return;
    }

    // Iterate through request query (check words)
    for (let i = 0; i < filterArray.length; i++) {
      const str = filterArray[i];
      if (str.length === 0) continue;
      const re = new RegExp(str.replace(/(\r\n|\n|\r)/gm, ''), 'igm');
      if (re.test(message)) {
        filtered = true;
        break;
      }
    }

    // If filtered, send response with error status
    if (filtered) {
      // return 403
      res.status(403);
      res.send({
        error: 'Forbidden words detected',
      });
      return;
    } else {
      next();
    }
  };
}

export { filterMiddleware };
