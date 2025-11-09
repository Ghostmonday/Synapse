# Enterprise Self-Hosting Guide

Sinapse supports self-hosting for enterprise customers who need full control over their infrastructure and data compliance.

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Ghostmonday/Synapse
cd Sinapse
```

### 2. Docker Compose Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Supabase/Redis credentials
# For self-hosted, you can use:
# - Neon PostgreSQL (Supabase alternative)
# - Upstash Redis (managed Redis)
# - Or your own PostgreSQL/Redis instances

docker-compose up -d
```

### 3. One-Click AWS Deployment

We provide Terraform configurations for AWS EC2 deployment:

```bash
cd infra/aws/
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan
terraform apply
```

**Complete Terraform Setup**: See [`infra/aws/README.md`](../infra/aws/README.md) for full documentation.

The Terraform configuration includes:
- **VPC** with public/private subnets
- **EC2** instances (auto-deploy from GitHub)
- **RDS PostgreSQL** (optional, can use external DB)
- **ElastiCache Redis** (optional, can use external Redis)
- **S3 bucket** for file storage
- **Application Load Balancer** (optional, for production)
- **Security groups** and IAM roles

**Quick Start**:
```bash
cd infra/aws
terraform init
terraform apply
```

See [`infra/aws/README.md`](../infra/aws/README.md) for detailed instructions and configuration options.

### 4. iOS Configuration

In your iOS app, add a server URL switch for custom hosts:

```swift
// In AppConfig.swift
struct AppConfig {
    static var serverURL: String {
        if let customURL = UserDefaults.standard.string(forKey: "customServerURL") {
            return customURL
        }
        return "https://api.sinapse.app" // Default
    }
}
```

Users can switch between:
- Default hosted instance
- Self-hosted instance (enterprise)
- Custom partner infrastructure

## Architecture

### Components

- **Backend API**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Supabase or self-hosted)
- **Cache**: Redis (for pub/sub and presence)
- **File Storage**: AWS S3 or self-hosted MinIO
- **WebSocket**: Native WebSocket server

### Scaling

For production scale, consider:

1. **Kubernetes Deployment**
   - Our schemas migrate seamlessly
   - Use Helm charts for easy deployment
   - Auto-scaling based on message volume

2. **Database Scaling**
   - PostgreSQL read replicas
   - Connection pooling (PgBouncer)
   - Partitioned tables (already implemented)

3. **Redis Cluster**
   - Redis Cluster for high availability
   - Sentinel for failover

## Environment Variables

```env
# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-postgres-instance.com
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Redis
REDIS_URL=redis://your-redis-instance:6379

# File Storage (optional - use MinIO for self-hosted)
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# DeepSeek (for AI moderation)
DEEPSEEK_API_KEY=your-deepseek-key

# JWT
JWT_SECRET=your-jwt-secret
```

## Migration

Our database schemas are designed for seamless migration:

1. **Export from Supabase**:
   ```bash
   pg_dump $SUPABASE_DB_URL > backup.sql
   ```

2. **Import to self-hosted**:
   ```bash
   psql $YOUR_DB_URL < backup.sql
   ```

3. **Run migrations**:
   ```bash
   psql $YOUR_DB_URL -f sql/migrations/*.sql
   ```

## Partner Infrastructure

We're exploring partnerships with hosting providers (DigitalOcean, AWS, etc.) for one-click deployment:

- **DigitalOcean**: Spin up droplets via API
- **AWS**: EC2 instances with pre-configured AMIs
- **Revenue Split**: Hosting partners get new customers, we get infrastructure

**Future**: One-click deployment button in iOS app for enterprise users.

## Support

For self-hosting support:
- **Docs**: See `docs/` directory
- **Issues**: GitHub Issues (enterprise tag)
- **Email**: enterprise@sinapse.app

## Pro Tips

1. **Use Neon PostgreSQL**: Managed PostgreSQL with branching (great for testing)
2. **Upstash Redis**: Serverless Redis with global replication
3. **Cloudflare Tunnel**: Secure access without exposing ports
4. **Monitoring**: Use Prometheus + Grafana (already configured)

## Compliance

Self-hosting enables:
- **GDPR**: Full data control
- **HIPAA**: On-premise deployment
- **SOC 2**: Your own audit trail
- **Custom Retention**: Your own policies

---

**Next Steps**: See `docs/DEPLOYMENT.md` for detailed deployment guides.

