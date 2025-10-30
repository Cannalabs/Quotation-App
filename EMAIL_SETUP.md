# Email Configuration Setup

This application now supports direct email sending without opening third-party email clients. Follow these steps to configure email functionality:

## 1. Install Dependencies

First, install the new email dependencies:

```bash
cd backend
pip install -r requirements.txt
```

## 2. Configure Email Settings

### Option A: Environment Variables (Recommended)

Create a `.env.conf` file in the `backend` directory with your email settings:

```env
# Email Configuration
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
MAIL_FROM_NAME=Grow United Italy
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_TLS=true
MAIL_SSL=false
MAIL_USE_CREDENTIALS=true
```

### Option B: UI Configuration

1. Start the application
2. Go to Company Settings
3. Click on the "Email Settings" tab
4. Fill in your SMTP configuration
5. Test the configuration using the "Send Test" button

## 3. Gmail Setup (Most Common)

If using Gmail, you'll need to:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password (not your regular Gmail password) in the configuration

## 4. Other Email Providers

### Outlook/Hotmail
```env
MAIL_SERVER=smtp-mail.outlook.com
MAIL_PORT=587
MAIL_TLS=true
MAIL_SSL=false
```

### Yahoo Mail
```env
MAIL_SERVER=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_TLS=true
MAIL_SSL=false
```

### Custom SMTP Server
```env
MAIL_SERVER=your_smtp_server.com
MAIL_PORT=587
MAIL_TLS=true
MAIL_SSL=false
```

## 5. Testing

1. Configure your email settings
2. Go to any quotation
3. Click "Send Email" - it will now send directly without opening your email client
4. Use the test email feature in Company Settings to verify your configuration

## Features

- ✅ Direct email sending (no third-party apps)
- ✅ Professional email templates
- ✅ Email configuration through UI
- ✅ Test email functionality
- ✅ Support for major email providers
- ✅ Secure credential handling

## Troubleshooting

- **Authentication failed**: Check your username/password and ensure you're using an App Password for Gmail
- **Connection timeout**: Verify your SMTP server and port settings
- **TLS/SSL errors**: Try toggling TLS/SSL settings based on your provider's requirements
