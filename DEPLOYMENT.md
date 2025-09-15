# P2P Blockchain Playground Deployment Guide

## Overview

The P2P Blockchain Playground is a pure front-end application that can be deployed in any environment that supports static file serving. This guide provides detailed instructions for various deployment methods.

## System Requirements

### Development Environment
- Node.js 16.0+
- npm 8.0+
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### Production Environment
- Static file server (Apache, Nginx, or any HTTP server)
- HTTPS support (recommended)
- Modern browser support

## Quick Deployment

### Method 1: Direct Use (Recommended)

The simplest way to deploy is to use the existing files directly:

```bash
# 1. Clone or download the project
git clone <repository-url>
cd p2p-blockchain-playground

# 2. Start a local server
npm start
# Or using Python
python3 -m http.server 8080
# Or using Node.js
npx http-server . -p 8080 -o
```

### Method 2: Development Mode

For development and testing:

```bash
# 1. Install dependencies
npm install

# 2. Run tests
npm test

# 3. Start the development server
npm run dev
```

### Method 3: Production Build

For production environment deployment:

```bash
# 1. Install dependencies
npm install

# 2. Run full validation
npm run validate

# 3. Build the production version
npm run build

# 4. Deploy the dist directory to the server
```

## Detailed Deployment Steps

### 1. Prepare the Environment

#### Check Node.js Version
```bash
node --version  # Should be >= 16.0
npm --version   # Should be >= 8.0
```

#### Install Dependencies
```bash
npm install
```

### 2. Code Quality Check

#### Run Tests
```bash
# Run all tests
npm test

# Run tests and generate a coverage report
npm run test:coverage

# Interactive test interface
npm run test:ui
```

#### Code Linting
```bash
# Check code quality
npm run lint

# Automatically fix code issues
npm run lint:fix
```

### 3. Build and Deploy

#### Development Build
```bash
npm run build:dev
```

#### Production Build
```bash
npm run build
```

#### Clean Build Files
```bash
npm run clean
```

## Deploying to Different Platforms

### 1. Local Development Server

#### Using Python
```bash
# Python 3
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

#### Using Node.js
```bash
# Install http-server
npm install -g http-server

# Start the server
http-server . -p 8080 -o
```

#### Using PHP
```bash
php -S localhost:8080
```

### 2. Apache Server

#### Configuration File (.htaccess)
```apache
# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Set caching policy
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Security header settings
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
</IfModule>
```

### 3. Nginx Server

#### Configuration File (nginx.conf)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Document root
    root /path/to/p2p-blockchain-playground;
    index index.html;
    
    # Caching policy
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(html)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'";
    
    # Main page
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. GitHub Pages

#### Deployment Steps
1. Push the code to a GitHub repository.
2. Enable GitHub Pages in the repository settings.
3. Select the source branch (usually `main` or `gh-pages`).
4. Access `https://username.github.io/repository-name`.

#### GitHub Actions for Automatic Deployment
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build
    
    - name: Deploy to GitHub Pages
      if: github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### 5. Netlify

#### Deployment Steps
1. Connect your GitHub repository in Netlify.
2. Set the build command: `npm run build`.
3. Set the publish directory: `dist`.
4. Deployment will be triggered automatically.

#### netlify.toml Configuration
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 6. Vercel

#### Deployment Steps
1. Install the Vercel CLI: `npm i -g vercel`.
2. Run `vercel` in the project directory.
3. Follow the prompts to complete the deployment.

#### vercel.json Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Performance Optimization

### 1. Resource Optimization

#### Image Optimization
- Use modern image formats (WebP, AVIF).
- Compress image files.
- Use appropriate image dimensions.

#### Code Optimization
- Enable code minification.
- Remove unused code.
- Use code splitting.

### 2. Caching Strategy

#### Browser Caching
```javascript
// Service Worker caching strategy
const CACHE_NAME = 'p2p-blockchain-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.js',
  '/src/styles/main.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

#### CDN Configuration
- Use a CDN to accelerate static resources.
- Configure appropriate cache headers.
- Enable Gzip/Brotli compression.

### 3. Monitoring and Analytics

#### Performance Monitoring
```javascript
// Performance monitoring code
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart);
  });
}
```

#### Error Tracking
```javascript
// Error tracking
window.addEventListener('error', event => {
  console.error('JavaScript Error:', event.error);
  // Send error report to a monitoring service
});

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Send error report to a monitoring service
});
```

## Security Configuration

### 1. HTTPS Configuration

#### Let's Encrypt Certificate
```bash
# Install Certbot
sudo apt-get install certbot

# Obtain a certificate
sudo certbot certonly --webroot -w /path/to/webroot -d your-domain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Security Header Configuration

#### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
">
```

### 3. Access Control

#### IP Whitelisting (if needed)
```nginx
# Nginx configuration
location / {
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    try_files $uri $uri/ /index.html;
}
```

## Troubleshooting

### 1. Common Deployment Issues

#### File Permission Issues
```bash
# Set correct file permissions
chmod -R 644 /path/to/project
chmod 755 /path/to/project
find /path/to/project -type d -exec chmod 755 {} \;
```

#### MIME Type Issues
```apache
# Apache .htaccess
AddType application/javascript .js
AddType text/css .css
AddType image/svg+xml .svg
```

### 2. Performance Issues

#### Check Resource Loading
```javascript
// Check resource loading times
performance.getEntriesByType('resource').forEach(resource => {
  console.log(resource.name, resource.duration);
});
```

#### Memory Usage Monitoring
```javascript
// Monitor memory usage
if ('memory' in performance) {
  console.log('Memory Usage:', performance.memory);
}
```

### 3. Compatibility Issues

#### Browser Feature Detection
```javascript
// Check for browser support
const checkSupport = () => {
  const required = [
    'fetch',
    'Promise',
    'Map',
    'Set',
    'crypto.subtle'
  ];
  
  const missing = required.filter(feature => {
    return !window[feature] && !window.crypto?.subtle;
  });
  
  if (missing.length > 0) {
    console.warn('Unsupported features:', missing);
    return false;
  }
  
  return true;
};
```

## Maintenance and Updates

### 1. Version Management

#### Semantic Versioning
- Major version: Incompatible API changes.
- Minor version: Backward-compatible new features.
- Patch version: Backward-compatible bug fixes.

#### Update Process
1. Update the code.
2. Run tests.
3. Update the version number.
4. Build the new version.
5. Deploy to the production environment.
6. Verify the deployment.

### 2. Backup Strategy

#### Code Backup
- Use a version control system (Git).
- Regularly push to a remote repository.
- Create release tags.

#### Configuration Backup
- Back up server configuration files.
- Back up SSL certificates.
- Back up deployment scripts.

### 3. Monitoring and Logging

#### Access Log Analysis
```bash
# Analyze Nginx access logs
tail -f /var/log/nginx/access.log | grep "p2p-blockchain"

# Analyze error logs
tail -f /var/log/nginx/error.log
```

#### Performance Monitoring
- Set up performance monitoring alerts.
- Regularly check system resource usage.
- Monitor user access patterns.

## Conclusion

This deployment guide provides various methods for deploying, from simple local development to complex production environments. Choose the deployment method that suits your needs and adjust the configuration accordingly.

Remember:
- Always run tests before deploying.
- Use HTTPS to protect user data.
- Regularly update and maintain the system.
- Monitor system performance and security.

If you have any questions, please refer to the technical documentation or contact the development team.
