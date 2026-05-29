import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/flights'
})
export class FlightGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FlightGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to Flight WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Broadcasts seat status update to all connected clients
  // status: 'AVAILABLE' | 'LOCKED' | 'BOOKED'
  broadcastSeatStatus(flightId: string, seatNumber: string, status: string) {
    this.server.emit('seat.status.updated', { flightId, seatNumber, status });
  }

  // Broadcasts flight status updates
  broadcastFlightStatus(flightId: string, status: string, flightNumber: string) {
    this.server.emit('flight.status.updated', { flightId, status, flightNumber });
  }
}
