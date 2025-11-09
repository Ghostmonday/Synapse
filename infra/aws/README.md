# Sinapse AWS Infrastructure

Terraform configuration for deploying Sinapse on AWS.

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **AWS Account** with permissions to create:
   - VPC, Subnets, Security Groups
   - EC2 Instances
   - RDS PostgreSQL
   - ElastiCache Redis
   - S3 Buckets
   - IAM Roles

## Quick Start

1. **Copy example variables**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit `terraform.tfvars`** with your values:
   ```hcl
   db_password = "your-secure-password"
   aws_region  = "us-east-1"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan deployment**:
   ```bash
   terraform plan
   ```

5. **Apply configuration**:
   ```bash
   terraform apply
   ```

6. **Get connection info**:
   ```bash
   terraform output connection_info
   ```

## Configuration Options

### Use External Database/Redis

If you're using Neon PostgreSQL or Upstash Redis:

```hcl
create_rds = false
external_db_host = "your-neon-host.neon.tech:5432"

create_redis = false
external_redis_host = "your-upstash-host.upstash.io"
external_redis_port = 6379
```

### Production Setup

For production, enable:
- Load balancer (`create_alb = true`)
- Multiple instances (`instance_count = 2`)
- Larger database (`db_instance_class = "db.t3.small"`)
- Restricted SSH access (`allowed_ssh_cidrs = ["your.ip.here/32"]`)

## Architecture

- **VPC**: Isolated network with public/private subnets
- **EC2**: Application servers (auto-deploy from GitHub)
- **RDS**: Managed PostgreSQL (optional)
- **ElastiCache**: Managed Redis (optional)
- **S3**: File storage bucket
- **ALB**: Application Load Balancer (optional)

## Post-Deployment

1. **SSH into instance**:
   ```bash
   ssh ubuntu@$(terraform output -raw api_instance_ips | jq -r '.[0]')
   ```

2. **Check service status**:
   ```bash
   sudo systemctl status sinapse
   sudo journalctl -u sinapse -f
   ```

3. **Run database migrations**:
   ```bash
   cd /home/sinapse/Sinapse
   psql $DB_URL -f sql/migrations/*.sql
   ```

4. **Set environment variables** (if needed):
   ```bash
   sudo nano /home/sinapse/Sinapse/.env
   sudo systemctl restart sinapse
   ```

## Costs

Estimated monthly costs (us-east-1):
- **t3.medium EC2**: ~$30/month
- **db.t3.micro RDS**: ~$15/month
- **cache.t3.micro ElastiCache**: ~$12/month
- **S3**: ~$1/month (for small usage)
- **Data Transfer**: Variable

**Total**: ~$60/month for basic setup

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

⚠️ **Warning**: This will delete all data! Backup your database first.

## Troubleshooting

### Instance not starting
- Check CloudWatch logs: `sudo journalctl -u sinapse -n 100`
- Verify security groups allow traffic
- Check user_data script logs: `/var/log/sinapse-deploy.log`

### Database connection issues
- Verify security groups allow EC2 → RDS
- Check database endpoint in `.env`
- Test connection: `psql -h $DB_HOST -U $DB_USER -d sinaps`

### Redis connection issues
- Verify ElastiCache endpoint
- Check security groups
- Test: `redis-cli -h $REDIS_HOST ping`

## Advanced

### State Management

Use S3 backend for team collaboration:

```hcl
# In main.tf, uncomment backend block
backend "s3" {
  bucket = "sinapse-terraform-state"
  key    = "aws/terraform.tfstate"
  region = "us-east-1"
}
```

### CI/CD Integration

Use GitHub Actions to deploy:

```yaml
- name: Terraform Apply
  run: |
    cd infra/aws
    terraform init
    terraform apply -auto-approve
```

## Support

For issues:
- Check logs: `/var/log/sinapse-deploy.log`
- GitHub Issues: [Sinapse Issues](https://github.com/Ghostmonday/Synapse/issues)
- Email: enterprise@sinapse.app

