module "eks" {
  source                         = "terraform-aws-modules/eks/aws"
  version                        = "~> 20.0"
  cluster_name                   = "aerolink-${var.environment}-cluster"
  cluster_version                = "1.30"
  cluster_endpoint_public_access = true
  vpc_id                         = var.vpc_id
  subnet_ids                     = var.private_subnets
  node_security_group_additional_rules = {
    ingress_istio_webhook = {
      description                   = "Allow API server to reach Istio webhook"
      protocol                      = "tcp"
      from_port                     = 15017
      to_port                       = 15017
      type                          = "ingress"
      source_cluster_security_group = true
    }
  }

  eks_managed_node_groups = {
    spot_nodes = {
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"
    }
  }
}
