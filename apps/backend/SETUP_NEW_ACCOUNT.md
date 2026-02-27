# Guide: Setting Up a New Account for LGU Payment System

This guide will help you create and connect to new service accounts for your application.

## 🔐 Security Warning

**IMPORTANT**: The `.env` file contains sensitive credentials. Never commit it to version control. Always use environment variables in production.

---

## 1. MongoDB Atlas (Database)

### Steps to Create New MongoDB Account:

1. **Sign up/Login**: Go to https://www.mongodb.com/cloud/atlas
2. **Create Cluster**: 
   - Click "Build a Database"
   - Choose a free tier (M0) or paid plan
   - Select your preferred cloud provider and region
3. **Create Database User**:
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create a strong username and password
   - Set user privileges (at minimum: "Read and write to any database")
4. **Configure Network Access**:
   - Go to "Network Access" → "Add IP Address"
   - For development: Add `0.0.0.0/0` (allows all IPs - **use only for development**)
   - For production: Add your specific server IP addresses
5. **Get Connection String**:
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (format: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<username>` and `<password>` with your database user credentials

### Update `.env`:

```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

**Note**: URL-encode special characters in your password (e.g., `@` becomes `%40`, `#` becomes `%23`)

---

## 2. Cloudinary (Image/File Storage)

### Steps to Create New Cloudinary Account:

1. **Sign up**: Go to https://cloudinary.com/users/register/free
2. **Get Credentials**:
   - After signup, go to your Dashboard
   - You'll see: Cloud Name, API Key, API Secret

### Update `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 3. Mailgun (Email Service)

### Steps to Create New Mailgun Account:

1. **Sign up**: Go to https://www.mailgun.com/signup
2. **Verify Domain**:
   - Add and verify your domain (or use sandbox domain for testing)
   - Complete DNS verification
3. **Get API Key**:
   - Go to "Sending" → "Domain Settings"
   - Copy your API Key

### Update `.env`:

```env
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_verified_domain.com
```

---

## 4. Paymongo (Payment Gateway)

### Steps to Create New Paymongo Account:

1. **Sign up**: Go to https://paymongo.com/
2. **Get API Keys**:
   - Go to "Developers" → "API Keys"
   - Copy your Public Key and Secret Key
   - For webhooks, create a webhook secret

### Update `.env`:

```env
PAYMONGO_PUBLIC_KEY=pk_test_xxxxx  # or pk_live_xxxxx for production
PAYMONGO_SECRET_KEY=sk_test_xxxxx  # or sk_live_xxxxx for production
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxx
```

---

## 5. Amazon S3 (File Storage Alternative)

### Steps to Create New AWS Account:

1. **Sign up**: Go to https://aws.amazon.com/s3/
2. **Create IAM User**:
   - Go to AWS Console → IAM → Users → "Add users"
   - Create user with "Programmatic access"
   - Attach policy: `AmazonS3FullAccess` (or create custom policy)
   - Save Access Key ID and Secret Access Key
3. **Create S3 Bucket**:
   - Go to S3 → "Create bucket"
   - Choose bucket name and region
   - Configure permissions and settings

### Update `.env`:

```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=ap-southeast-1
```

**⚠️ Note**: There's currently a space in `AWS_S3_REGION =ap-southeast-1` - remove the space before `=`:
```env
AWS_S3_REGION=ap-southeast-1
```

---

## 6. JWT Secrets (Generate New Ones)

For security, generate new JWT secrets:

### Using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this twice to generate two different secrets.

### Update `.env`:

```env
JWT_ACCESS_SECRET=your_generated_secret_1
JWT_REFRESH_SECRET=your_generated_secret_2
```

---

## 7. Admin Account

The admin account is created automatically on first run. Update credentials:

### Update `.env`:

```env
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=YourSecurePassword123!
```

---

## ✅ Testing Your New Connection

After updating `.env`:

1. **Restart your backend server**:
   ```bash
   npm run start:dev
   # or
   nx serve backend
   ```

2. **Check logs** for connection success:
   - MongoDB: Should see "Mongoose connected successfully"
   - Other services: Check for any error messages

3. **Test endpoints**:
   - Health check endpoint
   - Login endpoint
   - File upload endpoint (if using Cloudinary/S3)

---

## 🔄 Migration Checklist

If migrating from old account to new account:

- [ ] Backup existing database (if needed)
- [ ] Update all `.env` variables
- [ ] Update production environment variables (Render, Vercel, etc.)
- [ ] Test all integrations
- [ ] Update any hardcoded credentials in code
- [ ] Revoke old API keys/credentials for security

---

## 📝 Example Complete `.env` Template

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://your-frontend-url.com

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Mailgun
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_verified_domain.com

# Paymongo
PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
PAYMONGO_SECRET_KEY=sk_test_xxxxx
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxx

# Amazon S3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=ap-southeast-1
```

---

## 🆘 Troubleshooting

### MongoDB Connection Issues:
- Check if IP is whitelisted
- Verify username/password are correct
- Ensure connection string format is correct
- Check cluster status in Atlas dashboard

### Other Service Issues:
- Verify API keys are correct
- Check service status pages
- Review error logs in backend console
- Ensure billing/subscription is active (for paid services)

---

**Need Help?** Check the official documentation for each service or review backend logs for specific error messages.
