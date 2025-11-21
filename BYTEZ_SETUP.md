# Bytez AI Integration Setup

## Overview

Deborah now uses Bytez AI API for generating responses, with a fallback to rule-based responses if the API is unavailable.

## Configuration

The Bytez API key is configured in `script.bytez.js`:
- **API Key**: `7b2126049f04e196d885fdcbb247a136`
- **Model**: `Qwen/Qwen3-0.6B`

## How It Works

1. **Primary**: When a user sends a message, Deborah tries to get a response from Bytez API
2. **Fallback**: If Bytez API fails or is unavailable, it uses the rule-based response system
3. **Hybrid**: The system combines AI responses with emotional analysis and context

## API Endpoint

The script tries multiple possible endpoints:
- `https://api.bytez.com/v1/chat/completions`
- `https://api.bytez.com/api/v1/chat/completions`
- And several other variations

**Note**: You may need to update the `baseUrl` in `script.bytez.js` with the correct Bytez API endpoint.

## Finding the Correct API Endpoint

If the API calls are failing, you can:

1. **Check Bytez Documentation**: Look for their REST API documentation
2. **Check Network Tab**: Open browser DevTools → Network tab → Send a message → Look for API calls
3. **Update baseUrl**: Edit `script.bytez.js` and set the correct `baseUrl`

## Testing

1. Open the app and go to Deborah chat
2. Send a message
3. Check browser console:
   - ✅ "Using Bytez AI response" = Bytez is working
   - 📝 "Using fallback response" = Using rule-based responses

## Disabling Bytez

To disable Bytez and use only rule-based responses:

Edit `script.bytez.js`:
```javascript
enabled: false, // Set to false to disable Bytez
```

## Troubleshooting

### "All API endpoints failed"

- Check if the API key is correct
- Verify the API endpoint URL
- Check browser console for CORS errors
- Ensure the API key has proper permissions

### Responses are slow

- Bytez API might be slow
- Check network tab for response times
- Consider adding a timeout

### Getting fallback responses

- Bytez API might be down
- API endpoint might be incorrect
- Check console for specific error messages

## Security Note

⚠️ **Important**: The API key is currently in the client-side code. For production:

1. **Use a backend proxy**: Create a server endpoint that calls Bytez API
2. **Store key server-side**: Never expose API keys in client code
3. **Use environment variables**: Store keys in server environment

## Current Status

✅ Bytez client integrated
✅ Fallback system working
✅ Error handling in place
⚠️ API endpoint may need verification
⚠️ Consider moving to server-side proxy for production

