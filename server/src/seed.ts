/**
 * Seed script — creates demo data for development
 * Run: npm run seed
 */

// This imports will be used when DB is connected
// For now, we simulate the seed by printing what would be created

const demoUser = {
  clerkId: 'demo-clerk-id',
  email: 'demo@contentagent.com',
  brandName: 'TechFlow',
  brandVoice: 'professional, educational',
  phrasesUse: 'data-driven, innovative, scalable',
  phrasesAvoid: 'synergy, disruption, guru',
};

const demoJobs = [
  {
    topic: '10 Productivity Hacks for Remote Workers in 2025',
    platform: 'instagram_carousel' as const,
    tone: 'educational' as const,
    targetAudience: 'Remote workers and digital nomads',
    status: 'done' as const,
    outputs: [
      {
        agentName: 'writer',
        outputType: 'final',
        qualityScore: 85,
        content: [
          { slideNumber: 1, headline: '🔥 10 Productivity Hacks', body: 'That Remote Workers Swear By in 2025 →', designHint: 'Bold hook, dark gradient background' },
          { slideNumber: 2, headline: '💡 Time Blocking 2.0', body: 'Use AI-powered calendar tools to automatically block focus time. Studies show 40% productivity boost.', designHint: 'Clean layout, icon accent' },
          { slideNumber: 3, headline: '🎯 The 2-Minute Rule', body: 'If a task takes less than 2 minutes, do it immediately. Prevents task pile-up and mental clutter.', designHint: 'Minimalist with timer icon' },
          { slideNumber: 4, headline: '📊 Async Communication', body: 'Replace 60% of meetings with Loom videos. Your team will thank you (and be more productive).', designHint: 'Stats highlight' },
          { slideNumber: 5, headline: '⚡ Energy Management', body: 'Track your peak energy hours. Schedule deep work during high-energy windows, admin during low-energy.', designHint: 'Energy curve graph suggestion' },
          { slideNumber: 6, headline: '🏠 Environment Design', body: 'Create a dedicated workspace with proper lighting. Even a small corner can boost focus by 25%.', designHint: 'Workspace illustration' },
          { slideNumber: 7, headline: '🧘 Strategic Breaks', body: 'The Pomodoro Technique + short walks = sustained focus. 5-minute breaks every 25 minutes.', designHint: 'Timer/break visual' },
          { slideNumber: 8, headline: '🤖 AI Assistants', body: 'Use AI for first drafts, email replies, and data analysis. Save 2+ hours daily on repetitive tasks.', designHint: 'AI/robot icon' },
          { slideNumber: 9, headline: '👉 Save this for later!', body: 'Follow @techflow for more productivity tips.\n\nWhich hack will you try first? Comment below! 💬', designHint: 'CTA slide, engagement prompt' },
        ],
      },
      {
        agentName: 'critic',
        outputType: 'critique',
        qualityScore: 85,
        content: {
          approved: true,
          totalScore: 85,
          scores: {
            hookStrength: 18,
            platformCompliance: 17,
            brandVoiceMatch: 16,
            valueDelivery: 18,
            ctaClarity: 16,
          },
          feedback: 'Strong hook and excellent value delivery. The carousel flows well with progressive tips. CTA could be slightly more specific about the next action.',
        },
      },
    ],
    logs: [
      { agentName: 'orchestrator', action: 'Created task plan', inputSummary: 'Productivity topic for Instagram', outputSummary: '3 search queries generated', durationMs: 1200 },
      { agentName: 'researcher', action: 'Web research completed', inputSummary: '3 Tavily searches', outputSummary: '5 facts, 4 trending angles', durationMs: 3400 },
      { agentName: 'writer', action: 'Initial draft created', inputSummary: 'Research report + platform rules', outputSummary: '9-slide carousel', durationMs: 4500 },
      { agentName: 'formatter', action: 'Formatted for Instagram', inputSummary: 'Carousel formatting', outputSummary: 'Emoji, word count, CTA verified', durationMs: 200 },
      { agentName: 'critic', action: 'Content APPROVED', inputSummary: 'Quality evaluation', outputSummary: 'Score: 85/100', durationMs: 2100 },
    ],
  },
  {
    topic: 'Why Every Startup Needs a Content Strategy in 2025',
    platform: 'linkedin_post' as const,
    tone: 'professional' as const,
    targetAudience: 'SaaS founders and startup CEOs',
    status: 'done' as const,
    outputs: [
      {
        agentName: 'writer',
        outputType: 'final',
        qualityScore: 78,
        content: {
          hook: "I spent $50K on ads before realizing content was free. Here's what I learned 👇",
          body: "Most startups burn through their runway on paid acquisition.\n\nBut the companies winning in 2025? They're building audiences, not just buying them.\n\nHere's why content strategy isn't optional anymore:\n\n📊 Content marketing costs 62% less than traditional marketing and generates 3x more leads.\n\n🎯 Organic search drives 53% of all website traffic — more than any other channel.\n\n💡 Companies with blogs produce 67% more monthly leads than those without.\n\nThe playbook is simple:\n\n1. Pick ONE platform (LinkedIn for B2B, Instagram for B2C)\n2. Post consistently (3-5x per week minimum)\n3. Lead with value, not sales pitches\n4. Repurpose across channels\n5. Track what resonates, double down\n\nThe best time to start was yesterday. The second best time is today.",
          cta: "What's your biggest content challenge? Drop it in the comments — I'll share specific advice for your situation. 💬",
          hashtags: ['#ContentStrategy', '#StartupGrowth', '#B2BMarketing', '#SaaS', '#FounderTips'],
        },
      },
      {
        agentName: 'critic',
        outputType: 'critique',
        qualityScore: 78,
        content: {
          approved: true,
          totalScore: 78,
          scores: {
            hookStrength: 17,
            platformCompliance: 16,
            brandVoiceMatch: 15,
            valueDelivery: 16,
            ctaClarity: 14,
          },
          feedback: 'Good hook with personal story angle. Stats are compelling. CTA could be more specific. Consider adding a contrarian take to stand out more.',
        },
      },
    ],
    logs: [
      { agentName: 'orchestrator', action: 'Created task plan', inputSummary: 'Content strategy for LinkedIn', outputSummary: '3 search queries', durationMs: 1100 },
      { agentName: 'researcher', action: 'Research completed', inputSummary: '3 Tavily searches', outputSummary: '4 facts, 3 angles', durationMs: 2800 },
      { agentName: 'writer', action: 'Draft created', inputSummary: 'Research + brand voice', outputSummary: 'LinkedIn post', durationMs: 3200 },
      { agentName: 'formatter', action: 'Formatted for LinkedIn', inputSummary: 'Post formatting', outputSummary: 'Line breaks, hashtags verified', durationMs: 150 },
      { agentName: 'critic', action: 'Content APPROVED', inputSummary: 'Quality evaluation', outputSummary: 'Score: 78/100', durationMs: 1900 },
    ],
  },
];

console.info('🌱 Seed data preview:');
console.info('\n📧 Demo User:', JSON.stringify(demoUser, null, 2));
console.info(`\n📝 ${demoJobs.length} Demo Jobs:`);
demoJobs.forEach((job, i) => {
  console.info(`  ${i + 1}. [${job.platform}] ${job.topic} — Score: ${job.outputs[1]?.qualityScore || 'N/A'}/100`);
});

console.info('\n✅ To use this seed data, set up DATABASE_URL in .env and run migrations first.');
console.info('   For development without DB, the app uses in-memory storage.');

export { demoUser, demoJobs };
