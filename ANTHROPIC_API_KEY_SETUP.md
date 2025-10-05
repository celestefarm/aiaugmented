# Anthropic API Key Configuration Guide

## Error Message
```
❌ [STREAMING] Stream error: Anthropic API key not configured
```

## Problem
The application requires an Anthropic API key to communicate with Claude AI models, but the `.env` file is missing or doesn't contain the `ANTHROPIC_API_KEY`.

## Solution

### Step 1: Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Click **Create Key** or copy an existing key
5. Copy your API key (it starts with `sk-ant-`)

### Step 2: Create the `.env` File

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create a new file named `.env` (copy from `.env.example`):
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env
   
   # Windows Command Prompt
   copy .env.example .env
   
   # macOS/Linux
   cp .env.example .env
   ```

3. Open the `.env` file in a text editor

4. Replace `your_anthropic_api_key_here` with your actual API key:
   ```env
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   ```

### Step 3: Verify Configuration

After creating the `.env` file with your API key:

1. **Restart the backend server** (this is crucial!):
   ```bash
   # Stop the current server (Ctrl+C)
   # Then start it again:
   cd backend
   python main.py
   ```

2. Look for this success message in the backend console:
   ```
   🔑 Loading .env from: C:\path\to\backend\.env
   🔑 .env exists: True
   🔑 ANTHROPIC_API_KEY loaded: ✅ YES
   🔑 Key starts with: sk-ant-api03-...
   ```

3. If you see `❌ NO` for the API key, check:
   - The `.env` file is in the `backend` directory
   - The file is named `.env` exactly (not `.env.txt`)
   - There are no spaces around the `=` sign
   - The API key is on the same line as `ANTHROPIC_API_KEY=`

### Step 4: Test the Application

1. Open the frontend at `http://localhost:5137`
2. Try sending a message to an AI agent
3. You should now see responses instead of errors

## Troubleshooting

### Issue: Still getting "API key not configured" error

**Solution**: Make sure you restarted the backend server after creating the `.env` file. The environment variables are only loaded when the server starts.

### Issue: `.env` file not found

**Solution**: 
1. Ensure you're in the `backend` directory
2. Check if the file is named exactly `.env` (not `.env.txt` or `env`)
3. On Windows, make sure "File name extensions" is enabled in File Explorer to see the real filename

### Issue: Invalid API key error

**Solution**: 
1. Verify your API key is correct
2. Make sure there are no extra spaces or quotes around the key
3. Confirm the key starts with `sk-ant-`
4. Check your Anthropic account is active and has API access

### Issue: Rate limit errors

**Solution**: 
- Anthropic has rate limits on API usage
- Wait 60 seconds and try again
- Check your usage at [Anthropic Console](https://console.anthropic.com/)
- Consider upgrading your plan if you're hitting limits frequently

## Security Notes

⚠️ **Important**: 
- Never commit your `.env` file to version control
- Never share your API key publicly
- The `.env` file should already be in `.gitignore`
- Rotate your API key if you suspect it's been compromised

## Additional Configuration

The `.env` file can also include other configuration options:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/agentic_boardroom

# Security
JWT_SECRET=your-secret-key-here

# Other API Keys
OPENAI_API_KEY=your_openai_key_here  # Optional, if using OpenAI models
```

## Quick Reference

```bash
# 1. Copy example file
cd backend
copy .env.example .env

# 2. Edit .env and add your API key
# ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# 3. Restart backend server
python main.py

# 4. Verify the key is loaded (check console output)
# Look for: 🔑 ANTHROPIC_API_KEY loaded: ✅ YES
```

---

**Need your API key?** → [Get it here](https://console.anthropic.com/)



