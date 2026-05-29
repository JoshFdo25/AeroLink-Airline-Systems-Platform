import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {}

  onModuleInit() {
    this.logger.log('Initializing Gmail SMTP Transporter...');
    
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn('SMTP_USER or SMTP_PASS not found in environment variables! Email delivery will fail.');
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('Gmail SMTP transporter initialized successfully!');
  }

  @OnEvent('notification.send_email')
  async handleSendEmail(payload: {
    passengerId: string;
    subject: string;
    type: 'BOOKING_CONFIRMED' | 'FLIGHT_STATUS_UPDATED';
    data: any;
  }) {
    this.logger.log(`Received notification request for passenger ${payload.passengerId}`);

    // Lookup user in PostgreSQL
    const user = await this.prisma.passenger.findUnique({
      where: { id: payload.passengerId }
    });

    if (!user) {
      this.logger.error(`User ${payload.passengerId} not found. Cannot send email.`);
      return;
    }

    let htmlBody = '';

    if (payload.type === 'BOOKING_CONFIRMED') {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border: 1px solid #1e293b; border-radius: 12px;">
          <h2 style="color: #22d3ee; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">Booking Confirmed!</h2>
          <p>Hi <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>Your flight has been successfully booked. Here are your details:</p>
          <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #fff;"><strong>Flight ID:</strong> ${payload.data.flightId}</p>
            <p style="margin: 5px 0; color: #fff;"><strong>Seat Number:</strong> <span style="color: #fbbf24;">${payload.data.seatNumber}</span></p>
            <p style="margin: 5px 0; color: #fff;"><strong>Total Price:</strong> $${payload.data.price}</p>
          </div>
          <p>Thank you for flying with AeroLink.</p>
        </div>
      `;
    } else if (payload.type === 'FLIGHT_STATUS_UPDATED') {
      htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #020617; color: #f8fafc; border: 1px solid #1e293b; border-radius: 12px;">
          <h2 style="color: #fbbf24; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">Flight Status Update</h2>
          <p>Hi <strong>${user.firstName} ${user.lastName}</strong>,</p>
          <p>There is an update regarding your upcoming flight <strong>${payload.data.flightId}</strong>.</p>
          <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34d399;">
            <p style="margin: 5px 0; font-size: 18px; color: #fff;"><strong>New Status:</strong> <span style="color: #34d399;">${payload.data.status}</span></p>
          </div>
          <p>Please check your passenger dashboard for more real-time details.</p>
        </div>
      `;
    }

    try {
      const info = await this.transporter.sendMail({
        from: '"AeroLink Notifications" <' + this.configService.get<string>('SMTP_USER') + '>',
        to: user.email,
        subject: payload.subject,
        html: htmlBody,
      });

      this.logger.log(`📧 Email delivered successfully to ${user.email}! (MessageId: ${info.messageId})`);
    } catch (error) {
      this.logger.error('Error sending email', error);
    }
  }
}
