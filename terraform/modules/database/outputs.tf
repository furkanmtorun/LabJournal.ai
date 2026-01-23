output "experiments_table_arn" {
  value       = aws_dynamodb_table.experiments.arn
  description = "The ARN of the DynamoDB 'experiments' table"
}

output "experiments_stream_arn" {
  value       = aws_dynamodb_table.experiments.stream_arn
  description = "The ARN of the table stream used by the sync Lambda"
}