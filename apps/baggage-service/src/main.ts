import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('AeroLink Baggage Tracking Service')
    .setDescription('High-throughput NoSQL tracking with Real-Time WebSockets')
    .setVersion('1.0')
    .addTag('baggage')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Run on port 3004
  await app.listen(3004);
  console.log('Baggage Tracking Service is running on: http://localhost:3004');
  console.log('Swagger UI is available at: http://localhost:3004/api');
  console.log('WebSocket Server running on ws://localhost:3004');
}
bootstrap();
