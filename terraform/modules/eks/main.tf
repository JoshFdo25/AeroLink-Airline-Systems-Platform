module "eks" {
  source                         = "terraform-aws-modules/eks/aws"
  version                        = "~> 20.0"
  cluster_name                   = "aerolink-${var.environment}-cluster"
  iam_role_use_name_prefix       = false
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

  access_entries = {
    admin = {
      kubernetes_groups = []
      principal_arn     = "arn:aws:iam::643942183295:user/AeroLink-Admin"

      policy_associations = {
        admin = {
          policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = {
            type = "cluster"
          }
        }
      }
    }
  }

  eks_managed_node_groups = {
    spot_nodes = {
      min_size       = 2
      max_size       = 5
      desired_size   = 3
      instance_types = ["t3.large"]
      capacity_type  = "SPOT"
      iam_role_additional_policies = {
        AdministratorAccess = "arn:aws:iam::aws:policy/AdministratorAccess"
      }
    }
  }
}
