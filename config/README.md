# Config Directory

Configuration files for various services.

## Files

- `prometheus.yml` - Prometheus metrics collection configuration
- `rules.yml` - Prometheus alerting rules

## Usage

### Prometheus
```bash
# Start Prometheus with config
prometheus --config.file=config/prometheus.yml
```

### Alerting Rules
Prometheus will automatically load rules from `config/rules.yml` when configured in `prometheus.yml`.

