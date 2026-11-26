/**
 * GigSync Live - API HTTP del servicio de reservas (Booking Service)
 * Arquitectura de Software II - ITM
 *
 * Punto de entrada que se despliega en Azure App Service (Linux, Node LTS).
 * Usa solo el módulo nativo `http` de Node.js para no agregar dependencias
 * adicionales a la superficie de ataque analizada por OWASP Dependency-Check.
 *
 * Endpoints:
 *   GET    /                         -> Información del servicio
 *   GET    /health                   -> Health check (usado por el smoke test del pipeline)
 *   GET    /api/bookings             -> Lista de reservas
 *   POST   /api/bookings             -> Crea una reserva
 *   GET    /api/bookings/:id         -> Consulta una reserva
 *   PATCH  /api/bookings/:id/status  -> Transiciona el estado de una reserva
 */

const http = require('node:http');
const BookingService = require('./bookingService');
const { version } = require('../package.json');

const MAX_BODY_BYTES = 10 * 1024;
const BOOKING_ROUTE = /^\/api\/bookings\/([A-Za-z0-9_-]+)$/;
const BOOKING_STATUS_ROUTE = /^\/api\/bookings\/([A-Za-z0-9_-]+)\/status$/;

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (tooLarge) {
        reject(new HttpError(413, 'El cuerpo de la petición supera el tamaño permitido'));
        return;
      }
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(new HttpError(400, 'El cuerpo de la petición no es un JSON válido'));
      }
    });

    req.on('error', reject);
  });
}

function createApp({ bookingService = new BookingService() } = {}) {
  const bookings = new Map();
  const startedAt = Date.now();

  async function handleBookingsCollection(req, res) {
    if (req.method === 'GET') {
      sendJson(res, 200, { total: bookings.size, items: [...bookings.values()] });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      let booking;
      try {
        booking = bookingService.createBooking({
          organizerId: bookingService.sanitizeInput(body.organizerId),
          artistId: bookingService.sanitizeInput(body.artistId),
          eventDate: body.eventDate,
          fee: Number(body.fee)
        });
      } catch (error) {
        throw new HttpError(400, error.message);
      }
      bookings.set(booking.id, booking);
      sendJson(res, 201, booking);
      return;
    }

    throw new HttpError(405, `Método ${req.method} no permitido`);
  }

  async function handleBookingStatus(req, res, bookingId) {
    if (req.method !== 'PATCH') {
      throw new HttpError(405, `Método ${req.method} no permitido`);
    }

    const booking = bookings.get(bookingId);
    if (!booking) {
      throw new HttpError(404, `La reserva ${bookingId} no existe`);
    }

    const body = await readJsonBody(req);
    try {
      bookingService.transitionStatus(
        booking,
        bookingService.sanitizeInput(body.status),
        bookingService.sanitizeInput(body.reason || '')
      );
    } catch (error) {
      throw new HttpError(409, error.message);
    }
    sendJson(res, 200, booking);
  }

  function handleSingleBooking(req, res, bookingId) {
    if (req.method !== 'GET') {
      throw new HttpError(405, `Método ${req.method} no permitido`);
    }

    const booking = bookings.get(bookingId);
    if (!booking) {
      throw new HttpError(404, `La reserva ${bookingId} no existe`);
    }
    sendJson(res, 200, booking);
  }

  async function route(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && pathname === '/') {
      sendJson(res, 200, {
        service: 'GigSync Live - Booking Service',
        version,
        status: 'running',
        endpoints: ['/health', '/api/bookings', '/api/bookings/:id', '/api/bookings/:id/status']
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      sendJson(res, 200, {
        status: 'UP',
        version,
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/api/bookings') {
      await handleBookingsCollection(req, res);
      return;
    }

    const statusMatch = pathname.match(BOOKING_STATUS_ROUTE);
    if (statusMatch) {
      await handleBookingStatus(req, res, statusMatch[1]);
      return;
    }

    const bookingMatch = pathname.match(BOOKING_ROUTE);
    if (bookingMatch) {
      handleSingleBooking(req, res, bookingMatch[1]);
      return;
    }

    throw new HttpError(404, 'Recurso no encontrado');
  }

  return async function app(req, res) {
    try {
      await route(req, res);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 500) {
        console.error('Error no controlado:', error);
      }
      sendJson(res, statusCode, {
        error: statusCode === 500 ? 'Error interno del servidor' : error.message
      });
    }
  };
}

function createServer(options) {
  return http.createServer(createApp(options));
}

/* istanbul ignore next -- arranque real del proceso, no se ejecuta en las pruebas unitarias */
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`GigSync Live Booking Service v${version} escuchando en el puerto ${port}`);
  });
}

module.exports = { createApp, createServer, HttpError };
