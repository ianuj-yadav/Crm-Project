/**
 * ============================================================================
 * AURA // AI-NATIVE CRM DATABASE SEEDER
 * Populates relational tables with realistic campaigns, creator profiles,
 * and classified inbox messages.
 * ============================================================================
 */

const db = require('./db.js');
const { classifyReplyIntent } = require('../../classifier.js');

function seedDatabase() {
  console.log("================================================================================");
  console.log("AURA // SEEDING AI-NATIVE CRM RELATIONAL DATABASE");
  console.log("================================================================================");

  // 1. Seed Campaigns
  const campaigns = [
    {
      id: "camp_ai_hardware",
      title: "AI Hardware Launch — Q3 Creator Blitz",
      brand: "Aura Robotics Inc.",
      budget_pool: 125000.00,
      deliverables: "1x Dedicated YouTube Review (10m+), 2x Instagram Reels, 3x IG Stories with affiliate link",
      launch_date: "2026-08-15",
      status: "active"
    },
    {
      id: "camp_podcast_collab",
      title: "Creator Founders Tech Series Season 2",
      brand: "Venture Studio Pro",
      budget_pool: 45000.00,
      deliverables: "45m Video Interview + Social Cutdowns",
      launch_date: "2026-09-01",
      status: "active"
    },
    {
      id: "camp_skincare_glow",
      title: "Lumiere Peptide Glow Serum Launch",
      brand: "Lumiere Paris",
      budget_pool: 80000.00,
      deliverables: "1x TikTok GRWM Video + 1x IG Feed Carousel",
      launch_date: "2026-07-28",
      status: "active"
    }
  ];

  campaigns.forEach(c => db.insertCampaign(c));
  console.log(`[SEED] Inserted ${campaigns.length} campaigns.`);

  // 2. Seed Creator Profiles
  const creators = [
    { id: "cr_marcus", handle: "@marcus_tech", display_name: "Marcus Sterling", platform: "YouTube", followers: 1250000, engagement_rate: 6.4 },
    { id: "cr_elena", handle: "@elena.styles", display_name: "Elena Rostova", platform: "Instagram", followers: 480000, engagement_rate: 4.8 },
    { id: "cr_zack", handle: "@zack_reviews", display_name: "Zack Chen", platform: "TikTok", followers: 890000, engagement_rate: 8.1 },
    { id: "cr_sarah", handle: "@sarah.codes", display_name: "Sarah Jenkins", platform: "YouTube", followers: 310000, engagement_rate: 7.2 },
    { id: "cr_leo", handle: "@leo_vlogs", display_name: "Leo Vance", platform: "Instagram", followers: 210000, engagement_rate: 3.9 }
  ];

  creators.forEach(cr => db.insertCreator(cr));
  console.log(`[SEED] Inserted ${creators.length} creator profiles.`);

  // 3. Seed Realistic Incoming Creator Replies
  const seedMessages = [
    {
      creator_handle: "@marcus_tech",
      campaign_id: "camp_ai_hardware",
      platform: "Email",
      raw_message: "omg yes I'm so down for this!! But what's the budget for dedicated 10m YouTube integrations?"
    },
    {
      creator_handle: "@elena.styles",
      campaign_id: "camp_skincare_glow",
      platform: "IG DM",
      raw_message: "Sounds amazing! Send me more details and let's make it happen!!"
    },
    {
      creator_handle: "@zack_reviews",
      campaign_id: "camp_ai_hardware",
      platform: "TikTok DM",
      raw_message: "I'm slammed until mid August, could we talk after the 20th?"
    },
    {
      creator_handle: "@sarah.codes",
      campaign_id: "camp_podcast_collab",
      platform: "Email",
      raw_message: "Thanks for reaching out! I'm not taking on new brand partnerships right now."
    },
    {
      creator_handle: "@leo_vlogs",
      campaign_id: "camp_skincare_glow",
      platform: "IG DM",
      raw_message: "Let me think about it and check with my manager first."
    },
    {
      creator_handle: "@marcus_tech",
      campaign_id: "camp_podcast_collab",
      platform: "Email",
      raw_message: "What is the deadline for deliverables? Also what are your rates for a guest appearance?"
    }
  ];

  seedMessages.forEach((msg, idx) => {
    const classification = classifyReplyIntent(msg.raw_message);
    
    // Determine automated CRM Action Taken based on predicted intent
    let actionTaken = "Logged into CRM Queue";
    if (classification.intent === "pricing_query") {
      actionTaken = "Auto-sent Rate Card PDF & Campaign Budget Tiers ($15k-$35k)";
    } else if (classification.intent === "availability_query") {
      actionTaken = "Auto-attached Scheduling Calendar & Production Timeline (Aug 15)";
    } else if (classification.intent === "interested") {
      actionTaken = "Moved to 'Ready to Contract' Stage & Assigned Talent Manager";
    } else if (classification.intent === "not_interested") {
      actionTaken = "Tagged 'Opted Out' & Suppressed Outreach for 90 Days";
    } else if (classification.intent === "unclear") {
      actionTaken = "Flagged for Human Manager Review + Scheduled 5-Day Check-in";
    }

    db.insertReply({
      id: `reply_seed_00${idx + 1}`,
      campaign_id: msg.campaign_id,
      creator_handle: msg.creator_handle,
      platform: msg.platform,
      raw_message: msg.raw_message,
      predicted_intent: classification.intent,
      intent_confidence: classification.confidence,
      intent_rationale: classification.rationale,
      status: "auto_actioned",
      crm_action_taken: actionTaken,
      requires_human_review: classification.intent === "unclear",
      received_at: new Date(Date.now() - idx * 3600000).toISOString()
    });
  });

  console.log(`[SEED] Inserted & classified ${seedMessages.length} rich creator replies.`);
  const stats = db.getDatabaseStats();
  console.log("[SEED] Database Stats:", JSON.stringify(stats, null, 2));
  console.log("================================================================================");
  console.log("SEEDING COMPLETE. PERSISTENT STORE READY AT database/crm_persistent_store.json");
  console.log("================================================================================");
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
