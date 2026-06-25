resource "aws_prometheus_workspace" "main" {
  alias = "${var.environment}-ecommerce-prometheus"

  tags = {
    Environment = var.environment
  }
}

resource "aws_grafana_workspace" "main" {
  name          = "${var.environment}-ecommerce-grafana"
  account_access = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"

  data_sources = [aws_prometheus_workspace.main.arn]

  tags = {
    Environment = var.environment
  }
}
