resource "aws_apigatewayv2_api" "websocket" {
  name                       = "aerolink-websocket-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}
