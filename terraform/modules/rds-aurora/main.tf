module "aurora" {
  source               = "terraform-aws-modules/rds-aurora/aws"
  version              = "~> 9.0"
  name                 = "aerolink-aurora"
  engine               = "aurora-postgresql"
  master_username      = "postgres"
  vpc_id               = var.vpc_id
  db_subnet_group_name = var.database_subnet_group_name
  security_group_rules = {
    vpc_ingress = {
      cidr_blocks = var.private_subnets_cidr_blocks
    }
  }
  serverlessv2_scaling_configuration = {
    min_capacity = 0.5
    max_capacity = 2.0
  }
  instance_class = "db.serverless"
  instances = {
    one = {}
  }
}
