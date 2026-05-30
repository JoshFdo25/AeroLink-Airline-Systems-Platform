provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
}

module "eks" {
  source          = "./modules/eks"
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  environment     = var.environment
}

module "rds_aurora" {
  source                      = "./modules/rds-aurora"
  vpc_id                      = module.vpc.vpc_id
  database_subnet_group_name  = module.vpc.database_subnet_group_name
  private_subnets_cidr_blocks = module.vpc.private_subnets_cidr_blocks
}

module "dynamodb" {
  source = "./modules/dynamodb"
}

module "elasticache_redis" {
  source                      = "./modules/elasticache-redis"
  vpc_id                      = module.vpc.vpc_id
  private_subnets             = module.vpc.private_subnets
  private_subnets_cidr_blocks = module.vpc.private_subnets_cidr_blocks
}

module "eventbridge" {
  source = "./modules/eventbridge"
}

module "lambda" {
  source = "./modules/lambda"
}

module "api_gateway" {
  source = "./modules/api-gateway"
}

module "cognito" {
  source = "./modules/cognito"
}

module "kms" {
  source = "./modules/kms"
}

module "secrets_manager" {
  source = "./modules/secrets-manager"
}
