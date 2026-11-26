/**
 * Test Suite - GigSync Live HTTP API (src/server.js)
 * Arquitectura de Software II - ITM
 * Valida los endpoints que se despliegan en Azure App Service.
 */

const { createServer } = require('../src/server');

describe('GigSync Live - HTTP API', () => {
  let server;
  let baseUrl;

  const validBooking = {
    organizerId: 'ORG-101',
    artistId: 'ART-202',
    eventDate: '2026-12-15T20:00:00Z',
    fee: 1500000
  };

  const request = (path, { method = 'GET', body, rawBody } = {}) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined
    });

  beforeAll(async () => {
    server = createServer();
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET / responde con la información del servicio', async () => {
    const res = await request('/');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('running');
    expect(body.endpoints).toContain('/health');
  });

  test('GET /health responde UP (usado por el smoke test del despliegue)', async () => {
    const res = await request('/health');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('UP');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  test('POST /api/bookings crea una reserva y sanitiza los identificadores', async () => {
    const res = await request('/api/bookings', {
      method: 'POST',
      body: { ...validBooking, artistId: "<ART-'202'>" }
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('SOLICITADA');
    expect(body.artistId).toBe('ART-202');
    expect(body.totalAmount).toBe(1650000);
  });

  test('POST /api/bookings con datos incompletos responde 400', async () => {
    const res = await request('/api/bookings', { method: 'POST', body: { organizerId: 'ORG-1' } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch('Datos de reserva incompletos');
  });

  test('POST /api/bookings sin cuerpo responde 400', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, { method: 'POST' });
    expect(res.status).toBe(400);
  });

  test('POST /api/bookings con JSON inválido responde 400', async () => {
    const res = await request('/api/bookings', { method: 'POST', rawBody: '{json-invalido' });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('El cuerpo de la petición no es un JSON válido');
  });

  test('POST /api/bookings con un cuerpo demasiado grande responde 413', async () => {
    const res = await request('/api/bookings', {
      method: 'POST',
      body: { ...validBooking, padding: 'x'.repeat(20 * 1024) }
    });

    expect(res.status).toBe(413);
  });

  test('GET /api/bookings lista las reservas creadas', async () => {
    const res = await request('/api/bookings');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.items)).toBe(true);
  });

  test('GET /api/bookings/:id devuelve la reserva o 404 si no existe', async () => {
    const created = await (await request('/api/bookings', { method: 'POST', body: validBooking })).json();

    const found = await request(`/api/bookings/${created.id}`);
    expect(found.status).toBe(200);
    expect((await found.json()).id).toBe(created.id);

    const missing = await request('/api/bookings/BK-NO-EXISTE');
    expect(missing.status).toBe(404);
  });

  test('PATCH /api/bookings/:id/status aplica una transición válida', async () => {
    const created = await (await request('/api/bookings', { method: 'POST', body: validBooking })).json();

    const res = await request(`/api/bookings/${created.id}/status`, {
      method: 'PATCH',
      body: { status: 'CONFIRMADA', reason: 'Artista aceptó' }
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('CONFIRMADA');
    expect(body.statusReason).toBe('Artista aceptó');
  });

  test('PATCH /api/bookings/:id/status rechaza transiciones inválidas con 409', async () => {
    const created = await (await request('/api/bookings', { method: 'POST', body: validBooking })).json();

    const res = await request(`/api/bookings/${created.id}/status`, {
      method: 'PATCH',
      body: { status: 'FINALIZADA' }
    });

    expect(res.status).toBe(409);
  });

  test('PATCH /api/bookings/:id/status sobre una reserva inexistente responde 404', async () => {
    const res = await request('/api/bookings/BK-NO-EXISTE/status', {
      method: 'PATCH',
      body: { status: 'CONFIRMADA' }
    });

    expect(res.status).toBe(404);
  });

  test('métodos no soportados responden 405', async () => {
    expect((await request('/api/bookings', { method: 'DELETE' })).status).toBe(405);
    expect((await request('/api/bookings/BK-1', { method: 'DELETE' })).status).toBe(405);
    expect((await request('/api/bookings/BK-1/status', { method: 'GET' })).status).toBe(405);
  });

  test('rutas desconocidas responden 404', async () => {
    const res = await request('/ruta/inexistente');
    expect(res.status).toBe(404);
  });

  test('errores no controlados responden 500 sin exponer detalles internos', async () => {
    // Servicio defectuoso: createBooking no retorna la reserva, lo que provoca un
    // TypeError inesperado (no es un HttpError) dentro del handler.
    const brokenService = {
      sanitizeInput: (value) => value,
      createBooking: () => undefined
    };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failingServer = createServer({ bookingService: brokenService });
    await new Promise((resolve) => failingServer.listen(0, '127.0.0.1', resolve));
    const failingUrl = `http://127.0.0.1:${failingServer.address().port}`;

    const res = await fetch(`${failingUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBooking)
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Error interno del servidor');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    await new Promise((resolve) => failingServer.close(resolve));
  });
});
