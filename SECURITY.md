# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Send a detailed report to: **info@rayven.cloud**
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### Scope

The following are in scope for security reports:

- Authentication/Authorization bypasses
- Data exposure vulnerabilities
- Injection attacks (SQL, XSS, etc.)
- Remote code execution
- Privilege escalation

### Out of Scope

- Denial of Service (DoS) attacks
- Social engineering
- Physical security
- Third-party dependencies (report to respective maintainers)

## Security Best Practices

When deploying Tumiki:

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Updates**: Keep dependencies updated
4. **Access Control**: Follow principle of least privilege
5. **Monitoring**: Enable logging and monitoring

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve Tumiki's security.
