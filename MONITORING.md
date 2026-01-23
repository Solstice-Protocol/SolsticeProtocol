# Monitoring and Alerting Guide

## Overview

This guide covers monitoring, alerting, and observability for Solstice Protocol in production.

## Key Metrics to Monitor

### Application Metrics

#### API Performance
- **Response Time**: Average, P50, P95, P99
  - Target: < 200ms average, < 500ms P95
- **Request Rate**: Requests per second
- **Error Rate**: 4xx and 5xx errors
  - Target: < 1% error rate
- **Throughput**: Successful requests per second

#### Authentication
- **Session Creation Rate**: New sessions per minute
- **Failed Authentication Attempts**: Per hour
  - Alert if > 100/hour from single IP
- **Active Sessions**: Current count
- **Session Duration**: Average time

#### Proof Operations
- **Proof Generation Time**: Average duration
  - Target: < 10 seconds
- **Proof Verification Success Rate**: Percentage
  - Target: > 99%
- **Proof Queue Length**: Pending operations

### Infrastructure Metrics

#### Server Health
- **CPU Usage**: Percentage
  - Alert if > 80% for 5 minutes
- **Memory Usage**: Percentage
  - Alert if > 85% for 5 minutes
- **Disk Usage**: Percentage
  - Alert if > 80%
- **Network I/O**: Bytes in/out per second

#### Database
- **Connection Pool**: Active/idle connections
  - Alert if pool exhaustion
- **Query Performance**: Slow queries (> 1s)
- **Database Size**: Growth rate
- **Replication Lag**: For replicas

#### Redis
- **Memory Usage**: Percentage
- **Hit Rate**: Cache hit ratio
  - Target: > 90%
- **Connected Clients**: Count
- **Evicted Keys**: Per second

### Blockchain Metrics

#### Solana Integration
- **RPC Latency**: Response time to Solana RPC
  - Alert if > 2 seconds
- **Transaction Success Rate**: Percentage
  - Target: > 95%
- **Failed Transactions**: Count per hour
- **SOL Balance**: Program account balance
  - Alert if < minimum threshold

## Monitoring Stack

### Option 1: Prometheus + Grafana

#### Install Prometheus

1. **Download and Install**
```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
cd prometheus-2.45.0.linux-amd64
```

2. **Configure Prometheus**
Create `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'solstice-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
      
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
      
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']
```

3. **Start Prometheus**
```bash
./prometheus --config.file=prometheus.yml
```

#### Install Grafana

1. **Install Grafana**
```bash
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana
```

2. **Start Grafana**
```bash
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

3. **Access Grafana**
- URL: http://localhost:3000
- Default credentials: admin/admin

#### Install Exporters

**Node Exporter** (System Metrics):
```bash
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.0/node_exporter-1.6.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.0.linux-amd64.tar.gz
cd node_exporter-1.6.0.linux-amd64
./node_exporter &
```

**PostgreSQL Exporter**:
```bash
docker run -d \
  --name postgres-exporter \
  -p 9187:9187 \
  -e DATA_SOURCE_NAME="postgresql://solstice_user:password@localhost:5432/solstice_protocol?sslmode=disable" \
  prometheuscommunity/postgres-exporter
```

**Redis Exporter**:
```bash
docker run -d \
  --name redis-exporter \
  -p 9121:9121 \
  oliver006/redis_exporter \
  --redis.addr=redis://localhost:6379
```

### Option 2: DataDog

1. **Install DataDog Agent**
```bash
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<your_api_key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s.datadoghq.com/scripts/install_script.sh)"
```

2. **Configure Node.js APM**
```bash
npm install --save dd-trace
```

In `backend/src/index.js`:
```javascript
// Must be first import
import tracer from 'dd-trace';
tracer.init({
  service: 'solstice-api',
  env: process.env.NODE_ENV,
  logInjection: true
});
```

### Option 3: New Relic

1. **Install New Relic Agent**
```bash
npm install newrelic --save
```

2. **Configure**
Create `newrelic.js`:
```javascript
exports.config = {
  app_name: ['Solstice Protocol API'],
  license_key: 'your_license_key',
  logging: {
    level: 'info'
  }
};
```

## Custom Metrics Endpoint

Add to `backend/src/index.js`:

```javascript
import prometheus from 'prom-client';

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 5000]
});

const authAttempts = new prometheus.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['status']
});

const proofGeneration = new prometheus.Summary({
  name: 'proof_generation_duration_seconds',
  help: 'Proof generation duration',
  labelNames: ['proof_type']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(authAttempts);
register.registerMetric(proofGeneration);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

## Alerting Rules

### Prometheus Alerting

Create `alerts.yml`:
```yaml
groups:
  - name: solstice_alerts
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
      
      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "P95 response time is {{ $value }}ms"
      
      # High CPU Usage
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}%"
      
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}%"
      
      # Database Connection Pool Exhaustion
      - alert: DatabasePoolExhaustion
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "{{ $value }}% of connections in use"
      
      # Failed Authentication Attempts
      - alert: HighFailedAuthRate
        expr: rate(auth_attempts_total{status="failed"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of failed authentication attempts"
          description: "{{ $value }} failed attempts/sec"
```

### AlertManager Configuration

Create `alertmanager.yml`:
```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@solsticeprotocol.com'
        from: 'alertmanager@solsticeprotocol.com'
        smarthost: 'smtp.gmail.com:587'
        
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'your_pagerduty_service_key'
```

## Health Checks

### Liveness Probe
```javascript
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});
```

### Readiness Probe
```javascript
app.get('/health/ready', async (req, res) => {
  try {
    // Check database
    await pool.query('SELECT 1');
    
    // Check Redis
    await redisClient.ping();
    
    // Check Solana RPC
    await connection.getHealth();
    
    res.status(200).json({ 
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
        solana: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      error: error.message 
    });
  }
});
```

## Logging

### Structured Logging

Update `backend/src/utils/logger.js`:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'solstice-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

### Log Aggregation

Forward logs to centralized logging:

**ELK Stack**:
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.9.0-linux-x86_64.tar.gz
tar xzvf filebeat-8.9.0-linux-x86_64.tar.gz
```

Configure `filebeat.yml`:
```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/www/solstice/backend/logs/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
```

## Dashboard Examples

### Grafana Dashboard JSON

Sample panels for Solstice Protocol dashboard:

1. **Request Rate**: `rate(http_requests_total[5m])`
2. **Error Rate**: `rate(http_requests_total{status_code=~"5.."}[5m])`
3. **Response Time P95**: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))`
4. **Active Sessions**: `sessions_active_total`
5. **Database Connections**: `pg_stat_database_numbackends`
6. **Memory Usage**: `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`

## On-Call Runbook

### High Error Rate
1. Check error logs: `pm2 logs solstice-api --err`
2. Identify error pattern
3. Check Solana RPC status
4. Verify database connectivity
5. Scale if necessary

### High Response Time
1. Check database slow queries
2. Check Redis hit rate
3. Review recent deployments
4. Check CPU/memory usage
5. Consider caching improvements

### Database Issues
1. Check connection pool
2. Review slow queries
3. Check disk space
4. Verify database health
5. Consider read replica

### Service Down
1. Check PM2 status: `pm2 status`
2. Review logs: `pm2 logs`
3. Restart service: `pm2 restart solstice-api`
4. Check dependencies (DB, Redis, Solana)
5. Verify configuration

## Contact Information

- **On-Call Engineer**: [Phone/Slack]
- **DevOps Team**: devops@solsticeprotocol.com
- **Incident Channel**: #incidents (Slack)
