import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('AeroLink Booking & Ticketing Service')
    .setDescription('Core transaction system implementing CQRS and Distributed Saga Choreography.')
    .setVersion('1.0')
    .addTag('bookings')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Run on port 3003
  await app.listen(3003);
  console.log('Booking Service is running on: http://localhost:3003');
  console.log('Swagger UI is available at: http://localhost:3003/api');
}
bootstrap();
