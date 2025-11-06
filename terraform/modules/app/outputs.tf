output "queue_for_submit_experiments" {
  value = aws_sqs_queue.submit_experiments.url
}

output "dlq_for_experiments" {
  value = aws_sqs_queue.dead_letters_for_experiments.url
}