resource "aws_kms_key" "passenger_pii" {
  description             = "KMS key for encrypting AeroLink passenger PII"
  deletion_window_in_days = 7
}
