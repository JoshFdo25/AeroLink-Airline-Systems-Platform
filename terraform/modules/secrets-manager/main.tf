resource "aws_secretsmanager_secret" "db_password" {
  name = "aerolink-db-password-v2"
}
