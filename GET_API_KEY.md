# How to Get Hugging Face API Key

## Why You Need It

The chatbot uses Hugging Face API for:
- **Embeddings**: Converting text into vectors for semantic search
- **LLM**: Generating answers to your questions

## Get Your Free API Key

1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up for a free account (if you don't have one)
3. Go to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
4. Click "New token"
5. Give it a name (e.g., "chatbot-rag")
6. Select "Read" permission (sufficient for inference)
7. Click "Generate token"
8. **Copy the token** (you won't see it again!)

## Add to Your Project

### Option 1: Using .env file (Recommended)

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Add your API key:
```env
HUGGINGFACE_API_KEY=your_token_here
```

### Option 2: Using Docker Compose

Add to your `docker-compose.yml` environment section:
```yaml
environment:
  - HUGGINGFACE_API_KEY=your_token_here
```

Or use an environment variable:
```bash
export HUGGINGFACE_API_KEY=your_token_here
docker-compose up
```

## Free Tier Limits

- **Free tier**: 1,000 requests/day
- **Pro tier**: Higher limits (paid)

For most testing and small projects, the free tier is sufficient.

## Troubleshooting

If you see errors about API key:
- Make sure the key is set correctly (no extra spaces)
- Restart Docker containers after adding the key
- Check that the key has "Read" permission
- Verify the key is not expired

## Security Note

**Never commit your API key to Git!**
- The `.env` file is already in `.gitignore`
- Don't share your API key publicly

