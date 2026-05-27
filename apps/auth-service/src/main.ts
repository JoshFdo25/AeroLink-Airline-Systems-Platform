import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('AeroLink Auth & Passenger Service')
    .setDescription('Manages user registration, JWT authentication, RBAC, and Event-Driven KYC compliance.')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('passengers')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Run on port 3002 to avoid conflicts with Flight Service (3001)
  await app.listen(3002);
  console.log('Auth Service is running on: http://localhost:3002');
  console.log('Swagger UI is available at: http://localhost:3002/api');
}
bootstrap();
