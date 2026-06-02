resource "aws_rds_global_cluster" "aerolink_global" {
  provider                  = aws.primary
  global_cluster_identifier = "aerolink-global"
  engine                    = "aurora-postgresql"
  engine_version            = "15.8"
  database_name             = "postgres"
  storage_encrypted         = true
}

resource "random_password" "master" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  provider    = aws.primary
  name_prefix = "aerolink-aurora-master-password-"
  description = "Master password for AeroLink Aurora Database"
}

resource "aws_secretsmanager_secret_version" "db_password_version" {
  provider      = aws.primary
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.master.result
}

module "aurora_primary" {
  source               = "terraform-aws-modules/rds-aurora/aws"
  version              = "~> 9.0"
  name                 = "aerolink-aurora-primary"
  engine               = "aurora-postgresql"
  engine_version       = "15.8"
  master_username      = "postgres"
  manage_master_user_password = false
  master_password      = random_password.master.result
  skip_final_snapshot  = true
  apply_immediately    = true
  vpc_id               = var.vpc_id
  db_subnet_group_name = var.database_subnet_group_name
  global_cluster_identifier = aws_rds_global_cluster.aerolink_global.id
  
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
  
  providers = {
    aws = aws.primary
  }
}

module "aurora_secondary" {
  source               = "terraform-aws-modules/rds-aurora/aws"
  version              = "~> 9.0"
  name                 = "aerolink-aurora-secondary"
  engine               = "aurora-postgresql"
  engine_version       = "15.8"
  skip_final_snapshot  = true
  vpc_id               = var.vpc_id_secondary
  db_subnet_group_name = var.database_subnet_group_name_secondary
  global_cluster_identifier = aws_rds_global_cluster.aerolink_global.id
  
  # Secondary cluster shouldn't have a master_username, it inherits from global
  
  security_group_rules = {
    vpc_ingress = {
      cidr_blocks = var.private_subnets_cidr_blocks_secondary
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
  
  kms_key_id = aws_kms_key.secondary_rds.arn
  
  depends_on = [module.aurora_primary]
  
  providers = {
    aws = aws.secondary
  }
}

resource "aws_kms_key" "secondary_rds" {
  provider    = aws.secondary
  description = "KMS key for secondary Aurora cluster"
}

