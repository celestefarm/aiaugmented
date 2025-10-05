# OpenAI Rate Limit Guide

## Issue: HTTP 429 - Rate Limit Exceeded

You're seeing this error because your OpenAI API key has hit its rate limit. This is a common issue when:
- Making too many requests in a short period
- Using a free-tier API key with low limits
- Reaching your monthly usage quota

## ✅ What We Fixed

1. **CORS Issue** - Fixed! The frontend can now communicate with the backend streaming endpoint.
2. **Error Messages** - Improved to show user-friendly messages for rate limits and other API errors.
3. **Database Consistency** - Fixed imports to use the correct database module.

## 🔧 How to Resolve the Rate Limit Error

### Option 1: Wait and Retry (Recommended for Testing)
- **Wait 60 seconds** before trying again
- Rate limits typically reset every minute
- The error message now tells you this automatically

### Option 2: Check Your OpenAI Account
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Check:
   - **Usage**: [platform.openai.com/account/usage](https://platform.openai.com/account/usage)
   - **Rate Limits**: [platform.openai.com/account/rate-limits](https://platform.openai.com/account/rate-limits)
   - **Billing**: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

### Option 3: Upgrade Your API Plan
If you're on a free tier or hitting limits frequently:
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Add payment method
3. Set up auto-recharge or add credits
4. Higher tiers have better rate limits:
   - Free tier: Very limited
   - Pay-as-you-go: 3,500 RPM (requests per minute) for GPT-4
   - Higher tiers: More generous limits

### Option 4: Use a Different API Key
If you have multiple OpenAI accounts:
1. Create or get a different API key
2. Update your backend environment variables
3. Restart the backend server

## 📝 Setting Up Your OpenAI API Key

### For Local Development:

1. **Create a `.env` file** in the `backend` directory:
   ```bash
   cd backend
   touch .env  # On Windows: type nul > .env
   ```

2. **Add your OpenAI API key**:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET_KEY=your-secret-key-here
   ```

3. **Get your API key** from [OpenAI API Keys](https://platform.openai.com/api-keys)

4. **Restart the backend**:
   ```bash
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## 🎯 Current Error Handling

The application now provides helpful error messages:

### Rate Limit (429):
```
⏱️ Rate limit reached. OpenAI API is temporarily limiting requests. 
Please wait 60 seconds and try again, or check your OpenAI API quota 
at platform.openai.com/account/usage.
```

### Authentication (401):
```
🔑 OpenAI API key is invalid or missing. 
Please check your API configuration.
```

### Server Error (500+):
```
🔥 OpenAI service is experiencing issues. 
Please try again in a moment.
```

## 🧪 Testing the Fix

1. **Wait 60 seconds** after seeing the rate limit error
2. **Try sending a message** to the AI agent again
3. If it still fails, check your OpenAI account usage and limits
4. Consider switching to a different API key or upgrading your plan

## 💡 Best Practices to Avoid Rate Limits

1. **Implement Rate Limiting on Frontend**
   - Add cooldown between requests
   - Disable send button temporarily after sending
   - Show countdown timer to user

2. **Use Caching**
   - Cache similar queries
   - Reuse responses when appropriate

3. **Batch Requests**
   - Combine multiple small requests when possible

4. **Monitor Usage**
   - Regularly check your OpenAI dashboard
   - Set up billing alerts
   - Track usage patterns

## 📊 Rate Limit Tiers (as of 2024)

| Tier | RPM (GPT-4) | TPM (Tokens) | Cost |
|------|-------------|--------------|------|
| Free | Very Limited | Very Limited | $0 |
| Tier 1 | 500 | 10,000 | Pay-as-you-go |
| Tier 2 | 5,000 | 80,000 | $50+ spent |
| Tier 3 | 10,000 | 160,000 | $100+ spent |
| Tier 4 | 50,000 | 800,000 | $1,000+ spent |

*Note: Limits vary by model and are subject to change. Check OpenAI's documentation for current limits.*

## 🔍 Debugging Rate Limit Issues

If you continue to have issues:

1. **Check Backend Logs**:
   ```bash
   # Look for rate limit errors in the backend console
   cd backend
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Look for streaming errors
   - Check the Network tab for failed requests

3. **Verify API Key**:
   ```bash
   # Test your API key directly
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## 📞 Support

If you're still experiencing issues:
- Check [OpenAI Status Page](https://status.openai.com/)
- Review [OpenAI Documentation](https://platform.openai.com/docs)
- Contact OpenAI Support through your account dashboard

## ✨ Next Steps

1. ✅ CORS issue - **FIXED**
2. ✅ Error messaging - **IMPROVED**
3. ⏳ Rate limit - **Need to wait or upgrade API plan**
4. 🎯 Ready to chat once rate limit clears!

---

*Last Updated: October 5, 2025*



