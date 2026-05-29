resource "aws_cognito_user_pool" "pool" {
  name = "aerolink-passenger-pool"
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
}
resource "aws_cognito_user_pool_client" "client" {
  name         = "aerolink-web-client"
  user_pool_id = aws_cognito_user_pool.pool.id
}
