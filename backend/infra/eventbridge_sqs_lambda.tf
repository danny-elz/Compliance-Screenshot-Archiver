# ---------- SQS DLQ ----------
resource "aws_sqs_queue" "jobs_dlq" {
  name                      = "${var.project}-jobs-dlq"
  message_retention_seconds = 1209600 # 14 days
}

# ---------- SQS main queue with redrive to DLQ ----------
resource "aws_sqs_queue" "jobs" {
  name                       = "${var.project}-jobs"
  visibility_timeout_seconds = 180
  message_retention_seconds  = 345600 # 4 days

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
    maxReceiveCount     = var.queue_max_receive_count
  })
}

# ---------- EventBridge rule (rate) ----------
resource "aws_cloudwatch_event_rule" "scheduler" {
  name                = "${var.project}-scheduler"
  description         = "Periodically enqueue capture jobs"
  schedule_expression = "rate(${var.eventbridge_rate_minutes} minutes)"
}

# ---------- Event target DLQ (delivery failures) ----------
resource "aws_sqs_queue" "event_target_dlq" {
  name                      = "${var.project}-target-dlq"
  message_retention_seconds = 1209600
}

# ---------- IAM role to allow EventBridge to send to SQS ----------
data "aws_iam_policy_document" "events_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "events_to_sqs" {
  name               = "${var.project}-events-to-sqs"
  assume_role_policy = data.aws_iam_policy_document.events_trust.json
}

data "aws_iam_policy_document" "events_to_sqs" {
  statement {
    sid     = "AllowSendMessage"
    effect  = "Allow"
    actions = ["sqs:SendMessage"]
    resources = [
      aws_sqs_queue.jobs.arn
    ]
  }
}

resource "aws_iam_role_policy" "events_to_sqs" {
  role   = aws_iam_role.events_to_sqs.id
  policy = data.aws_iam_policy_document.events_to_sqs.json
}

# ---------- Event target (SQS) with DLQ ----------
resource "aws_cloudwatch_event_target" "scheduler_to_sqs" {
  rule      = aws_cloudwatch_event_rule.scheduler.name
  target_id = "sqs-target"
  arn       = aws_sqs_queue.jobs.arn
  role_arn  = aws_iam_role.events_to_sqs.arn

  dead_letter_config {
    arn = aws_sqs_queue.event_target_dlq.arn
  }
}
