/**
 * Test Suite - GigSync Live Booking Service
 * Arquitectura de Software II - ITM
 * Cobertura de Pruebas Unitarias requerida por Pipeline: >= 80%
 */

const BookingService = require('../src/bookingService');

describe('GigSync Live - BookingService Unit Tests', () => {
  let bookingService;
  let mockKafkaProducer;

  beforeEach(() => {
    mockKafkaProducer = {
      send: jest.fn().mockResolvedValue(true)
    };
    bookingService = new BookingService(mockKafkaProducer);
  });

  describe('createBooking()', () => {
    test('debe crear exitosamente una reserva con estado inicial SOLICITADA', () => {
      const payload = {
        organizerId: 'ORG-101',
        artistId: 'ART-202',
        eventDate: '2026-12-15T20:00:00Z',
        fee: 5000000
      };

      const booking = bookingService.createBooking(payload);

      expect(booking).toBeDefined();
      expect(booking.organizerId).toBe('ORG-101');
      expect(booking.artistId).toBe('ART-202');
      expect(booking.fee).toBe(5000000);
      expect(booking.commission).toBe(500000); // 10% de comisión
      expect(booking.totalAmount).toBe(5500000);
      expect(booking.status).toBe('SOLICITADA');
      expect(mockKafkaProducer.send).toHaveBeenCalledTimes(1);
    });

    test('debe lanzar un error si faltan campos obligatorios', () => {
      expect(() => {
        bookingService.createBooking({ organizerId: 'ORG-101' });
      }).toThrow('Datos de reserva incompletos');
    });

    test('debe lanzar un error si el fee es menor o igual a cero', () => {
      expect(() => {
        bookingService.createBooking({
          organizerId: 'ORG-101',
          artistId: 'ART-202',
          eventDate: '2026-12-15T20:00:00Z',
          fee: -100
        });
      }).toThrow('El valor del contrato (fee) debe ser mayor a cero');
    });

    test('debe lanzar un error si el formato de la fecha es inválido', () => {
      expect(() => {
        bookingService.createBooking({
          organizerId: 'ORG-101',
          artistId: 'ART-202',
          eventDate: 'fecha-invalida-xyz',
          fee: 1000000
        });
      }).toThrow('Formato de fecha inválido');
    });
  });

  describe('calculateCommission()', () => {
    test('debe calcular exactamente el 10% de comisión redondeado', () => {
      expect(bookingService.calculateCommission(1000)).toBe(100);
      expect(bookingService.calculateCommission(2550.55)).toBe(255.06);
    });
  });

  describe('transitionStatus()', () => {
    test('debe permitir transicionar de SOLICITADA a CONFIRMADA', () => {
      const booking = bookingService.createBooking({
        organizerId: 'ORG-101',
        artistId: 'ART-202',
        eventDate: '2026-12-15T20:00:00Z',
        fee: 2000000
      });

      const updated = bookingService.transitionStatus(booking, 'CONFIRMADA', 'Artista aceptó la oferta');

      expect(updated.status).toBe('CONFIRMADA');
      expect(updated.statusReason).toBe('Artista aceptó la oferta');
      expect(mockKafkaProducer.send).toHaveBeenCalledTimes(2);
    });

    test('debe permitir el flujo completo: CONFIRMADA -> PAGADA -> EN_CURSO -> FINALIZADA', () => {
      let booking = bookingService.createBooking({
        organizerId: 'ORG-101',
        artistId: 'ART-202',
        eventDate: '2026-12-15T20:00:00Z',
        fee: 3000000
      });

      booking = bookingService.transitionStatus(booking, 'CONFIRMADA');
      expect(booking.status).toBe('CONFIRMADA');

      booking = bookingService.transitionStatus(booking, 'PAGADA');
      expect(booking.status).toBe('PAGADA');

      booking = bookingService.transitionStatus(booking, 'EN_CURSO');
      expect(booking.status).toBe('EN_CURSO');

      booking = bookingService.transitionStatus(booking, 'FINALIZADA');
      expect(booking.status).toBe('FINALIZADA');
    });

    test('debe rechazar una transición inválida (ej. SOLICITADA -> FINALIZADA)', () => {
      const booking = bookingService.createBooking({
        organizerId: 'ORG-101',
        artistId: 'ART-202',
        eventDate: '2026-12-15T20:00:00Z',
        fee: 2000000
      });

      expect(() => {
        bookingService.transitionStatus(booking, 'FINALIZADA');
      }).toThrow('Transición inválida: No se permite pasar de SOLICITADA a FINALIZADA');
    });

    test('debe lanzar error si el objeto de reserva es nulo o no contiene estado', () => {
      expect(() => {
        bookingService.transitionStatus(null, 'CONFIRMADA');
      }).toThrow('Reserva inválida');
    });
  });

  describe('sanitizeInput()', () => {
    test('debe limpiar caracteres especiales potencialmente peligrosos', () => {
      const dirty = "<script>alert('xss');</script>";
      const clean = bookingService.sanitizeInput(dirty);
      expect(clean).toBe('scriptalert(xss)script');
    });

    test('debe retornar el mismo valor si no es string', () => {
      expect(bookingService.sanitizeInput(12345)).toBe(12345);
      expect(bookingService.sanitizeInput(null)).toBeNull();
    });
  });

  describe('emitAuditEvent()', () => {
    test('debe manejar errores silenciosamente si el productor Kafka falla', () => {
      const brokenProducer = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('Kafka Connection Timeout');
        })
      };
      const service = new BookingService(brokenProducer);
      expect(() => {
        service.emitAuditEvent('TEST_EVENT', { id: 'BK-1' });
      }).not.toThrow();
    });
  });
});
