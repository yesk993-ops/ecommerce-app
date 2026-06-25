terraform {
  backend "s3" {
    bucket = "ecommerce-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "../../modules/vpc"

  environment         = var.environment
  cidr_block          = var.vpc_cidr
  public_subnets      = var.public_subnet_cidrs
  private_subnets     = var.private_subnet_cidrs
  availability_zones  = var.availability_zones
  enable_nat_gateway  = true
}

module "eks" {
  source = "../../modules/eks"

  environment    = var.environment
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  node_desired_size = 2
  node_min_size     = 1
  node_max_size     = 5
}

module "rds" {
  source = "../../modules/rds"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  eks_security_group_id = module.eks.eks_security_group_id
  db_username        = var.db_username
  db_password        = var.db_password
  instance_class     = "db.t3.medium"
  multi_az           = false
  deletion_protection = false
}

module "redis" {
  source = "../../modules/redis"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  node_type   = "cache.t3.medium"
}
