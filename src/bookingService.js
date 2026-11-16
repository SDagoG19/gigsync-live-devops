/**
 * GigSync Live - Booking & Contract Domain Service
 * Arquitectura de Software II - ITM
 * Autores: Sebastián Dávila, Luisa María Puentes, Franco Moncayo
 */

class BookingService {
  constructor(kafkaProducer = null, dbClient = null) {
    this.kafkaProducer = kafkaProducer;
    this.dbClient = dbClient;
    this.validTransitions = {
      'SOLICITADA': ['CONFIRMADA', 'RECHAZADA', 'CANCELADA'],
      'CONFIRMADA': ['PAGADA', 'CANCELADA'],
      'PAGADA': ['EN_CURSO', 'CANCELADA'],
      'EN_CURSO': ['FINALIZADA'],
      'FINALIZADA': [],
      'RECHAZADA': [],
      'CANCELADA': []
    };
  }

  /**
   * Crea una nueva solicitud de contratación entre organizador y artista
   */
  createBooking(data) {
    if (!data.organizerId || !data.artistId || !data.eventDate || !data.fee) {
      throw new Error('Datos de reserva incompletos: organizerId, artistId, eventDate y fee son obligatorios');
    }

    if (data.fee <= 0) {
      throw new Error('El valor del contrato (fee) debe ser mayor a cero');
    }

    const eventDate = new Date(data.eventDate);
    if (isNaN(eventDate.getTime())) {
      throw new Error('Formato de fecha inválido');
    }

    const commission = this.calculateCommission(data.fee);
    const totalAmount = data.fee + commission;

    const booking = {
      id: data.id || `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      organizerId: data.organizerId,
      artistId: data.artistId,
      eventDate: eventDate.toISOString(),
      fee: data.fee,
      commission,
      totalAmount,
      status: 'SOLICITADA',
      createdAt: new Date().toISOString()
    };

    if (this.kafkaProducer) {
      this.emitAuditEvent('BOOKING_CREATED', booking);
    }

    return booking;
  }

  /**
   * Calcula la tarifa de comisión de la plataforma GigSync (10%)
   */
  calculateCommission(fee) {
    const COMMISSION_RATE = 0.10;
    return Math.round(fee * COMMISSION_RATE * 100) / 100;
  }

  /**
   * Transiciona el estado de la reserva validando la máquina de estados
   */
  transitionStatus(booking, newStatus, reason = '') {
    if (!booking || !booking.status) {
      throw new Error('Reserva inválida');
    }

    const currentStatus = booking.status;
    const allowed = this.validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new Error(`Transición inválida: No se permite pasar de ${currentStatus} a ${newStatus}`);
    }

    booking.status = newStatus;
    booking.updatedAt = new Date().toISOString();
    booking.statusReason = reason;

    if (this.kafkaProducer) {
      this.emitAuditEvent('BOOKING_STATUS_CHANGED', {
        bookingId: booking.id,
        previousStatus: currentStatus,
        newStatus,
        reason,
        timestamp: booking.updatedAt
      });
    }

    return booking;
  }

  /**
   * Emite el evento de auditoría asíncrono hacia Apache Kafka
   */
  emitAuditEvent(eventType, payload) {
    try {
      if (this.kafkaProducer && typeof this.kafkaProducer.send === 'function') {
        this.kafkaProducer.send({
          topic: 'gigsync-booking-events',
          messages: [
            {
              key: String(payload.id || payload.bookingId),
              value: JSON.stringify({
                eventType,
                payload,
                timestamp: new Date().toISOString()
              })
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error al despachar evento Kafka:', error.message);
    }
  }

  /**
   * Valida parámetros contra inyecciones y sanitiza texto
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>'"`/\\;]/g, '').trim();
  }
}

module.exports = BookingService;
