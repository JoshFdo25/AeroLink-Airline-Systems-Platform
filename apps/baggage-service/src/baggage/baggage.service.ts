import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { BaggageGateway } from './baggage.gateway';
import { CreateBaggageDto, UpdateBaggageStatusDto } from './dto/baggage.dto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

@Injectable()
export class BaggageService {
  private readonly logger = new Logger(BaggageService.name);
  private docClient: DynamoDBDocumentClient;
  private readonly tableName = process.env.DYNAMODB_TABLE_NAME || 'aerolink-baggage';

  constructor(private baggageGateway: BaggageGateway) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async checkIn(dto: CreateBaggageDto) {
    const id = randomUUID();
    const bag = {
      id,
      pk: `BAGGAGE#${id}`,
      sk: `METADATA`,
      passengerId: dto.passengerId,
      flightId: dto.flightId,
      status: 'CHECKED_IN',
      location: 'Check-in Counter',
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: bag,
      }));
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to insert bag ${id}. Mocking fallback.`, error);
    }

    return bag;
  }

  async updateStatus(id: string, dto: UpdateBaggageStatusDto) {
    let bag: any = null;
    
    try {
      const response = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `BAGGAGE#${id}`, sk: `METADATA` },
        UpdateExpression: 'SET #status = :status, #location = :location, #updatedAt = :updatedAt',
        ExpressionAttributeNames: { 
          '#status': 'status', 
          '#location': 'location',
          '#updatedAt': 'updatedAt' 
        },
        ExpressionAttributeValues: { 
          ':status': dto.status,
          ':location': dto.location,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW',
      }));
      bag = response.Attributes;
    } catch (error) {
      this.logger.error(`[DynamoDB] Failed to update bag ${id}. Mocking fallback.`, error);
      bag = { id, status: dto.status, location: dto.location };
    }

    if (!bag) throw new NotFoundException('Baggage not found');

    // [Fallback for Local Dev] Instantly push the update to the frontend via local WebSockets
    // In AWS, DynamoDB Streams -> Lambda -> API Gateway will handle this!
    this.logger.log(`Updated baggage ${id} to ${dto.status}. Triggering WebSocket push...`);
    this.baggageGateway.broadcastBaggageUpdate(bag);

    return bag;
  }

  async getByPassenger(passengerId: string) {
    // Note: In a true production environment, we would use a Global Secondary Index (GSI) 
    // on passengerId and use QueryCommand. We use Scan here for demonstration.
    try {
      const response = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'passengerId = :pid',
        ExpressionAttributeValues: { ':pid': passengerId },
      }));
      return response.Items || [];
    } catch (error) {
      this.logger.error(`[DynamoDB] Scan failed for passenger ${passengerId}. Returning []`, error);
      return [];
    }
  }

  async findAll() {
    try {
      const response = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        Limit: 50,
      }));
      return response.Items || [];
    } catch (error) {
      this.logger.error(`[DynamoDB] Scan failed. Returning []`, error);
      return [];
    }
  }
}
