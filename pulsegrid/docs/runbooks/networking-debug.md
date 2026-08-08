# Networking Debug Runbook

## Tools

| Tool | Use case |
|------|----------|
| `curl -v` | Test HTTP/TLS handshake |
| `dig api.pulsegrid.example.com` | DNS resolution |
| `ss -tlnp` | Listening ports on host |
| `tcpdump -i any port 443` | Packet capture |

## Common Issues

### HTTPS not working
```bash
curl -v https://api.pulsegrid.example.com/health
openssl s_client -connect api.pulsegrid.example.com:443
```

### DB connection refused from API
- Check security group: DB must only accept API subnet CIDR
- Verify RDS endpoint: `dig postgres.internal`

### ALB health check failing
- Ensure `/health` returns 200
- Check target group port matches container port 8000
