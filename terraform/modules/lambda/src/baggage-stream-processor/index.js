const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// In a real environment, this endpoint is provided via environment variables injected by Terraform
const endpoint = process.env.WEBSOCKET_API_ENDPOINT; 
const apiGateway = new ApiGatewayManagementApiClient({ endpoint });

/**
 * AWS Lambda handler triggered by DynamoDB Streams.
 * Reads the 'aerolink-baggage' stream and pushes WebSockets updates to API Gateway connected clients.
 */
exports.handler = async (event) => {
  console.log('Received DynamoDB Stream Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName === 'MODIFY') {
      const newImage = unmarshall(record.dynamodb.NewImage);
      
      console.log(`Baggage ${newImage.id} status updated to ${newImage.status}. Pushing to API Gateway...`);

      // 1. Fetch connected clients from a connection tracking table
      // (Mocked for now since this is just the processor code)
      const mockConnectedClients = ['connectionId_12345']; 

      // 2. Push message to all relevant clients
      for (const connectionId of mockConnectedClients) {
        try {
          const command = new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify({
              type: 'baggage.updated',
              payload: newImage
            })),
          });
          await apiGateway.send(command);
          console.log(`Successfully pushed to connection ${connectionId}`);
        } catch (error) {
          if (error.$metadata && error.$metadata.httpStatusCode === 410) {
            console.log(`Found stale connection, deleting ${connectionId}`);
            // Logic to delete from connections table goes here
          } else {
            console.error('Failed to post to connection', error);
          }
        }
      }
    }
  }

  return { statusCode: 200, body: 'Stream processed' };
};
