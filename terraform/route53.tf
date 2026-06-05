resource "aws_route53_health_check" "primary_lb_health" {
  fqdn              = "a40a293371dce4460b72105ec966949d-1278625894.us-east-1.elb.amazonaws.com"
  port              = 80
  type              = "HTTP"
  resource_path     = "/api/flights"
  failure_threshold = 3
  request_interval  = 30

  tags = {
    Name        = "aerolink-primary-health-check"
    Environment = "production"
  }
}
