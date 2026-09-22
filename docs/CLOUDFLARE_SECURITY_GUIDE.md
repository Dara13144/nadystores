# Production Cloudflare Security & Anti-DDoS Setup Guide

This document provides step-by-step instructions to configure Cloudflare edge protection, Web Application Firewall (WAF), rate limiting, and origin shielding for NadyStore.

---

## 1. Domain & DNS Configuration (Hide Origin Server IP)

1. **Add Domain to Cloudflare**:
   - Change your domain's Nameservers at your registrar to the 2 Cloudflare Nameservers provided.
2. **Proxy Settings (Orange Cloud)**:
   - Go to **DNS > Records**.
   - Ensure the root `@` and `www` or `api` A/CNAME records have **Proxy Status: Proxied (Orange Cloud ON)**.
   - **Crucial**: Never expose your origin server's direct IP address in public DNS records or MX records.

---

## 2. SSL/TLS Encryption Mode

1. Go to **SSL/TLS > Overview**.
2. Select **Full (Strict)** encryption.
3. Under **Edge Certificates**:
   - Enable **Always Use HTTPS** (Redirects all HTTP to HTTPS).
   - Enable **HTTP Strict Transport Security (HSTS)** (Max Age: 12 months, Preload: ON).
   - Minimum TLS Version: **TLS 1.2** (or TLS 1.3).
   - Enable **Opportunistic Encryption** and **Automatic HTTPS Rewrites**.

---

## 3. Web Application Firewall (WAF) & Managed Rules

1. Go to **Security > WAF > Managed Rules**.
2. Deploy **Cloudflare Managed Ruleset** (Set Sensitivity to High).
3. Deploy **Cloudflare OWASP Core Ruleset** (Action: Block on High/Medium anomaly scores).

---

## 4. Cloudflare Rate Limiting Rules

Go to **Security > WAF > Rate limiting rules** and create the following 5 rules:

### Rule 1: Protect Authentication Endpoints (`/api/auth/*`)
- **If incoming requests match**:
  - URI Path contains `/api/auth/` (e.g. `/api/auth/login`, `/api/auth/register`)
- **Rate**: 10 requests per 1 minute per IP.
- **Action**: **Block** (Duration: 15 minutes) or **Managed Challenge**.

### Rule 2: Protect Admin Portal (`/api/admin/*`)
- **If incoming requests match**:
  - URI Path contains `/api/admin/`
- **Rate**: 50 requests per 1 minute per IP.
- **Action**: **Managed Challenge** or **Block** for non-admin IPs.

### Rule 3: Protect Payment & Checkout Endpoints (`/api/payments/*` & `/api/orders`)
- **If incoming requests match**:
  - URI Path contains `/api/payments/` or URI Path equals `/api/orders`
  - Method equals `POST`
- **Rate**: 15 requests per 1 minute per IP.
- **Action**: **Block** (Duration: 5 minutes).

### Rule 4: Global Anti-Flood Rate Limit
- **If incoming requests match**:
  - URI Path starts with `/api/`
- **Rate**: 150 requests per 1 minute per IP.
- **Action**: **Managed Challenge**.

---

## 5. Bot Fight Mode & Browser Integrity Check

1. Go to **Security > Bots**:
   - Enable **Bot Fight Mode** (Challenges suspicious automated scrapers and headless bots).
2. Go to **Security > Settings**:
   - Security Level: **Medium** (or **High** during active traffic surges).
   - Challenge Passage: **30 minutes**.
   - Enable **Browser Integrity Check** (Evaluates HTTP headers to detect common spam tools).

---

## 6. Origin Cloaking (Prevent Direct IP Bypass)

To ensure attackers cannot find your Render/VPS origin IP and bypass Cloudflare:

1. **Generate a Secret Token**:
   ```bash
   openssl rand -hex 32
   ```
2. Set the token in your backend environment:
   ```env
   SECURITY_SECRET=your_32_byte_secret_here
   ```
3. In Cloudflare, go to **Rules > Transform Rules > Modify Request Header**:
   - Create a rule: Apply to all incoming requests.
   - Header action: **Set static**.
   - Header name: `x-origin-secret`.
   - Value: `your_32_byte_secret_here`.
4. The backend middleware [cloudflareOriginMiddleware.js](file:///c:/Users/rosv2/website%20digtal/backend/src/middleware/cloudflareOriginMiddleware.js) will verify this header in production and automatically drop any request that bypasses Cloudflare.

---

## 7. Cloudflare Turnstile Captcha Setup (Optional User Verification)

1. In Cloudflare Dashboard, go to **Turnstile > Add Widget**:
   - Domain: `yourdomain.com` (and `localhost` for testing).
   - Widget Mode: **Managed** (Invisible by default, challenges on suspicion).
2. Copy your **Site Key** and **Secret Key**.
3. In backend `.env`:
   ```env
   TURNSTILE_SECRET_KEY=0x4AAAAAA...
   ```
4. In frontend `.env`:
   ```env
   VITE_TURNSTILE_SITE_KEY=0x4AAAAAA...
   ```

---

## 8. Summary of Active Defense Matrix

| Layer | Component | Target | Protection Level |
|---|---|---|---|
| **Layer 3/4** | Cloudflare DDoS | Network & Transport Flood | Unlimited Automated Mitigation |
| **Layer 7 Edge** | Cloudflare WAF & Bots | HTTP Flood, Scrapers, Zero-day exploits | Managed Challenge & Block |
| **Edge-to-Origin**| Custom Origin Secret | Origin IP Cloaking | Drops all unproxied traffic (403) |
| **Application** | Express Rate Limiters | API Endpoints (`/api/*`) | Multi-tier 429 Responses |
| **Application** | Abuse Quarantine | Malicious User-Agents & Exploit Probing | Auto 15–30m Temporary IP Ban |
| **Authentication**| Account Lockout | Brute Force & Credential Stuffing | 5 Failed Attempts Threshold |
| **Database** | PostgreSQL RLS | Data Isolation | Row-Level Security Enforced |
