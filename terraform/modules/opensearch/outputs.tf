output "opensearch_endpoint" {
  value       = aws_opensearch_domain.semantic_search.endpoint
  description = "The endpoint for your OpenSearch domain"
}

output "opensearch_arn" {
  value = aws_opensearch_domain.semantic_search.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.sync_lambda_role.arn
}