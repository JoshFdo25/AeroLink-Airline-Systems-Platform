provider "aws" {
  region = var.primary_region
  alias  = "primary"
}

provider "aws" {
  region = var.secondary_region
  alias  = "secondary"
}

module "vpc_primary" {
  source      = "./modules/vpc"
  environment = "${var.environment}-primary"
  providers = {
    aws = aws.primary
  }
}

module "vpc_secondary" {
  source      = "./modules/vpc"
  environment = "${var.environment}-secondary"
  providers = {
    aws = aws.secondary
  }
}

module "eks_primary" {
  source          = "./modules/eks"
  vpc_id          = module.vpc_primary.vpc_id
  private_subnets = module.vpc_primary.private_subnets
  environment     = "${var.environment}-primary"
  providers = {
    aws = aws.primary
  }
}

module "eks_secondary" {
  source          = "./modules/eks"
  vpc_id          = module.vpc_secondary.vpc_id
  private_subnets = module.vpc_secondary.private_subnets
  environment     = "${var.environment}-secondary"
  providers = {
    aws = aws.secondary
  }
}

module "rds_aurora" {
  source                                 = "./modules/rds-aurora"
  vpc_id                                 = module.vpc_primary.vpc_id
  database_subnet_group_name             = module.vpc_primary.database_subnet_group_name
  private_subnets_cidr_blocks            = module.vpc_primary.private_subnets_cidr_blocks
  
  vpc_id_secondary                       = module.vpc_secondary.vpc_id
  database_subnet_group_name_secondary   = module.vpc_secondary.database_subnet_group_name
  private_subnets_cidr_blocks_secondary  = module.vpc_secondary.private_subnets_cidr_blocks
  
  providers = {
    aws.primary   = aws.primary
    aws.secondary = aws.secondary
  }
}

module "dynamodb" {
  source           = "./modules/dynamodb"
  secondary_region = var.secondary_region
  providers = {
    aws = aws.primary
  }
}

module "elasticache_redis" {
  source                      = "./modules/elasticache-redis"
  vpc_id                      = module.vpc_primary.vpc_id
  private_subnets             = module.vpc_primary.private_subnets
  private_subnets_cidr_blocks = module.vpc_primary.private_subnets_cidr_blocks
  providers = {
    aws = aws.primary
  }
}

module "eventbridge" {
  source = "./modules/eventbridge"
  providers = {
    aws = aws.primary
  }
}

module "lambda" {
  source = "./modules/lambda"
  providers = {
    aws = aws.primary
  }
}

module "api_gateway" {
  source = "./modules/api-gateway"
  providers = {
    aws = aws.primary
  }
}

module "cognito" {
  source = "./modules/cognito"
  providers = {
    aws = aws.primary
  }
}

module "kms" {
  source = "./modules/kms"
  providers = {
    aws = aws.primary
  }
}

module "secrets_manager" {
  source = "./modules/secrets-manager"
  providers = {
    aws = aws.primary
  }
}
