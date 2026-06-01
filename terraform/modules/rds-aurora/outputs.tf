output "cluster_endpoint" { value = module.aurora_primary.cluster_endpoint }
output "cluster_endpoint_secondary" { value = module.aurora_secondary.cluster_endpoint }
