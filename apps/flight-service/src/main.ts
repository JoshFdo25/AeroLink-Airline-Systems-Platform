import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Next.js frontend
  app.enableCors();

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('AeroLink Flight Operations API')
    .setDescription('The API for managing flight schedules, routes, and pricing. Integrates CQRS concepts and Redis caching for high-performance reads.')
    .setVersion('1.0')
    .addTag('flights')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Run on port 3001 to avoid conflicts with other microservices
  await app.listen(3001);
  console.log('Flight Operations Service is running on: http://localhost:3001');
  console.log('Swagger UI is available at: http://localhost:3001/api');
}
bootstrap();
