# ⚡ Sales Dojo — AI Sales Training PWA

Practice your pitch against AI buyers who never break character. Get brutally honest scorecards with specific rewrites.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsal186%2Frouze-booking-agent&env=GEMINI_API_KEY&envDescription=Get%20a%20free%20Gemini%20API%20key%20at%20https%3A%2F%2Faistudio.google.com%2Fapikey&project-name=sales-dojo&repository-name=sales-dojo-mobile)

---

## One-Click Deploy

1. **Get a free Gemini API key** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. **Click the Deploy button above**
3. **Paste your API key** when prompted
4. **Done** — your app is live

---

## Run Locally

```bash
git clone https://github.com/sal186/rouze-booking-agent.git
cd rouze-booking-agent
npm install

# Add your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

| Screen | What It Does |
|--------|-------------|
| **Scenario Builder** | Describe your pitch scenario, pick difficulty (Easy / Moderate / Difficult) |
| **Roleplay Chat** | Live conversation with an AI buyer who never breaks character |
| **Scorecard** | 5-dimension scoring with exact quotes, analysis, and better-response rewrites |
| **History** | Track all sessions with score trends and stats over time |

### Scoring Dimensions
- 💛 **Empathy & Rapport** — connection and relationship building
- 🛡️ **Objection Handling** — response to pushback and concerns
- 💎 **Clarity & Value** — message clarity and value articulation
- 🎯 **Closing Technique** — next-step creation and closing ability
- 👂 **Active Listening** — response to buyer cues and signals

---

## Architecture

- **Frontend**: Next.js 14 (App Router), vanilla CSS, zero component libraries
- **AI**: Gemini 2.0 Flash Lite (roleplay) + Gemini 2.0 Flash (scorecards)
- **Storage**: 100% local storage — zero backend, zero database
- **Cost**: ~1-2 cents per full session
- **Hosting**: Vercel free tier
- **PWA**: Installable on mobile home screen

---

## Customization

### Swap AI Provider
Edit `src/app/api/chat/route.js` to point at OpenAI, Claude, or any other API.

### Change Scoring Dimensions
Edit `src/lib/scoring.js` for display labels and `src/lib/prompts.js` for the scorecard JSON schema.

### Add Scenarios
Edit the `QUICK_PICKS` array in `src/app/page.js`.

### App Icons
Replace `public/icon-192.png` and `public/icon-512.png` with your own.

---

## License

MIT
