# Payment API High Error Rate

## Symptoms
- P1 alert: payment-api error rate > 5%
- Downstream alerts on checkout-api and billing-api
- Correlated services show postgres-primary as root cause

## Diagnosis
1. Check PulseGrid incident correlation: `GET /services/payment-api/root-causes`
2. Review postgres-primary health on status page
3. Check recent deploys to payment-api

## Resolution
1. Acknowledge incident in PulseGrid dashboard
2. If postgres is root cause, follow postgres runbook
3. Enable circuit breaker on payment-api retries
4. Page on-call for payments team if not already notified

## Post-incident
- Generate postmortem: `GET /incidents/{id}/postmortem`
- Update this runbook with lessons learned
