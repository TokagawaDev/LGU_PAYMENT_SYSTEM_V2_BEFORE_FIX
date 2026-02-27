# Step-by-Step Guide: Setting Up New Paymongo Account

This guide will walk you through creating a new Paymongo account and connecting it to your LGU Payment System.

---

## 📋 Prerequisites

- Email address for account registration
- Access to your backend `.env` file
- Basic understanding of payment gateway concepts

---

## Step 1: Create Paymongo Account

### 1.1 Go to Paymongo Website
- Open your browser and navigate to: **https://paymongo.com/**
- Click the **"Sign Up"** or **"Get Started"** button (usually in the top right corner)

### 1.2 Fill Registration Form
- Enter your **email address**
- Create a **strong password** (at least 8 characters)
- Accept the Terms of Service and Privacy Policy
- Click **"Create Account"** or **"Sign Up"**

### 1.3 Verify Your Email
- Check your email inbox for a verification email from Paymongo
- Click the verification link in the email
- You'll be redirected back to Paymongo dashboard

---

## Step 2: Complete Account Setup

### 2.1 Business Information (Optional but Recommended)
- Fill in your business details:
  - Business name
  - Business type
  - Contact information
- This helps with account verification and production access

### 2.2 Dashboard Overview
- Once logged in, you'll see the Paymongo Dashboard
- You'll have access to:
  - **Developers** section (for API keys)
  - **Payments** section (to view transactions)
  - **Settings** section (for account configuration)

---

## Step 3: Get Your API Keys

### 3.1 Navigate to API Keys Section
- In the dashboard, click on **"Developers"** in the left sidebar menu
- Or go directly to: **https://dashboard.paymongo.com/developers/api-keys**

### 3.2 Understand Test vs Live Keys
Paymongo provides two environments:

**Test Mode (Sandbox):**
- Use for development and testing
- No real money transactions
- Keys start with `pk_test_` and `sk_test_`
- Perfect for initial setup

**Live Mode (Production):**
- Use for real transactions
- Requires account verification
- Keys start with `pk_live_` and `sk_live_`
- Only activate after testing

### 3.3 Copy Your Test API Keys
1. Make sure you're in **"Test"** mode (toggle at the top)
2. You'll see two keys:
   - **Public Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)
3. Click the **"Reveal"** or **"Show"** button next to each key
4. **Copy both keys** and save them securely (you'll need them for Step 5)

**⚠️ Important:** 
- Never share your Secret Key publicly
- Never commit it to version control
- The Secret Key can perform sensitive operations

---

## Step 4: Set Up Webhooks (Optional but Recommended)

Webhooks allow Paymongo to notify your backend about payment events.

### 4.1 Navigate to Webhooks Section
- In the dashboard, go to **"Developers"** → **"Webhooks"**
- Or visit: **https://dashboard.paymongo.com/developers/webhooks**

### 4.2 Create a New Webhook
1. Click **"Create Webhook"** or **"Add Webhook"** button
2. Fill in the webhook details:
   - **Webhook URL**: Your backend endpoint (e.g., `https://your-backend.com/api/payments/webhook`)
   - **Events to listen to**: Select events you want to receive:
     - `payment.paid` - When payment is successful
     - `payment.failed` - When payment fails
     - `payment.refunded` - When payment is refunded
     - `source.chargeable` - When source is ready to charge

### 4.3 Get Webhook Secret
1. After creating the webhook, you'll see a **"Webhook Secret"**
2. It starts with `whsk_`
3. **Copy this secret** - you'll need it for Step 5

**Note:** If you're testing locally, you can use a service like ngrok to expose your local server:
```bash
ngrok http 3001
```
Then use the ngrok URL as your webhook URL.

---

## Step 5: Update Your Backend Configuration

### 5.1 Open Your `.env` File
- Navigate to: `apps/backend/.env`
- Open it in your code editor

### 5.2 Update Paymongo Credentials
Find the Paymongo section (around lines 28-31) and replace with your new keys:

<!-- ```env
#Paymongo
PAYMONGO_PUBLIC_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET=
```

**Example:**
```env
#Paymongo
PAYMONGO_PUBLIC_KEY=
PAYMONGO_SECRET_KEY=
PAYMONGO_WEBHOOK_SECRET= -->
```

### 5.3 Save the File
- Save your `.env` file
- **Double-check** that there are no extra spaces or quotes around the values

---

## Step 6: Verify Backend Configuration

### 6.1 Check Your Backend Code
Let's verify how Paymongo is configured in your backend:

1. Search for Paymongo configuration files:
   - Look for files that use `PAYMONGO_PUBLIC_KEY` or `PAYMONGO_SECRET_KEY`
   - Usually in: `apps/backend/src/modules/payments/`

2. Ensure the code reads from environment variables:
   ```typescript
   process.env.PAYMONGO_PUBLIC_KEY
   process.env.PAYMONGO_SECRET_KEY
   process.env.PAYMONGO_WEBHOOK_SECRET
   ```

### 6.2 Restart Your Backend Server
After updating `.env`, restart your backend:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run start:dev
# or
nx serve backend
```

---

## Step 7: Test the Connection

### 7.1 Test API Connection
You can test if your API keys work by making a test API call:

**Using cURL:**
```bash
curl https://api.paymongo.com/v1/payment_methods \
  -u sk_test_YOUR_SECRET_KEY: \
  -H "Content-Type: application/json"
```

**Using Postman or similar:**
- Method: GET
- URL: `https://api.paymongo.com/v1/payment_methods`
- Authorization: Basic Auth
  - Username: Your Secret Key (`sk_test_...`)
  - Password: (leave empty)

### 7.2 Test Payment Flow
1. Try creating a test payment through your application
2. Use Paymongo's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Declined**: `4000 0000 0000 0002`
   - **Insufficient Funds**: `4000 0000 0000 9995`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVV**: Any 3 digits (e.g., `123`)

### 7.3 Check Dashboard
- Go back to Paymongo Dashboard → **"Payments"**
- You should see your test transactions appear there

---

## Step 8: Switch to Live Mode (When Ready)

### 8.1 Account Verification
Before using live mode, you need to:
1. Complete business verification
2. Submit required documents
3. Wait for Paymongo approval

### 8.2 Get Live API Keys
1. In Paymongo Dashboard → **"Developers"** → **"API Keys"**
2. Switch toggle from **"Test"** to **"Live"**
3. Copy your **Live Public Key** (`pk_live_...`) and **Live Secret Key** (`sk_live_...`)

### 8.3 Update Production Environment
- Update your production `.env` file (on Render, Vercel, etc.)
- Replace test keys with live keys:
  ```env
  PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY
  PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
  PAYMONGO_WEBHOOK_SECRET=whsk_YOUR_LIVE_WEBHOOK_SECRET
  ```

---

## 🔒 Security Best Practices

1. **Never commit `.env` to Git**
   - Ensure `.env` is in `.gitignore`
   - Use environment variables in production

2. **Rotate Keys Regularly**
   - Change API keys periodically
   - Revoke old keys if compromised

3. **Use Different Keys for Test/Live**
   - Never use live keys in development
   - Never use test keys in production

4. **Protect Secret Keys**
   - Only use Secret Key on backend
   - Public Key can be used on frontend
   - Never expose Secret Key in client-side code

---

## 🆘 Troubleshooting

### Issue: "Invalid API Key"
- **Solution**: Double-check you copied the entire key (no extra spaces)
- Verify you're using the correct key type (test vs live)
- Ensure the key hasn't been revoked

### Issue: "No payment methods are available" (on Paymongo checkout page)

This message is shown **on Paymongo’s hosted checkout page** after you click “Pay Now”. It means Paymongo is not offering any payment options for your account at that moment.

**Common causes and fixes:**

1. **Using LIVE keys on a new account**  
   - Live payment methods (Cards, GCash, Maya, etc.) are enabled **3–5 business days** after your account is activated.  
   - **Fix:** Use **TEST** API keys in `.env` for development. In Test mode, payment methods are available right away for test transactions.

2. **Wrong environment**  
   - **Fix:** In `.env`, use `pk_test_...` and `sk_test_...` for development. Use `pk_live_...` and `sk_live_...` only in production after activation.

3. **Account not fully activated**  
   - **Fix:** In [Paymongo Dashboard](https://dashboard.paymongo.com/), finish verification and wait until the account is fully activated. Then wait 3–5 business days for live payment methods.

4. **QRPh / BillEase**  
   - These require a separate request to Paymongo (Sales/Account Manager or [support@paymongo.com](mailto:support@paymongo.com)).

**Quick check:** Ensure your backend `.env` has TEST keys for local/dev:
```env
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_SECRET_KEY=sk_test_...
```
Restart the backend after changing keys.

**Verify in Paymongo Dashboard:**
1. Log in at [dashboard.paymongo.com](https://dashboard.paymongo.com).
2. Top of the page: switch to **Test mode** (toggle or environment selector).
3. Go to **Developers → API Keys** and confirm you see Test keys (pk_test_..., sk_test_...).
4. If there is a **Payment methods** or **Settings** section, ensure test payment methods are enabled.
5. For new accounts, if the message persists in Test mode, contact Paymongo support (support@paymongo.com) and ask to enable test payment methods for your account.

### Issue: "Webhook not receiving events"
- **Solution**: 
  - Verify webhook URL is accessible (use ngrok for local testing)
  - Check webhook secret matches in your code
  - Verify webhook events are selected correctly

### Issue: "Payment failed"
- **Solution**:
  - Check you're using test card numbers correctly
  - Verify API keys are correct
  - Check Paymongo dashboard for error details

### Issue: "CORS errors"
- **Solution**: 
  - Paymongo API doesn't support CORS for direct frontend calls
  - Always make Paymongo API calls from your backend
  - Use your backend as a proxy

---

## 🔧 API Note: Checkout Session vs Payment Intent

This app uses **Paymongo Checkout Sessions** only (hosted checkout page). It does **not** use the Payment Intents API.

- **Checkout Session** (`POST /v1/checkout_sessions`): We send `line_items`, `success_url`, `cancel_url`, `payment_method_types` (array), `metadata`. The customer is redirected to Paymongo’s page to pay. All payload building is in one place: `payments.service.ts` → `createCheckoutSession`.
- **Payment Intent** (`POST /v1/payment_intents`): Uses a different payload, e.g. `amount`, `currency`, `capture_type`, `payment_method_allowed` (string), `payment_method_options` (e.g. `request_three_d_secure`). Do **not** use that payload when creating a Checkout Session or you will get API errors.

If you have a Payment Intent–style JSON (with `amount`, `capture_type`, `payment_method_allowed`, `payment_method_options`), it belongs to the Payment Intents flow, not to our Checkout Session flow. Our code is correct as-is for Checkout Sessions.

---

## 📚 Additional Resources

- **Paymongo Documentation**: https://developers.paymongo.com/
- **API Reference**: https://developers.paymongo.com/reference
- **Test Cards**: https://developers.paymongo.com/reference#test-cards
- **Support**: support@paymongo.com

---

## ✅ Checklist

Before going live, ensure:

- [ ] Paymongo account created and verified
- [ ] Test API keys obtained and saved securely
- [ ] `.env` file updated with new keys
- [ ] Backend restarted and running
- [ ] Test payment successful
- [ ] Webhook configured and tested
- [ ] Account verified for live mode (if needed)
- [ ] Live API keys obtained (when ready)
- [ ] Production environment updated with live keys

---

**Need Help?** Check Paymongo's official documentation or contact their support team.
