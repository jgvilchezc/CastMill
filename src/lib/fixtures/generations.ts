export type ContentFormat = "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail";

export interface Generation {
  id: string;
  episodeId: string;
  format: ContentFormat;
  content: string; // Markdown or plain text
  status: "ready" | "generating";
  memoryRefs: string[]; // Episode IDs referenced
  createdAt: string;
}

export const mockGenerations: Generation[] = [
  {
    id: "gen_50_blog",
    episodeId: "ep_50",
    format: "blog",
    status: "ready",
    memoryRefs: ["ep_12"],
    createdAt: "2026-02-23T14:00:00Z",
    content: `
# Are Cold Calls Dead? The 2026 Sales Reality Check

If you're still dialing 100 strangers a day and hoping for a miracle, you're not selling—you're gambling.

On this week's episode, I sat down with Sarah Jenkins to dissect what's actually working in 2026. The headline? **Context is king.**

## The "Human-First" Pivot

Sarah put it perfectly: *"AI makes it easy to send a thousand emails, but it makes it harder to be human."*

We're drowning in automated outreach. Your prospects receive 50 generic "quick question" emails before lunch. To stand out, you have to do the one thing AI struggles with: be genuinely relevant.

### Why Trust is Still the Currency

As I mentioned back in **Episode 12 ("Direct Sales Fundamentals")**, direct sales has always been about one thing: trust. If they don't trust you, they won't buy. It doesn't matter how perfect your script is or how many follow-ups you automate.

In 2026, trust isn't built by volume. It's built by showing you've done your homework.

## The 3 Pillars of Modern Sales

1. **Hyper-Personalization**: Not just "Hi {First_Name}". It's referencing their last funding round, their recent hiring spree, or a specific problem their industry is facing *today*.
2. **Value-First Outreach**: Don't ask for a meeting. Give them something useful first. A report, an insight, a connection.
3. **Multi-Channel Consistency**: If your LinkedIn persona doesn't match your email tone, you look fake.

At the end of the day, sales hasn't changed. The *tools* have changed. But the human psychology of buying? That's exactly the same as it was 50 years ago.

Stop automating spam. Start automating research. That's how you win in 2026.
    `
  },
  {
    id: "gen_50_tweet",
    episodeId: "ep_50",
    format: "tweet_thread",
    status: "ready",
    memoryRefs: [],
    createdAt: "2026-02-23T14:05:00Z",
    content: `
1/ 🧵 Cold calling isn't dead. Lazy calling is.

In 2026, if you're dialling 100 strangers with zero context, you're not selling. You're gambling.

Here's why context is the new currency. 👇

2/ We're drowning in AI slop. 🤖

Your prospects get 50 generic "quick question" emails before lunch.

To stand out, you have to do the one thing AI struggles with: be genuinely relevant.

3/ As Sarah Jenkins said on the pod today:

"The winners in 2026 will be the ones who use AI to be *more* human, not less."

Use AI for research, not just for spamming.

4/ The 3 Pillars of Modern Sales:

1️⃣ Hyper-Personalization (real research, not just name tokens)
2️⃣ Value-First (give before you ask)
3️⃣ Multi-Channel Consistency (don't be a bot on LinkedIn)

5/ At the end of the day, trust is the only hack.

If they don't trust you, they won't buy. Simple as that.

Listen to the full breakdown here: [LINK] #Sales #Growth #AI
    `
  },
  {
    id: "gen_50_linkedin",
    episodeId: "ep_50",
    format: "linkedin",
    status: "ready",
    memoryRefs: ["ep_12"],
    createdAt: "2026-02-23T14:06:00Z",
    content: `
Unpopular opinion: AI is ruining sales.

Okay, maybe not ruining it. But it's definitely ruining our inboxes.

I spoke with Sarah Jenkins this week about the state of sales in 2026, and one thing became painfully clear:

**Volume is no longer a competitive advantage.**

When everyone can send 1,000 personalized emails for $5, being "loud" doesn't work anymore. Being *relevant* does.

We talked about the "Human-First" pivot. The idea that as technology scales, human connection becomes more valuable, not less.

It reminds me of something we discussed back in Episode 12: direct sales is fundamentally about trust. If I don't trust you, I don't care about your features.

So, how do you build trust at scale?

1. Stop automating everything.
2. Use AI to research, not just to write.
3. Treat every prospect like a human, not a row in a CSV.

The tools have changed. The psychology hasn't.

What's one way you're keeping it human this year? 👇

#SalesStrategies #HumanFirst #AI #Growth
    `
  },
  {
    id: "gen_50_newsletter",
    episodeId: "ep_50",
    format: "newsletter",
    status: "ready",
    memoryRefs: [],
    createdAt: "2026-02-23T14:07:00Z",
    content: `
## Subject: Is cold calling finally dead?

Hey everyone,

Let's be real for a second. When was the last time you answered a call from an unknown number and were *happy* about it?

Exactly.

But does that mean outbound sales is dead? Far from it. It just means the "spray and pray" era is officially over.

This week on the podcast, I sat down with **Sarah Jenkins** to break down the new playbook for 2026.

We dove deep into:
- Why "context" is the new currency (and how to get it)
- The "Human-First" sales approach
- How to use AI to research prospects without sounding like a bot

**My biggest takeaway:**
Volume is a commodity. Insight is the differentiator. If you can show a prospect you understand their specific problem in the first 5 seconds, you earn the right to the next 5 minutes.

[Listen to the full episode here]

Until next week,
[Your Name]
    `
  },
  {
    id: "gen_50_youtube_desc",
    episodeId: "ep_50",
    format: "youtube_desc",
    status: "ready",
    memoryRefs: [],
    createdAt: "2026-02-23T14:08:00Z",
    content: `
Are cold calls dead? Is AI replacing SDRs? In this episode, we sit down with sales expert Sarah Jenkins to discuss the future of outbound sales in 2026.

We cover why "context" is king, how to use AI for research instead of spam, and the 3 pillars of a human-first sales strategy.

Timestamps:
00:00 - Intro: The state of sales in 2026
02:15 - Why volume doesn't work anymore
08:45 - The "Human-First" Pivot
14:30 - Using AI for deep research
21:10 - How to build trust (referencing Ep 12)
28:00 - Q&A and closing thoughts

#Sales #SaaS #Growth #AI #Podcast
    `
  }
];
