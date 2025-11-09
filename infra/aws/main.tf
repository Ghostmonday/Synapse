terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: Use S3 backend for state management
  # backend "s3" {
  #   bucket = "sinapse-terraform-state"
  #   key    = "aws/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Sinapse"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hosted-ubuntu-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC and Networking
resource "aws_vpc" "sinapse" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "sinapse" {
  vpc_id = aws_vpc.sinapse.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.sinapse.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.sinapse.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 2)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.sinapse.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sinapse.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "sinapse_api" {
  name        = "${var.project_name}-api-sg"
  description = "Security group for Sinapse API servers"
  vpc_id      = aws_vpc.sinapse.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API Port"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidrs
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-api-sg"
  }
}

resource "aws_security_group" "sinapse_db" {
  name        = "${var.project_name}-db-sg"
  description = "Security group for Sinapse PostgreSQL database"
  vpc_id      = aws_vpc.sinapse.id

  ingress {
    description     = "PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.sinapse_api.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}

resource "aws_security_group" "sinapse_redis" {
  name        = "${var.project_name}-redis-sg"
  description = "Security group for Sinapse Redis cache"
  vpc_id      = aws_vpc.sinapse.id

  ingress {
    description     = "Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.sinapse_api.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-redis-sg"
  }
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "sinapse_files" {
  bucket = "${var.project_name}-files-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "${var.project_name}-files"
  }
}

resource "aws_s3_bucket_versioning" "sinapse_files" {
  bucket = aws_s3_bucket.sinapse_files.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sinapse_files" {
  bucket = aws_s3_bucket.sinapse_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "sinapse_files" {
  bucket = aws_s3_bucket.sinapse_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# RDS PostgreSQL (optional - can use external DB)
resource "aws_db_subnet_group" "sinapse" {
  count      = var.create_rds ? 1 : 0
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "sinapse" {
  count             = var.create_rds ? 1 : 0
  identifier        = "${var.project_name}-postgres"
  engine            = "postgres"
  engine_version    = "14.9"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "sinaps"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.sinapse_db.id]
  db_subnet_group_name   = aws_db_subnet_group.sinapse[0].name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  skip_final_snapshot       = var.environment == "dev"
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  tags = {
    Name = "${var.project_name}-postgres"
  }
}

# ElastiCache Redis (optional - can use external Redis)
resource "aws_elasticache_subnet_group" "sinapse" {
  count      = var.create_redis ? 1 : 0
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "sinapse" {
  count = var.create_redis ? 1 : 0

  replication_group_id       = "${var.project_name}-redis"
  description                = "Sinapse Redis cache"
  node_type                  = var.redis_node_type
  port                       = 6379
  parameter_group_name       = "default.redis7"
  engine_version             = "7.0"
  num_cache_clusters         = var.redis_num_nodes
  automatic_failover_enabled = var.redis_num_nodes > 1

  subnet_group_name  = aws_elasticache_subnet_group.sinapse[0].name
  security_group_ids  = [aws_security_group.sinapse_redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = {
    Name = "${var.project_name}-redis"
  }
}

# Application Load Balancer (optional)
resource "aws_lb" "sinapse" {
  count              = var.create_alb ? 1 : 0
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.sinapse_api.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name = "${var.project_name}-alb"
  }
}

resource "aws_lb_target_group" "sinapse" {
  count    = var.create_alb ? 1 : 0
  name     = "${var.project_name}-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.sinapse.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

resource "aws_lb_listener" "sinapse" {
  count             = var.create_alb ? 1 : 0
  load_balancer_arn = aws_lb.sinapse[0].arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sinapse[0].arn
  }
}

# EC2 Instance for Sinapse API
resource "aws_instance" "sinapse_api" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id              = aws_subnet.public[count.index % length(aws_subnet.public)].id
  vpc_security_group_ids = [aws_security_group.sinapse_api.id]

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host     = var.create_rds ? aws_db_instance.sinapse[0].endpoint : var.external_db_host
    db_name     = "sinaps"
    db_user     = var.db_username
    db_password = var.db_password
    redis_host  = var.create_redis ? aws_elasticache_replication_group.sinapse[0].configuration_endpoint_address : var.external_redis_host
    redis_port  = var.create_redis ? 6379 : var.external_redis_port
    s3_bucket   = aws_s3_bucket.sinapse_files.id
    aws_region  = var.aws_region
    github_repo = var.github_repo
    environment = var.environment
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-api-${count.index + 1}"
  }
}

# Attach instances to ALB target group
resource "aws_lb_target_group_attachment" "sinapse" {
  count            = var.create_alb ? var.instance_count : 0
  target_group_arn = aws_lb_target_group.sinapse[0].arn
  target_id        = aws_instance.sinapse_api[count.index].id
  port             = 3000
}

# IAM Role for EC2 instances
resource "aws_iam_role" "sinapse_ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ec2-role"
  }
}

resource "aws_iam_role_policy" "sinapse_s3" {
  name = "${var.project_name}-s3-policy"
  role = aws_iam_role.sinapse_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.sinapse_files.arn,
          "${aws_s3_bucket.sinapse_files.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_instance_profile" "sinapse" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.sinapse_ec2.name
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.sinapse.id
}

output "api_instance_ids" {
  description = "EC2 Instance IDs"
  value       = aws_instance.sinapse_api[*].id
}

output "api_instance_ips" {
  description = "EC2 Instance Public IPs"
  value       = aws_instance.sinapse_api[*].public_ip
}

output "load_balancer_dns" {
  description = "Load Balancer DNS name"
  value       = var.create_alb ? aws_lb.sinapse[0].dns_name : null
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = var.create_rds ? aws_db_instance.sinapse[0].endpoint : var.external_db_host
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = var.create_redis ? aws_elasticache_replication_group.sinapse[0].configuration_endpoint_address : var.external_redis_host
}

output "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  value       = aws_s3_bucket.sinapse_files.id
}

output "connection_info" {
  description = "Connection information"
  value = {
    api_urls = aws_instance.sinapse_api[*].public_ip
    db_url   = var.create_rds ? "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.sinapse[0].endpoint}/sinaps" : var.external_db_host
    redis_url = var.create_redis ? "redis://${aws_elasticache_replication_group.sinapse[0].configuration_endpoint_address}:6379" : var.external_redis_host
  }
  sensitive = true
}

