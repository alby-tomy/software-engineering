variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }

resource "aws_db_subnet_group" "main" {
  name       = "pulsegrid-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "postgres" {
  identifier        = "pulsegrid-${var.environment}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  username          = "pulsegrid"
  password          = "changeme-in-production"
  db_subnet_group_name = aws_db_subnet_group.main.name
  skip_final_snapshot  = true
}

output "endpoint" { value = aws_db_instance.postgres.endpoint }
