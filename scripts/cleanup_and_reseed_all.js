import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Preferred test accounts for deterministic seeding
const PREFERRED = {
  donorEmail: 'cjjumawan43925@liceo.edu.ph',
  recipientEmail: 'cristanjade14@gmail.com',
  volunteerEmail: 'cristanjade70@gmail.com',
  adminEmail: 'blutech18@gmail.com'
};

dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupAll() {
  console.log('🧹 Cleaning up all data...\n');
  
  try {
    // Clean up in order to respect foreign key constraints
    // Note: event_participants, donation_claims, delivery_confirmations are now JSONB in parent tables
    
    await supabase.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted deliveries');
    
    await supabase.from('volunteer_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted volunteer_requests');
    
    // Clear JSONB fields in events (participants, items are now arrays)
    const { data: allEvents } = await supabase.from('events').select('id');
    if (allEvents && allEvents.length > 0) {
      await supabase.from('events')
        .update({ participants: null, items: null })
        .in('id', allEvents.map(e => e.id));
      console.log('✅ Cleared events participants and items JSONB fields');
    }
    
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted events');
    
    // Clear JSONB fields in donations (claims, confirmations are now arrays)
    const { data: allDonations } = await supabase.from('donations').select('id');
    if (allDonations && allDonations.length > 0) {
      await supabase.from('donations')
        .update({ claims: null, confirmations: null })
        .in('id', allDonations.map(d => d.id));
      console.log('✅ Cleared donations claims and confirmations JSONB fields');
    }
    
    await supabase.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted donations');
    
    await supabase.from('donation_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted donation_requests');
    
    // Delete old notifications to reseed with new format
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted notifications');
    
    // Clean up consolidated tables
    await supabase.from('feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted feedback');
    
    await supabase.from('performance_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted performance_metrics');
    
    // Clear JSONB fields in user_profiles (donor, recipient, volunteer, preferences, id_documents, reports)
    const { data: allProfiles } = await supabase.from('user_profiles').select('id');
    if (allProfiles && allProfiles.length > 0) {
      await supabase.from('user_profiles')
        .update({ 
          donor: null, 
          recipient: null, 
          volunteer: null, 
          preferences: null, 
          id_documents: null, 
          reports: null 
        })
        .in('id', allProfiles.map(p => p.id));
      console.log('✅ Cleared user_profiles JSONB fields');
    }
    
    await supabase.from('user_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted user_profiles');
    
    await supabase.from('volunteer_time_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted volunteer_time_tracking');
    
    console.log('✅ Cleanup completed!\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Ensure users have display-friendly fields (avoid "Unknown"/"N/A" in UI)
async function normalizeUsers() {
  console.log('🧩 Normalizing user display fields (name, email, address)...');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, role, name, email, address, city')
      .limit(1000);
    if (error) throw error;

    if (!users || users.length === 0) {
      console.log('⚠️  No users found to normalize.');
      return;
    }

    const updates = [];
    for (const u of users) {
      const needsName = !u.name || !String(u.name).trim() || String(u.name).toLowerCase().includes('unknown');
      const needsEmail = !u.email || !String(u.email).includes('@');
      const needsAddress = !u.address || !String(u.address).trim() || String(u.address).toLowerCase() === 'n/a';
      const needsCity = !u.city || !String(u.city).trim() || String(u.city).toLowerCase() === 'n/a';

      if (needsName || needsEmail || needsAddress || needsCity) {
        const rolePrefix =
          u.role === 'donor' ? 'Donor' :
          u.role === 'recipient' ? 'Recipient' :
          u.role === 'volunteer' ? 'Volunteer' :
          'User';
        const shortId = String(u.id).split('-')[0];
        updates.push({
          id: u.id,
          name: needsName ? `${rolePrefix} ${shortId}` : u.name,
          email: needsEmail ? `${rolePrefix.toLowerCase()}_${shortId}@example.com` : u.email,
          address: needsAddress ? `${rolePrefix} Address` : u.address,
          city: needsCity ? 'Metro City' : u.city,
          updated_at: new Date().toISOString()
        });
      }
    }

    // Batch update in chunks
    const chunkSize = 200;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      if (chunk.length > 0) {
        const { error: updErr } = await supabase.from('users').upsert(chunk);
        if (updErr) console.error('⚠️  Error normalizing users chunk:', updErr.message);
      }
    }
    console.log(`✅ Normalized ${updates.length} users`);
  } catch (e) {
    console.error('❌ Error normalizing users:', e);
  }
}

// Seed sample user reports into user_profiles.reports JSONB using real users
async function seedSampleReports(allUsers) {
  console.log('🌱 Seeding sample user reports (JSONB)...');
  try {
    if (!allUsers || allUsers.length < 2) {
      console.log('⚠️  Not enough users to seed reports.');
      return [];
    }

    const usedPairs = new Set();
    const reasons = ['inappropriate_behavior', 'spam', 'fraud', 'harassment', 'other'];
    const reportsPerBatch = Math.min(5, Math.floor(allUsers.length / 2));
    const created = [];

    // Helper to upsert a report into a user's profile.reports JSONB
    const upsertReport = async (reportedId, reportObj) => {
      // Ensure a user_profiles row exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id, reports')
        .eq('user_id', reportedId)
        .maybeSingle();

      if (!existingProfile) {
        const { data: newProfile, error: insErr } = await supabase
          .from('user_profiles')
          .insert({ user_id: reportedId, reports: [reportObj] })
          .select('user_id')
          .single();
        if (insErr) {
          console.error('⚠️  Error creating user profile for reports:', insErr.message);
          return null;
        }
        return newProfile;
      } else {
        const nextReports = Array.isArray(existingProfile.reports) ? [...existingProfile.reports, reportObj] : [reportObj];
        const { error: updErr } = await supabase
          .from('user_profiles')
          .update({ reports: nextReports })
          .eq('user_id', reportedId);
        if (updErr) {
          console.error('⚠️  Error appending report:', updErr.message);
          return null;
        }
        return existingProfile;
      }
    };

    // Pick random pairs
    for (let i = 0; i < reportsPerBatch; i++) {
      const reporter = allUsers[Math.floor(Math.random() * allUsers.length)];
      let reported = allUsers[Math.floor(Math.random() * allUsers.length)];
      let attempts = 0;
      while (reported.id === reporter.id && attempts < 10) {
        reported = allUsers[Math.floor(Math.random() * allUsers.length)];
        attempts++;
      }
      const pairKey = `${reporter.id}->${reported.id}`;
      if (reported.id === reporter.id || usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const report = {
        id: randomUUID(),
        reported_user_id: reported.id,
        reported_by_user_id: reporter.id,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        description: 'Auto-seeded report for moderation testing.',
        status: 'pending',
        created_at: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
      };

      const res = await upsertReport(reported.id, report);
      if (res) created.push(report);
    }

    console.log(`✅ Seeded ${created.length} user reports`);
    return created;
  } catch (e) {
    console.error('❌ Error seeding sample reports:', e);
    return [];
  }
}

async function getUsersByRole(role) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark')
    .eq('role', role)
    .not('name', 'is', null)
    .limit(50);
  
  if (error) throw error;
  return data || [];
}

// Helper function to format address from user profile
function formatAddress(user) {
  if (!user) return null;
  const locationParts = [];
  
  // Priority 1: House/Unit + Street
  if (user.address_house || user.address_street) {
    const houseStreet = [user.address_house, user.address_street]
      .filter(v => v && v.trim() && v.toLowerCase() !== 'n/a' && v.toLowerCase() !== 'tbd')
      .join(' ')
      .trim();
    if (houseStreet) {
      locationParts.push(houseStreet);
    }
  }
  
  // Priority 2: Barangay
  if (user.address_barangay && user.address_barangay.trim() && user.address_barangay.toLowerCase() !== 'n/a') {
    locationParts.push(user.address_barangay.trim());
  }
  
  // Priority 3: Subdivision
  if (user.address_subdivision && user.address_subdivision.trim() && user.address_subdivision.toLowerCase() !== 'n/a') {
    locationParts.push(user.address_subdivision.trim());
  }
  
  // Priority 4: Landmark (if no street address)
  if (user.address_landmark && !user.address_street && user.address_landmark.trim() && user.address_landmark.toLowerCase() !== 'n/a') {
    locationParts.push(`Near ${user.address_landmark.trim()}`);
  }
  
  // Priority 5: Full address (if no specific parts)
  if (user.address && !locationParts.length && user.address.trim() && user.address.toLowerCase() !== 'n/a' && !user.address.toLowerCase().includes('to be completed')) {
    locationParts.push(user.address.trim());
  }
  
  // Priority 6: City
  if (user.city && user.city.trim()) {
    locationParts.push(user.city.trim());
  }
  
  // Priority 7: Province
  if (user.province && user.province.trim()) {
    locationParts.push(user.province.trim());
  }
  
  return locationParts.length > 0 ? locationParts.join(', ') : null;
}

async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, email')
    .limit(100);
  
  if (error) throw error;
  return data || [];
}

function shuffleArray(array) {
  if (!Array.isArray(array)) return [];
  const cloned = [...array];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function logStatusBreakdown(label, items, field = 'status') {
  if (!Array.isArray(items) || items.length === 0) return;
  const counts = items.reduce((acc, item) => {
    const key = item?.[field] || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const breakdown = Object.entries(counts)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
  console.log(`    • ${label}: ${breakdown}`);
}

async function diversifyDonationStatuses(donations, claims, deliveries, directDeliveries) {
  if (!Array.isArray(donations) || donations.length === 0) return donations;

  const claimById = new Map();
  const claimsByDonation = new Map();

  (claims || []).forEach((claim) => {
    claimById.set(claim.id, claim);
    if (!claimsByDonation.has(claim.donation_id)) {
      claimsByDonation.set(claim.donation_id, []);
    }
    claimsByDonation.get(claim.donation_id).push(claim);
  });

  const statusUpdates = new Map();

  const setStatusIfUnset = (donationId, status) => {
    if (!donationId || !status) return;
    if (!statusUpdates.has(donationId)) {
      statusUpdates.set(donationId, status);
    }
  };

  const applyDeliveryStatus = (delivery, fallbackStatus = 'matched') => {
    if (!delivery?.claim_id) return;
    const claim = claimById.get(delivery.claim_id);
    if (!claim?.donation_id) return;
    const donationId = claim.donation_id;
    switch (delivery.status) {
      case 'delivered':
        setStatusIfUnset(donationId, fallbackStatus === 'completed' ? 'completed' : 'delivered');
        break;
      case 'in_transit':
      case 'picked_up':
        setStatusIfUnset(donationId, 'in_transit');
        break;
      case 'accepted':
      case 'assigned':
      case 'pending':
        setStatusIfUnset(donationId, 'matched');
        break;
      default:
        break;
    }
  };

  (deliveries || []).forEach((delivery) => applyDeliveryStatus(delivery));
  (directDeliveries || []).forEach((delivery) => applyDeliveryStatus(delivery, 'completed'));

  // Track which claims have deliveries
  const claimsWithDeliveries = new Set();
  (deliveries || []).forEach((delivery) => {
    if (delivery.claim_id) {
      claimsWithDeliveries.add(delivery.claim_id);
    }
  });

  // For donations with claims:
  // - Volunteer donations WITHOUT deliveries should stay 'available' (for available-tasks page)
  // - Volunteer donations WITH deliveries should be 'matched' or 'in_transit' (already set by applyDeliveryStatus)
  // - Non-volunteer donations with claims should be 'claimed'
  claimsByDonation.forEach((_claims, donationId) => {
    const donation = donations.find(d => d.id === donationId);
    if (!donation) return;
    
    // Check if any claim for this donation has a delivery
    const hasDelivery = _claims.some(claim => claimsWithDeliveries.has(claim.id));
    
    // If it's a volunteer donation with claims but no delivery, keep it as 'available' for available-tasks page
    if (donation.delivery_mode === 'volunteer' && !hasDelivery && !statusUpdates.has(donationId)) {
      // Keep as 'available' - don't set status
      return;
    }
    
    // For other donations with claims, set to 'claimed' if not already set
    if (!statusUpdates.has(donationId)) {
      setStatusIfUnset(donationId, 'claimed');
    }
  });

  // Promote one delivered donation to completed if not already present
  const hasCompleted = Array.from(statusUpdates.values()).some((status) => status === 'completed');
  if (!hasCompleted) {
    const deliveredDonationId = Array.from(statusUpdates.entries()).find(
      ([, status]) => status === 'delivered'
    )?.[0];
    if (deliveredDonationId) {
      statusUpdates.set(deliveredDonationId, 'completed');
    }
  }

  const hasMatched = Array.from(statusUpdates.values()).some((status) => status === 'matched');
  if (!hasMatched) {
    const claimedDonationId = Array.from(statusUpdates.entries()).find(
      ([, status]) => status === 'claimed'
    )?.[0];
    if (claimedDonationId) {
      statusUpdates.set(claimedDonationId, 'matched');
    }
  }

  const hasDelivered = Array.from(statusUpdates.values()).some((status) => status === 'delivered');
  if (!hasDelivered) {
    const deliverableDonation = Array.from(statusUpdates.entries()).find(([, status]) =>
      ['in_transit', 'matched', 'claimed'].includes(status)
    );
    if (deliverableDonation) {
      statusUpdates.set(deliverableDonation[0], 'delivered');
    } else if (donations.length > 0) {
      statusUpdates.set(donations[0].id, 'delivered');
    }
  }

  // Assign statuses to donations without claims
  // IMPORTANT: Keep at least 40% of donations as 'available' for matching algorithm
  // This ensures browse-requests page can find matching donations
  const donationsWithoutClaims = donations.filter((donation) => !statusUpdates.has(donation.id));
  
  // Separate CFC-GK volunteer donations - these MUST stay as 'available' for available-tasks page
  const cfcgkVolunteerDonations = donationsWithoutClaims.filter(d => 
    d.donation_destination === 'organization' && d.delivery_mode === 'volunteer'
  );
  const otherDonationsWithoutClaims = donationsWithoutClaims.filter(d => 
    !(d.donation_destination === 'organization' && d.delivery_mode === 'volunteer')
  );
  
  // CFC-GK volunteer donations MUST stay as 'available' - don't change their status
  // They need to appear on the available-tasks page
  
  // For other donations without claims, distribute statuses
  const totalWithoutClaims = otherDonationsWithoutClaims.length;
  const availableCount = Math.max(1, Math.floor(totalWithoutClaims * 0.6)); // 60% available for matching
  const cancelledCount = Math.max(0, Math.floor(totalWithoutClaims * 0.2));
  const expiredCount = Math.max(0, Math.floor(totalWithoutClaims * 0.2));
  
  otherDonationsWithoutClaims.forEach((donation, index) => {
    let status;
    if (index < availableCount) {
      status = 'available';
    } else if (index < availableCount + cancelledCount) {
      status = 'cancelled';
    } else if (index < availableCount + cancelledCount + expiredCount) {
      status = 'expired';
    } else {
      status = 'available'; // Default to available for remaining
    }
    if (status !== donation.status) {
      statusUpdates.set(donation.id, status);
    }
  });

  for (const [donationId, status] of statusUpdates.entries()) {
    await supabase
      .from('donations')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', donationId);
  }

  const { data: refreshedDonations } = await supabase
    .from('donations')
    .select('id, status, delivery_mode')
    .in('id', donations.map((donation) => donation.id));

  if (refreshedDonations) {
    const refreshedMap = new Map(refreshedDonations.map((item) => [item.id, item]));
    donations.forEach((donation) => {
      const update = refreshedMap.get(donation.id);
      if (update) {
        donation.status = update.status;
        if (update.delivery_mode) {
          donation.delivery_mode = update.delivery_mode;
        }
      }
    });
  }

  return donations;
}

async function diversifyRequestStatuses(requests) {
  if (!Array.isArray(requests) || requests.length === 0) return requests;

  const shuffled = shuffleArray(requests);
  const updates = [];

  const total = requests.length;
  // IMPORTANT: Keep at least 50% of requests as 'open' for matching algorithm
  // This ensures browse-requests page has requests to match with donations
  const maxNonOpenCount = Math.floor(total * 0.5);
  const fulfilledCount = Math.max(1, Math.min(Math.floor(total * 0.3), maxNonOpenCount - 2));
  const cancelledCount = Math.max(1, Math.min(Math.floor(total * 0.15), maxNonOpenCount - fulfilledCount - 1));
  const expiredCount = Math.max(1, Math.min(Math.floor(total * 0.1), maxNonOpenCount - fulfilledCount - cancelledCount));

  let index = 0;
  const assignStatus = (count, status) => {
    for (let i = 0; i < count && index < shuffled.length; i++, index++) {
      const request = shuffled[index];
      updates.push({ id: request.id, status });
      request.status = status;
    }
  };

  assignStatus(fulfilledCount, 'fulfilled');
  assignStatus(cancelledCount, 'cancelled');
  assignStatus(expiredCount, 'expired');

  // Remaining requests stay 'open' for matching algorithm

  for (const update of updates) {
    await supabase
      .from('donation_requests')
      .update({
        status: update.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id);
  }

  return requests;
}

async function diversifyEventStatuses(events) {
  if (!Array.isArray(events) || events.length === 0) return events;
  
  const now = new Date();
  const offsetsDays = [-26, -20, -14, -9, -4, -1, 4, 11, 16, 22];
  const durationsHours = [6, 8, 5, 7, 4, 6, 8, 5, 7, 6];
  const shuffled = shuffleArray(events);
  const updates = [];
  let hasCancelled = false;
  let hasCompleted = false;
  let hasActive = false;
  let hasUpcoming = false;

  shuffled.forEach((event, index) => {
    const offsetDays = offsetsDays[index % offsetsDays.length];
    const durationHours = durationsHours[index % durationsHours.length];
    const start = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    let status;
    if (offsetDays <= -10) {
      status = 'completed';
      hasCompleted = true;
    } else if (offsetDays < 0) {
      status = 'active';
      hasActive = true;
    } else if (offsetDays <= 10) {
      status = 'upcoming';
      hasUpcoming = true;
    } else {
      status = 'upcoming';
    }

    const createdOffsetDays = Math.max(3, Math.min(14, Math.abs(offsetDays)));
    let created = new Date(start.getTime() - createdOffsetDays * 24 * 60 * 60 * 1000);
    if (created > now) {
      created = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    }

    updates.push({
      id: event.id,
      status,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      created_at: created.toISOString()
    });

    event.status = status;
    event.start_date = start.toISOString();
    event.end_date = end.toISOString();
    event.created_at = created.toISOString();
  });

  if (!hasCancelled && updates.length > 0) {
    const candidate = updates.find(update => new Date(update.start_date) > now);
    if (candidate) {
      candidate.status = 'cancelled';
      hasCancelled = true;
    } else {
      updates[updates.length - 1].status = 'cancelled';
      hasCancelled = true;
    }
  }

  if (!hasActive && updates.length > 1) {
    updates[1].status = 'active';
  }
  if (!hasCompleted && updates.length > 2) {
    updates[2].status = 'completed';
  }
  if (!hasUpcoming && updates.length > 3) {
    updates[3].status = 'upcoming';
  }

  for (const update of updates) {
    await supabase
      .from('events')
      .update({
        status: update.status,
        start_date: update.start_date,
        end_date: update.end_date,
        created_at: update.created_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.id);
  }

  console.log('   Event timeline adjustments (for dashboard visualizations):');
  updates.forEach(update => {
    console.log(`     • ${update.status.toUpperCase()} from ${new Date(update.start_date).toLocaleDateString()} to ${new Date(update.end_date).toLocaleDateString()}`);
  });

  return events;
}

// Donation templates with matching images
// Categories must match: 'Food & Beverages', 'Clothing & Accessories', 'Medical Supplies', 
// 'Educational Materials', 'Household Items', 'Electronics & Technology', 'Toys & Recreation',
// 'Personal Care Items', 'Emergency Supplies', 'Other'
// Conditions must match: 'new', 'like_new', 'good', 'fair'
const donationTemplates = [
  {
    title: 'Rice and Canned Goods',
    description: 'Assorted rice bags and canned goods. All items are unopened and within expiration date.',
    category: 'Food & Beverages',
    condition: 'good',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'
  },
  {
    title: 'Children\'s Clothing Set',
    description: 'Gently used children\'s clothing in various sizes. All items are clean and in good condition.',
    category: 'Clothing & Accessories',
    condition: 'like_new',
    quantity: 12,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'
  },
  {
    title: 'Kitchen Utensils',
    description: 'Various kitchen utensils including pots, pans, and cooking tools.',
    category: 'Household Items',
    condition: 'good',
    quantity: 8,
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800'
  },
  {
    title: 'Educational Books',
    description: 'Collection of educational books for children and adults. Includes textbooks and storybooks.',
    category: 'Educational Materials',
    condition: 'good',
    quantity: 15,
    image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=800'
  },
  {
    title: 'Baby Formula and Diapers',
    description: 'Unopened baby formula and diapers in various sizes.',
    category: 'Personal Care Items',
    condition: 'new',
    quantity: 3,
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800'
  },
  {
    title: 'School Supplies Pack',
    description: 'Complete set of school supplies including notebooks, pens, pencils, and art materials.',
    category: 'Educational Materials',
    condition: 'new',
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1503676260728-1c00e094b736?w=800'
  },
  {
    title: 'Winter Clothing',
    description: 'Warm winter clothing including jackets, sweaters, and blankets.',
    category: 'Clothing & Accessories',
    condition: 'good',
    quantity: 7,
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'
  },
  {
    title: 'Medical Supplies',
    description: 'Basic medical supplies including bandages, antiseptics, and first aid items.',
    category: 'Medical Supplies',
    condition: 'new',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800'
  },
  {
    title: 'Furniture Set',
    description: 'Used furniture including chairs and small tables. Pickup required.',
    category: 'Household Items',
    condition: 'fair',
    quantity: 4,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'
  },
  {
    title: 'Children\'s Toys',
    description: 'Assorted toys for children. All items are clean and in working condition.',
    category: 'Toys & Recreation',
    condition: 'good',
    quantity: 20,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
  },
  {
    title: 'Fresh Vegetables',
    description: 'Fresh vegetables from local farmers. Organic and pesticide-free.',
    category: 'Food & Beverages',
    condition: 'good',
    quantity: 15,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'
  },
  {
    title: 'Laptop Computer',
    description: 'Used laptop in good working condition. Perfect for students.',
    category: 'Electronics & Technology',
    condition: 'like_new',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800'
  },
  {
    title: 'Bicycle',
    description: 'Used bicycle in good condition. Great for transportation.',
    category: 'Other',
    condition: 'good',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
  },
  {
    title: 'Bedding Set',
    description: 'Complete bedding set including sheets, pillows, and blankets.',
    category: 'Household Items',
    condition: 'like_new',
    quantity: 3,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
  },
  {
    title: 'Cooking Equipment',
    description: 'Various cooking equipment including rice cooker, blender, and other kitchen appliances.',
    category: 'Household Items',
    condition: 'good',
    quantity: 6,
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800'
  },
  {
    title: 'Emergency Food Kit',
    description: 'Emergency food kit with non-perishable items for disaster preparedness.',
    category: 'Emergency Supplies',
    condition: 'new',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800'
  },
  {
    title: 'First Aid Kit',
    description: 'Comprehensive first aid kit with medical supplies for emergencies.',
    category: 'Emergency Supplies',
    condition: 'new',
    quantity: 3,
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800'
  },
  {
    title: 'Hygiene Products',
    description: 'Personal hygiene products including soap, shampoo, and toiletries.',
    category: 'Personal Care Items',
    condition: 'new',
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800'
  }
];

// Request templates with matching images
// IMPORTANT: Categories must match donation categories for matching algorithm to work
// Donation categories: 'Food & Beverages', 'Clothing & Accessories', 'Medical Supplies', 
// 'Educational Materials', 'Household Items', 'Electronics & Technology', 'Toys & Recreation',
// 'Personal Care Items', 'Emergency Supplies', 'Other'
const requestTemplates = [
  {
    title: 'Urgent Need: Food Supplies',
    description: 'Our family is in urgent need of food supplies. Any help would be greatly appreciated.',
    category: 'Food & Beverages', // Matches donation category
    urgency: 'high',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
  },
  {
    title: 'School Supplies for Children',
    description: 'Need school supplies for my three children who are starting school next month.',
    category: 'Educational Materials', // Matches donation category
    urgency: 'medium',
    quantity: 3,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'
  },
  {
    title: 'Baby Items Needed',
    description: 'Expecting a baby soon and need essential baby items.',
    category: 'Personal Care Items', // Matches donation category
    urgency: 'high',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800'
  },
  {
    title: 'Clothing for Family',
    description: 'Looking for clothing donations for a family of five.',
    category: 'Clothing & Accessories', // Matches donation category
    urgency: 'medium',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800'
  },
  {
    title: 'Medical Supplies Request',
    description: 'Need basic medical supplies for elderly family member.',
    category: 'Medical Supplies', // Matches donation category
    urgency: 'critical',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800'
  },
  {
    title: 'Books for Learning',
    description: 'Seeking educational books for children\'s learning.',
    category: 'Educational Materials', // Matches donation category
    urgency: 'low',
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  },
  {
    title: 'Household Items',
    description: 'Starting a new home and need basic household items.',
    category: 'Household Items', // Matches donation category
    urgency: 'medium',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
  },
  {
    title: 'Furniture Needed',
    description: 'Need furniture for our new home. Any furniture in good condition would help.',
    category: 'Household Items', // Matches donation category (furniture is household)
    urgency: 'low',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'
  },
  {
    title: 'Emergency Food Assistance',
    description: 'Lost job recently and need immediate food assistance for my family.',
    category: 'Food & Beverages', // Matches donation category
    urgency: 'critical',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'
  },
  {
    title: 'Children\'s Toys Request',
    description: 'Looking for toys for my children\'s birthday celebration.',
    category: 'Toys & Recreation', // Matches donation category
    urgency: 'low',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800'
  }
];

// Event templates with matching images
const eventTemplates = [
  {
    name: 'Community Food Distribution Drive',
    description: 'Join us for a community-wide food distribution event to help families in need. We will be distributing rice, canned goods, and fresh produce to registered recipients.',
    event_type: 'Food Distribution',
    location: 'Barangay Hall, Corrales Avenue, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'high',
    max_participants: 50,
    start_time: '08:00',
    end_time: '16:00',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    donation_items: [
      { name: 'Rice (5kg bags)', category: 'Food & Beverages', quantity: 100, description: '5kg bags of rice' },
      { name: 'Canned Goods', category: 'Food & Beverages', quantity: 200, description: 'Assorted canned goods' },
      { name: 'Fresh Vegetables', category: 'Food & Beverages', quantity: 50, description: 'Fresh vegetables from local farmers' },
      { name: 'Cooking Oil', category: 'Food & Beverages', quantity: 50, description: '1L bottles of cooking oil' }
    ],
    schedule: [
      { time: '08:00', activity: 'Registration and Setup' },
      { time: '09:00', activity: 'Opening Ceremony' },
      { time: '09:30', activity: 'Food Distribution Begins' },
      { time: '12:00', activity: 'Lunch Break' },
      { time: '13:00', activity: 'Distribution Continues' },
      { time: '16:00', activity: 'Closing and Cleanup' }
    ],
    requirements: ['Valid ID required', 'Registration required', 'Bring reusable bags'],
    what_to_bring: ['Valid ID', 'Reusable bags', 'Water bottle'],
    contact_info: {
      coordinator: 'Maria Santos',
      phone: '+63 912 345 6789',
      email: 'maria.santos@hopelink.org'
    }
  },
  {
    name: 'School Supplies Donation Drive',
    description: 'Help equip students with essential school supplies. We are collecting notebooks, pens, pencils, bags, and other educational materials for underprivileged students.',
    event_type: 'Educational Program',
    location: 'Xavier University - Ateneo de Cagayan, Corrales Avenue, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'medium',
    max_participants: 30,
    start_time: '09:00',
    end_time: '17:00',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop',
    donation_items: [
      { name: 'Notebooks', category: 'Educational Materials', quantity: 200, description: 'Spiral notebooks, 80 pages' },
      { name: 'Pens and Pencils', category: 'Educational Materials', quantity: 500, description: 'Ballpoint pens and #2 pencils' },
      { name: 'School Bags', category: 'Educational Materials', quantity: 100, description: 'Backpacks for students' },
      { name: 'Art Supplies', category: 'Educational Materials', quantity: 50, description: 'Crayons, markers, and coloring books' }
    ],
    schedule: [
      { time: '09:00', activity: 'Donation Drop-off Opens' },
      { time: '10:00', activity: 'Sorting and Organization' },
      { time: '14:00', activity: 'Packaging Supplies' },
      { time: '16:00', activity: 'Distribution to Schools' }
    ],
    requirements: ['New or gently used items only', 'Items must be in good condition'],
    what_to_bring: ['School supplies to donate', 'Receipt (for tax purposes)'],
    contact_info: {
      coordinator: 'John Dela Cruz',
      phone: '+63 923 456 7890',
      email: 'john.delacruz@hopelink.org'
    }
  },
  {
    name: 'Medical Mission: Free Health Check-up',
    description: 'Free medical check-up and basic health services for the community. Doctors and nurses will provide consultations, blood pressure checks, and basic medications.',
    event_type: 'Medical Mission',
    location: 'Cagayan de Oro City Health Office, Yacapin Street, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'critical',
    max_participants: 100,
    start_time: '07:00',
    end_time: '18:00',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
    donation_items: [
      { name: 'Blood Pressure Monitors', category: 'Medical Supplies', quantity: 10, description: 'Digital BP monitors' },
      { name: 'Basic Medications', category: 'Medical Supplies', quantity: 500, description: 'Paracetamol, vitamins, and basic medicines' },
      { name: 'Medical Supplies', category: 'Medical Supplies', quantity: 200, description: 'Bandages, gauze, antiseptics' },
      { name: 'Vitamins', category: 'Medical Supplies', quantity: 300, description: 'Multivitamins for children and adults' }
    ],
    schedule: [
      { time: '07:00', activity: 'Setup and Registration' },
      { time: '08:00', activity: 'Medical Consultations Begin' },
      { time: '12:00', activity: 'Lunch Break' },
      { time: '13:00', activity: 'Consultations Resume' },
      { time: '17:00', activity: 'Closing and Documentation' }
    ],
    requirements: ['Valid ID required', 'Medical records if available', 'Registration required'],
    what_to_bring: ['Valid ID', 'Medical records', 'List of current medications'],
    contact_info: {
      coordinator: 'Dr. Anna Garcia',
      phone: '+63 934 567 8901',
      email: 'anna.garcia@hopelink.org'
    }
  },
  {
    name: 'Clothing Drive for Families',
    description: 'Collecting gently used clothing for families in need. All sizes welcome - children, adults, and seniors. Items will be sorted and distributed to registered recipients.',
    event_type: 'Clothing Drive',
    location: 'SM City Cagayan de Oro, J.C. Aquino Avenue, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'medium',
    max_participants: 40,
    start_time: '10:00',
    end_time: '18:00',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    donation_items: [
      { name: 'Children\'s Clothing', category: 'Clothing & Accessories', quantity: 300, description: 'Clothing for ages 0-12' },
      { name: 'Adult Clothing', category: 'Clothing & Accessories', quantity: 200, description: 'Clothing for adults' },
      { name: 'Shoes', category: 'Clothing & Accessories', quantity: 150, description: 'All sizes' },
      { name: 'Winter Clothing', category: 'Clothing & Accessories', quantity: 100, description: 'Jackets, sweaters, and blankets' }
    ],
    schedule: [
      { time: '10:00', activity: 'Donation Collection Opens' },
      { time: '11:00', activity: 'Sorting by Size and Type' },
      { time: '14:00', activity: 'Quality Check and Cleaning' },
      { time: '15:00', activity: 'Distribution Begins' }
    ],
    requirements: ['Clean and gently used items only', 'No torn or damaged clothing', 'Items must be washed'],
    what_to_bring: ['Clothing items to donate', 'Bags for sorting'],
    contact_info: {
      coordinator: 'Sarah Martinez',
      phone: '+63 945 678 9012',
      email: 'sarah.martinez@hopelink.org'
    }
  },
  {
    name: 'Community Cleanup Day',
    description: 'Join us for a community cleanup initiative. We will be cleaning up public spaces, planting trees, and promoting environmental awareness.',
    event_type: 'Community Cleanup',
    location: 'Carmen Public Market, Carmen, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'low',
    max_participants: 60,
    start_time: '06:00',
    end_time: '16:00',
    image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800',
    donation_items: [
      { name: 'Garbage Bags', category: 'Emergency Supplies', quantity: 200, description: 'Heavy-duty garbage bags' },
      { name: 'Gloves', category: 'Emergency Supplies', quantity: 100, description: 'Work gloves' },
      { name: 'Tree Saplings', category: 'Other', quantity: 50, description: 'Native tree saplings' },
      { name: 'Cleaning Supplies', category: 'Household Items', quantity: 50, description: 'Brooms, rakes, and cleaning tools' }
    ],
    schedule: [
      { time: '06:00', activity: 'Registration and Briefing' },
      { time: '06:30', activity: 'Cleanup Activities Begin' },
      { time: '10:00', activity: 'Tree Planting' },
      { time: '12:00', activity: 'Lunch and Rest' },
      { time: '13:00', activity: 'Final Cleanup' },
      { time: '15:00', activity: 'Closing Ceremony' }
    ],
    requirements: ['Wear comfortable clothes', 'Bring water bottle', 'Minors must be accompanied by adults'],
    what_to_bring: ['Water bottle', 'Hat and sunscreen', 'Comfortable shoes'],
    contact_info: {
      coordinator: 'Michael Torres',
      phone: '+63 956 789 0123',
      email: 'michael.torres@hopelink.org'
    }
  },
  {
    name: 'Emergency Relief Distribution',
    description: 'Emergency relief distribution for families affected by recent calamities. Providing essential supplies including food, water, and basic necessities.',
    event_type: 'Emergency Relief',
    location: 'Barangay Lapasan Evacuation Center, Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'critical',
    max_participants: 80,
    start_time: '08:00',
    end_time: '19:00',
    image: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800',
    donation_items: [
      { name: 'Emergency Food Packs', category: 'Food & Beverages', quantity: 150, description: 'Ready-to-eat meals and canned goods' },
      { name: 'Bottled Water', category: 'Food & Beverages', quantity: 300, description: '1.5L bottles of water' },
      { name: 'Hygiene Kits', category: 'Personal Care Items', quantity: 200, description: 'Soap, shampoo, toothbrush, toothpaste' },
      { name: 'Blankets', category: 'Household Items', quantity: 100, description: 'Emergency blankets' },
      { name: 'Flashlights', category: 'Emergency Supplies', quantity: 150, description: 'LED flashlights with batteries' }
    ],
    schedule: [
      { time: '08:00', activity: 'Setup and Registration' },
      { time: '09:00', activity: 'Distribution Begins' },
      { time: '12:00', activity: 'Break' },
      { time: '13:00', activity: 'Distribution Continues' },
      { time: '17:00', activity: 'Closing' }
    ],
    requirements: ['Valid ID or proof of residence', 'Priority for affected families'],
    what_to_bring: ['Valid ID', 'Proof of residence', 'Reusable bags'],
    contact_info: {
      coordinator: 'Emergency Response Team',
      phone: '+63 967 890 1234',
      email: 'emergency@hopelink.org'
    }
  },
  {
    name: 'Volunteer Training Workshop',
    description: 'Comprehensive training workshop for new volunteers. Learn about HopeLink\'s mission, volunteer responsibilities, and best practices for community service.',
    event_type: 'Volunteer Training',
    location: 'Liceo de Cagayan University, Rodolfo N. Pelaez Boulevard, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'medium',
    max_participants: 25,
    start_time: '09:00',
    end_time: '17:00',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    donation_items: [
      { name: 'Training Materials', category: 'Educational Materials', quantity: 30, description: 'Handbooks and guides' },
      { name: 'Certificates', category: 'Other', quantity: 30, description: 'Volunteer certificates' }
    ],
    schedule: [
      { time: '09:00', activity: 'Registration and Welcome' },
      { time: '09:30', activity: 'Introduction to HopeLink' },
      { time: '10:30', activity: 'Break' },
      { time: '11:00', activity: 'Volunteer Roles and Responsibilities' },
      { time: '12:00', activity: 'Lunch' },
      { time: '13:00', activity: 'Hands-on Training' },
      { time: '15:00', activity: 'Q&A Session' },
      { time: '16:00', activity: 'Certificate Distribution' }
    ],
    requirements: ['Pre-registration required', 'Must be 18 years or older', 'Background check consent'],
    what_to_bring: ['Valid ID', 'Notebook and pen', 'Water bottle'],
    contact_info: {
      coordinator: 'Training Department',
      phone: '+63 978 901 2345',
      email: 'training@hopelink.org'
    }
  },
  {
    name: 'Awareness Campaign: Mental Health Support',
    description: 'Raising awareness about mental health and providing resources for those in need. Free counseling sessions and information about available support services.',
    event_type: 'Awareness Campaign',
    location: 'Centrio Mall, Corrales Avenue, Cagayan de Oro City, Misamis Oriental, Philippines',
    priority: 'high',
    max_participants: 50,
    start_time: '10:00',
    end_time: '20:00',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    donation_items: [
      { name: 'Information Materials', category: 'Educational Materials', quantity: 500, description: 'Brochures and flyers' },
      { name: 'Counseling Sessions', category: 'Other', quantity: 30, description: 'Free counseling slots' }
    ],
    schedule: [
      { time: '10:00', activity: 'Booth Setup' },
      { time: '11:00', activity: 'Campaign Launch' },
      { time: '12:00', activity: 'Information Distribution' },
      { time: '14:00', activity: 'Counseling Sessions' },
      { time: '17:00', activity: 'Closing' }
    ],
    requirements: ['Open to all', 'Confidentiality maintained'],
    what_to_bring: ['Open mind', 'Questions and concerns'],
    contact_info: {
      coordinator: 'Mental Health Team',
      phone: '+63 989 012 3456',
      email: 'mentalhealth@hopelink.org'
    }
  }
];

async function seedDonations() {
  console.log('🌱 Seeding donations with matching images...\n');
  
  try {
    let donors = await getUsersByRole('donor');
    // Prefer specified donor first if present
    const preferredDonor = donors.find(u => u.email && u.email.toLowerCase() === PREFERRED.donorEmail.toLowerCase());
    if (preferredDonor) {
      donors = [preferredDonor, ...donors.filter(d => d.id !== preferredDonor.id)];
    }
    
    if (donors.length === 0) {
      console.log('⚠️  No donors found.');
      return;
    }
    
    const donationsToInsert = [];
    const usedDonationIds = new Set();
    
    // Create donations from all templates (18 templates available)
    // IMPORTANT: Ensure we have enough volunteer-mode donations for available tasks
    // Distribute delivery modes: 40% volunteer, 30% direct, 30% pickup
    const numDonations = donationTemplates.length;
    const deliveryModeDistribution = ['volunteer', 'volunteer', 'volunteer', 'volunteer', 'direct', 'direct', 'direct', 'pickup', 'pickup', 'pickup']; // 40% volunteer, 30% direct, 30% pickup
    
    // Prioritize preferred donor: give them 60% of donations to ensure they have enough for notifications
    const preferredDonorIndex = preferredDonor ? 0 : -1;
    const donationsForPreferredDonor = preferredDonor ? Math.floor(numDonations * 0.6) : 0;
    
    // Track delivery modes for preferred donor to ensure they get volunteer-mode donations
    let preferredDonorVolunteerCount = 0;
    const preferredDonorVolunteerTarget = preferredDonor ? Math.floor(donationsForPreferredDonor * 0.5) : 0; // 50% volunteer mode
    
    for (let i = 0; i < numDonations; i++) {
      const template = donationTemplates[i];
      // Assign more donations to preferred donor for pending-requests page
      let donor;
      let deliveryMode;
      
      if (preferredDonor && i < donationsForPreferredDonor) {
        donor = preferredDonor;
        // Prioritize volunteer-mode donations for preferred donor to generate volunteer requests
        if (preferredDonorVolunteerCount < preferredDonorVolunteerTarget) {
          deliveryMode = 'volunteer';
          preferredDonorVolunteerCount++;
        } else {
          // Use distribution array for remaining donations
          deliveryMode = deliveryModeDistribution[i % deliveryModeDistribution.length];
        }
      } else {
        donor = donors[Math.floor(Math.random() * donors.length)];
        // Use distribution array to ensure more volunteer-mode donations (cycles through the distribution)
        deliveryMode = deliveryModeDistribution[i % deliveryModeDistribution.length];
      }
      
      // Generate unique ID
      let donationId;
      do {
        donationId = randomUUID();
      } while (usedDonationIds.has(donationId));
      usedDonationIds.add(donationId);
      
      // Use locations within Cagayan de Oro City and Opol only
      const localCities = ['Cagayan de Oro City', 'Opol'];
      const cdoBarangays = [
        'Barangay Carmen',
        'Barangay Lapasan',
        'Barangay Macasandig',
        'Barangay Nazareth',
        'Barangay Kauswagan',
        'Barangay Gusa',
        'Barangay Bulua',
        'Barangay Iponan',
        'Barangay Balulang',
        'Barangay Patag',
        'Barangay Cugman',
        'Barangay Tablon',
        'Barangay Agusan',
        'Barangay Bugo',
        'Barangay Puerto',
        'Barangay Puntod',
        'Barangay Consolacion',
        'Barangay Bonbon'
      ];
      const opolBarangays = [
        'Barangay Poblacion',
        'Barangay Igpit',
        'Barangay Taboc',
        'Barangay Limonda',
        'Barangay Napo',
        'Barangay Tingalan'
      ];
      const addressSuffixes = ['Street', 'Avenue', 'Road', 'Boulevard', 'Drive', 'Lane'];
      
      // Assign location based on donation index - alternate between CDO and Opol
      const cityIndex = i % localCities.length;
      const selectedCity = localCities[cityIndex];
      const barangays = selectedCity === 'Cagayan de Oro City' ? cdoBarangays : opolBarangays;
      const barangayIndex = i % barangays.length;
      const selectedBarangay = barangays[barangayIndex];
      const addressSuffix = addressSuffixes[i % addressSuffixes.length];
      const addressNumber = (i % 999) + 1;
      
      // Create pickup location within CDO or Opol
      const pickupLocation = `${addressNumber} ${selectedBarangay} ${addressSuffix}, ${selectedCity}, Misamis Oriental, Philippines`;
      
      // Format donor address properly for pickup location
      const donorAddress = pickupLocation;
      
      // Ensure donations have sufficient quantities for matching (at least 2x request quantities)
      // Request quantities are typically 1-10, so donations should have at least 2-20
      const baseQuantity = template.quantity + Math.floor(Math.random() * 3);
      const minQuantityForMatching = Math.max(baseQuantity, 5); // Ensure at least 5 for better matching
      
      const donation = {
        id: donationId,
        donor_id: donor.id,
        title: template.title,
        description: template.description,
        category: template.category,
        quantity: minQuantityForMatching,
        condition: template.condition,
        pickup_location: donorAddress,
        pickup_instructions: 'Please contact me before pickup. Available weekdays 9 AM - 5 PM.',
        status: 'available',
        delivery_mode: deliveryMode,
        donation_destination: 'recipients', // All regular donations go to recipients (direct delivery mode means donor delivers to recipient, not to CFC-GK)
        tags: [template.category.toLowerCase()],
        images: [template.image],
        is_urgent: Math.random() > 0.8,
        estimated_value: Math.floor(Math.random() * 5000) + 500,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      donationsToInsert.push(donation);
    }
    
    const { data, error } = await supabase
      .from('donations')
      .insert(donationsToInsert)
      .select();
    
    if (error) throw error;
    
    console.log(`✅ Created ${data.length} donations with matching images\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding donations:', error);
    throw error;
  }
}

async function seedCFCGKDirectDonations() {
  console.log('🌱 Seeding additional CFC-GK direct donations...\n');
  
  try {
    let donors = await getUsersByRole('donor');
    if (donors.length === 0) {
      console.log('⚠️  No donors found for CFC-GK donations.');
      return [];
    }
    
    // Select a few templates that are good for organization donations
    const cfcgkTemplates = [
      donationTemplates[0],  // Rice and Canned Goods
      donationTemplates[4],  // Baby Formula and Diapers
      donationTemplates[5],  // School Supplies Pack
      donationTemplates[7],  // Medical Supplies
      donationTemplates[14], // Emergency Food Kit
      donationTemplates[15], // First Aid Kit
      donationTemplates[16], // Hygiene Products
    ];
    
    const donationsToInsert = [];
    const usedDonationIds = new Set();
    
    // Create 3-5 additional direct donations to CFC-GK (reasonable number for admin page)
    const numCFCGKDonations = Math.min(5, Math.max(3, Math.floor(cfcgkTemplates.length * 0.6)));
    
    for (let i = 0; i < numCFCGKDonations; i++) {
      const template = cfcgkTemplates[i];
      const donor = donors[Math.floor(Math.random() * donors.length)];
      
      // Generate unique ID
      let donationId;
      do {
        donationId = randomUUID();
      } while (usedDonationIds.has(donationId));
      usedDonationIds.add(donationId);
      
      // Use locations within Cagayan de Oro City
      const cdoBarangays = [
        'Barangay Carmen',
        'Barangay Lapasan',
        'Barangay Macasandig',
        'Barangay Nazareth',
        'Barangay Kauswagan',
        'Barangay Gusa',
        'Barangay Bulua'
      ];
      const addressSuffixes = ['Street', 'Avenue', 'Road'];
      
      const barangayIndex = i % cdoBarangays.length;
      const selectedBarangay = cdoBarangays[barangayIndex];
      const addressSuffix = addressSuffixes[i % addressSuffixes.length];
      const addressNumber = (i % 999) + 1;
      
      // Create pickup location
      const pickupLocation = `${addressNumber} ${selectedBarangay} ${addressSuffix}, Cagayan de Oro City, Misamis Oriental, Philippines`;
      
      // Base quantity
      const baseQuantity = template.quantity + Math.floor(Math.random() * 5);
      const minQuantityForMatching = Math.max(baseQuantity, 5);
      
      // Create direct donation to CFC-GK
      // Prioritize volunteer delivery mode so they appear on available-tasks page
      // Distribution: 60% volunteer, 20% donor_delivery, 20% organization_pickup
      let deliveryMode;
      if (i % 5 < 3) {
        // First 3 out of 5 = volunteer mode (60%)
        deliveryMode = 'volunteer';
      } else if (i % 5 === 3) {
        // 4th = donor_delivery (20%)
        deliveryMode = 'donor_delivery';
      } else {
        // 5th = organization_pickup (20%)
        deliveryMode = 'organization_pickup';
      }
      
      const donation = {
        id: donationId,
        donor_id: donor.id,
        title: template.title,
        description: `${template.description} This donation is being sent directly to CFC-GK Mission Center for distribution to those in need.`,
        category: template.category,
        quantity: minQuantityForMatching,
        condition: template.condition,
        pickup_location: pickupLocation,
        pickup_instructions: 'Please contact CFC-GK Mission Center for pickup coordination. Available weekdays 9 AM - 5 PM.',
        status: 'available',
        delivery_mode: deliveryMode,
        donation_destination: 'organization', // Always organization for CFC-GK
        tags: [template.category.toLowerCase(), 'cfc-gk', 'direct-donation'],
        images: [template.image],
        is_urgent: Math.random() > 0.7, // 30% urgent
        estimated_value: Math.floor(Math.random() * 5000) + 500,
        created_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      donationsToInsert.push(donation);
    }
    
    const { data, error } = await supabase
      .from('donations')
      .insert(donationsToInsert)
      .select();
    
    if (error) throw error;
    
    // Count how many have volunteer delivery mode (for available-tasks page)
    const volunteerCount = data.filter(d => d.delivery_mode === 'volunteer').length;
    console.log(`✅ Created ${data.length} additional CFC-GK direct donations`);
    console.log(`   • ${volunteerCount} with volunteer delivery mode (will appear on available-tasks page)\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding CFC-GK direct donations:', error);
    throw error;
  }
}

async function seedRequests() {
  console.log('🌱 Seeding donation requests with matching images...\n');
  
  try {
    let recipients = await getUsersByRole('recipient');
    // Prefer specified recipient first if present
    const preferredRecipient = recipients.find(u => u.email && u.email.toLowerCase() === PREFERRED.recipientEmail.toLowerCase());
    if (preferredRecipient) {
      recipients = [preferredRecipient, ...recipients.filter(r => r.id !== preferredRecipient.id)];
    }
    
    if (recipients.length === 0) {
      console.log('⚠️  No recipients found.');
      return;
    }
    
    const requestsToInsert = [];
    const usedRequestIds = new Set();
    
    // Create 10 unique requests
    for (let i = 0; i < 10; i++) {
      const template = requestTemplates[i % requestTemplates.length];
      const recipient = recipients[Math.floor(Math.random() * recipients.length)];
      const deliveryModes = ['pickup', 'volunteer', 'direct'];
      const deliveryMode = deliveryModes[Math.floor(Math.random() * deliveryModes.length)];
      
      // Generate unique ID
      let requestId;
      do {
        requestId = randomUUID();
      } while (usedRequestIds.has(requestId));
      usedRequestIds.add(requestId);
      
      // Use locations within Cagayan de Oro City and Opol only
      const localCities = ['Cagayan de Oro City', 'Opol'];
      const cdoBarangays = [
        'Barangay Carmen',
        'Barangay Lapasan',
        'Barangay Macasandig',
        'Barangay Nazareth',
        'Barangay Kauswagan',
        'Barangay Gusa',
        'Barangay Bulua',
        'Barangay Iponan',
        'Barangay Balulang',
        'Barangay Patag',
        'Barangay Cugman',
        'Barangay Tablon',
        'Barangay Agusan',
        'Barangay Bugo',
        'Barangay Puerto',
        'Barangay Puntod',
        'Barangay Consolacion',
        'Barangay Bonbon'
      ];
      const opolBarangays = [
        'Barangay Poblacion',
        'Barangay Igpit',
        'Barangay Taboc',
        'Barangay Limonda',
        'Barangay Napo',
        'Barangay Tingalan'
      ];
      const addressSuffixes = ['Street', 'Avenue', 'Road', 'Boulevard', 'Drive'];
      
      // Assign location based on request index - alternate between CDO and Opol
      const cityIndex = i % localCities.length;
      const selectedCity = localCities[cityIndex];
      const barangays = selectedCity === 'Cagayan de Oro City' ? cdoBarangays : opolBarangays;
      const barangayIndex = i % barangays.length;
      const selectedBarangay = barangays[barangayIndex];
      const addressSuffix = addressSuffixes[i % addressSuffixes.length];
      const addressNumber = (i % 999) + 1;
      
      // Create request location within CDO or Opol
      const requestLocation = `${addressNumber} ${selectedBarangay} ${addressSuffix}, ${selectedCity}, Misamis Oriental, Philippines`;
      
      const request = {
        id: requestId,
        requester_id: recipient.id,
        title: template.title,
        description: template.description,
        category: template.category,
        quantity_needed: template.quantity,
        urgency: template.urgency,
        location: requestLocation,
        needed_by: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'open',
        delivery_mode: deliveryMode,
        tags: [template.category.toLowerCase()],
        sample_image: template.image, // Add matching image
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      requestsToInsert.push(request);
    }
    
    const { data, error } = await supabase
      .from('donation_requests')
      .insert(requestsToInsert)
      .select();
    
    if (error) {
      // If sample_image column doesn't exist, add it first
      if (error.message.includes('sample_image')) {
        console.log('⚠️  sample_image column not found.');
        console.log('⚠️  Please add it first by running this SQL in Supabase Dashboard:\n');
        console.log('─'.repeat(60));
        console.log('ALTER TABLE public.donation_requests');
        console.log('ADD COLUMN IF NOT EXISTS sample_image TEXT;');
        console.log('─'.repeat(60));
        console.log('\nThen re-run this script.\n');
        console.log('Creating requests without images for now...');
        requestsToInsert.forEach(r => delete r.sample_image);
        const { data: retryData, error: retryError } = await supabase
          .from('donation_requests')
          .insert(requestsToInsert)
          .select();
        if (retryError) throw retryError;
        console.log(`✅ Created ${retryData.length} donation requests (without images)\n`);
        return retryData;
      }
      throw error;
    }
    
    console.log(`✅ Created ${data.length} donation requests with matching images\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding requests:', error);
    throw error;
  }
}

function getRandomFutureDate(daysFromNow = 7) {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
  return date.toISOString().split('T')[0];
}

function createDateTime(dateStr, timeStr) {
  // Create date with explicit time in local timezone
  // Format: dateStr = "2024-01-15", timeStr = "08:00"
  const [hours, minutes] = timeStr.split(':');
  
  // Parse the date components
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in local timezone (not UTC)
  // Note: month is 0-indexed in JavaScript Date constructor
  const date = new Date(year, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  
  // Return ISO string (will be converted to UTC, but the local time is preserved)
  return date.toISOString();
}

async function seedEvents() {
  console.log('🌱 Seeding events with matching images...\n');
  
  try {
    let admins = await getUsersByRole('admin');
    // Prefer specified admin first if present
    const preferredAdmin = admins.find(u => u.email && u.email.toLowerCase() === PREFERRED.adminEmail.toLowerCase());
    if (preferredAdmin) {
      admins = [preferredAdmin, ...admins.filter(a => a.id !== preferredAdmin.id)];
    }
    
    if (admins.length === 0) {
      console.log('⚠️  No admin users found to create events.');
      return;
    }
    
    const createdEvents = [];
    const usedEventIds = new Set();
    
    // Create all 8 events
    for (const template of eventTemplates) {
      const creator = admins[Math.floor(Math.random() * admins.length)];
      
      // Generate unique ID for event
      let eventId;
      do {
        eventId = randomUUID();
      } while (usedEventIds.has(eventId));
      usedEventIds.add(eventId);
      
      const startDate = getRandomFutureDate(30);
      // For single-day events, end_date should be the same day as start_date
      const endDate = startDate;
      
      // Combine date and time into ISO datetime strings using proper timezone handling
      const startDateTime = createDateTime(startDate, template.start_time);
      const endDateTime = createDateTime(endDate, template.end_time);
      
      // Verify times are different
      const startDateObj = new Date(startDateTime);
      const endDateObj = new Date(endDateTime);
      const hoursDiff = (endDateObj - startDateObj) / (1000 * 60 * 60);
      
      if (hoursDiff <= 0) {
        console.error(`⚠️  Warning: Event "${template.name}" has same or invalid start/end times!`);
        console.error(`  Start: ${startDateTime} (${startDateObj.toLocaleTimeString()})`);
        console.error(`  End: ${endDateTime} (${endDateObj.toLocaleTimeString()})`);
      }
      
      console.log(`✅ Creating event: ${template.name}`);
      console.log(`   Time: ${startDateObj.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})} - ${endDateObj.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})} (${hoursDiff} hours)`);
      
      const event = {
        id: eventId,
        name: template.name,
        description: template.description,
        location: template.location,
        start_date: startDateTime,
        end_date: endDateTime,
        target_goal: template.event_type,
        priority: template.priority,
        status: 'active',
        max_participants: template.max_participants,
        current_participants: 0,
        created_by: creator.id,
        image_url: template.image,
        schedule: template.schedule || [],
        requirements: template.requirements || [],
        what_to_bring: template.what_to_bring || [],
        contact_info: template.contact_info || {
          coordinator: 'Event Coordinator',
          phone: 'N/A',
          email: 'N/A'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert(event)
          .select()
          .single();
        
        if (eventError) {
          console.error(`Error creating event "${template.name}":`, eventError.message);
          continue;
        }
        
        // Insert event items with unique IDs
        if (template.donation_items && template.donation_items.length > 0) {
          const usedEventItemIds = new Set();
          const eventItemsToInsert = template.donation_items.map(item => {
            // Generate unique ID for event item
            let itemId;
            do {
              itemId = randomUUID();
            } while (usedEventItemIds.has(itemId));
            usedEventItemIds.add(itemId);
            
            return {
              id: itemId,
              event_id: eventData.id,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              description: item.description || null,
              collected_quantity: Math.floor(Math.random() * item.quantity * 0.3),
              created_at: new Date().toISOString()
            };
          });
          
          const { error: itemsError } = await supabase
            .from('event_items')
            .insert(eventItemsToInsert);
          
          if (itemsError) {
            console.error(`Error creating items for "${template.name}":`, itemsError.message);
          }
        }
        
        createdEvents.push(eventData);
        console.log(`✅ Created event: ${template.name}`);
        
      } catch (error) {
        console.error(`Error processing event "${template.name}":`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully created ${createdEvents.length} events with matching images\n`);
    return createdEvents;
    
  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

async function seedDonationClaims(donations, recipients) {
  console.log('🌱 Seeding donation claims as JSONB in donations table...\n');
  
  try {
    if (!donations || donations.length === 0 || !recipients || recipients.length === 0) {
      console.log('⚠️  No donations or recipients available for claims.');
      return [];
    }
    
    const claimsData = []; // Store claim objects for return
    const claimedDonations = new Set();
    
    // Separate donations by delivery mode
    const donationsByMode = {
      pickup: donations.filter(d => d.delivery_mode === 'pickup'),
      volunteer: donations.filter(d => d.delivery_mode === 'volunteer'),
      direct: donations.filter(d => d.delivery_mode === 'direct')
    };
    
    console.log(`   Donations by mode: pickup=${donationsByMode.pickup.length}, volunteer=${donationsByMode.volunteer.length}, direct=${donationsByMode.direct.length}`);
    
    const claimsByMode = {
      volunteer: Math.min(8, donationsByMode.volunteer.length),
      direct: Math.min(donationsByMode.direct.length, 6),
      pickup: Math.min(3, donationsByMode.pickup.length)
    };
    
    const totalClaims = claimsByMode.volunteer + claimsByMode.direct + claimsByMode.pickup;
    console.log(`   Planning to create ${totalClaims} claims as JSONB`);
    
    // Helper function to add claims to a donation
    const addClaimsToDonation = async (donation, numClaims) => {
      const claims = [];
      for (let i = 0; i < numClaims; i++) {
      let recipient = recipients[Math.floor(Math.random() * recipients.length)];
        let attempts = 0;
        while (recipient.id === donation.donor_id && attempts < 10) {
        recipient = recipients[Math.floor(Math.random() * recipients.length)];
          attempts++;
      }
        if (recipient.id === donation.donor_id) continue;
      
      const claim = {
          id: randomUUID(),
        recipient_id: recipient.id,
        status: 'claimed',
          quantity_claimed: donation.quantity || 1,
          claimed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        claims.push(claim);
        claimsData.push({ ...claim, donation_id: donation.id, donor_id: donation.donor_id });
    }
    
      if (claims.length > 0) {
        await supabase
          .from('donations')
          .update({ claims: claims })
          .eq('id', donation.id);
      }
      
      return claims.length;
    };
    
    // Add claims to volunteer donations
    let totalCreated = 0;
    for (let i = 0; i < claimsByMode.volunteer; i++) {
      const availableDonations = donationsByMode.volunteer.filter(d => !claimedDonations.has(d.id));
      if (availableDonations.length === 0) break;
      const donation = availableDonations[Math.floor(Math.random() * availableDonations.length)];
      claimedDonations.add(donation.id);
      totalCreated += await addClaimsToDonation(donation, 1);
    }
    
    // Add claims to direct donations
    for (let i = 0; i < claimsByMode.direct; i++) {
      const availableDonations = donationsByMode.direct.filter(d => !claimedDonations.has(d.id));
      if (availableDonations.length === 0) break;
      const donation = availableDonations[Math.floor(Math.random() * availableDonations.length)];
      claimedDonations.add(donation.id);
      totalCreated += await addClaimsToDonation(donation, 1);
    }
    
    // Add claims to pickup donations
    for (let i = 0; i < claimsByMode.pickup; i++) {
      const availableDonations = donationsByMode.pickup.filter(d => !claimedDonations.has(d.id));
      if (availableDonations.length === 0) break;
      const donation = availableDonations[Math.floor(Math.random() * availableDonations.length)];
      claimedDonations.add(donation.id);
      totalCreated += await addClaimsToDonation(donation, 1);
    }
    
    console.log(`✅ Created ${totalCreated} donation claims as JSONB\n`);
    return claimsData;
    
  } catch (error) {
    console.error('❌ Error seeding donation claims:', error);
    return [];
  }
}

async function seedEventParticipants(events, users) {
  console.log('🌱 Seeding event participants as JSONB in events table...\n');
  
  try {
    if (!events || events.length === 0 || !users || users.length === 0) {
      console.log('⚠️  No events or users available for participants.');
      return [];
    }
    
    const participantsData = [];
    let totalCreated = 0;
    
      // Add participants to each event (2-5 participants per event)
      for (const event of events) {
        // Filter out the event creator from participants
        const availableUsers = users.filter(user => user.id !== event.created_by);
        
        const numParticipants = Math.min(
          Math.floor(Math.random() * 4) + 2,
          event.max_participants || 10,
          availableUsers.length
        );
        
        if (numParticipants <= 0 || availableUsers.length === 0) continue;
        
        const eventUsers = [...availableUsers].sort(() => 0.5 - Math.random()).slice(0, numParticipants);
      
      const participants = [];
      for (const user of eventUsers) {
        const participant = {
          id: randomUUID(),
          user_id: user.id,
          role: 'participant',
          registration_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          attendance_status: 'pending',
          attended: false,
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        participants.push(participant);
        participantsData.push({ ...participant, event_id: event.id });
      }
      
      // Update event with participants JSONB array
      if (participants.length > 0) {
          await supabase
            .from('events')
          .update({ 
            participants: participants,
            current_participants: participants.length 
          })
          .eq('id', event.id);
        
        totalCreated += participants.length;
      }
    }
    
    console.log(`✅ Created ${totalCreated} event participants as JSONB\n`);
    return participantsData;
    
  } catch (error) {
    console.error('❌ Error seeding event participants:', error);
    return [];
  }
}

async function seedNotifications(users, donations, events, claims) {
  console.log('🌱 Seeding notifications with real data...\n');
  
  try {
    if (!users || users.length === 0) {
      console.log('⚠️  No users available for notifications.');
      return [];
    }
    
    // Get admin users for admin-specific notifications
    const admins = users.filter(user => user.role === 'admin');
    const donors = users.filter(user => user.role === 'donor');
    const recipients = users.filter(user => user.role === 'recipient');
    const volunteers = users.filter(user => user.role === 'volunteer');
    
    console.log(`   Found ${admins.length} admins, ${donors.length} donors, ${recipients.length} recipients, ${volunteers.length} volunteers`);
    console.log(`   Using real data: ${donations?.length || 0} donations, ${events?.length || 0} events, ${claims?.length || 0} claims`);
    
    const notificationsToInsert = [];
    const usedNotificationIds = new Set();
    
    // Fetch requests for notification data
    const { data: requests } = await supabase
      .from('donation_requests')
      .select('id, title, category, urgency, requester_id')
      .limit(10);
    
    // Create admin notifications using REAL data
    if (admins.length > 0) {
      console.log(`   Creating admin notifications with real data for ${admins.length} admin(s)...`);
      
      for (const admin of admins) {
        const adminNotifications = [];
        
        // 1. New Donation notifications (using real donations)
        if (donations && donations.length > 0) {
          const recipientDonations = donations.filter(d => d.donation_destination === 'recipients').slice(0, 3);
          const orgDonations = donations.filter(d => d.donation_destination === 'organization').slice(0, 2);
          
          // Posted donations for recipients
          for (const donation of recipientDonations) {
            const donor = users.find(u => u.id === donation.donor_id);
            adminNotifications.push({
              title: '📦 New Donation Posted',
              message: `${donor?.name || 'A donor'} posted ${donation.category} for recipients`,
              data: {
                donation_id: donation.id,
                donor_id: donation.donor_id,
                donor_name: donor?.name || 'Unknown',
                title: donation.title,
                category: donation.category,
                quantity: donation.quantity,
                link: '/admin/donations',
                notification_type: 'new_donation'
              }
            });
          }
          
          // Direct donations to organization
          for (const donation of orgDonations) {
            const donor = users.find(u => u.id === donation.donor_id);
            adminNotifications.push({
              title: '🏢 New Direct Donation to CFC-GK',
              message: `${donor?.name || 'A donor'} donated ${donation.category} directly to the organization`,
              data: {
                donation_id: donation.id,
                donor_id: donation.donor_id,
                donor_name: donor?.name || 'Unknown',
                title: donation.title,
                category: donation.category,
                quantity: donation.quantity,
                link: '/admin/cfc-donations',
                notification_type: 'new_cfc_donation'
              }
            });
          }
        }
        
        // 2. New Request notifications (using real requests)
        if (requests && requests.length > 0) {
          for (const request of requests.slice(0, 3)) {
            const requester = users.find(u => u.id === request.requester_id);
            const urgencyEmoji = request.urgency === 'critical' ? '🚨' : request.urgency === 'high' ? '⚠️' : request.urgency === 'medium' ? '📋' : '📝';
            
            adminNotifications.push({
              title: `${urgencyEmoji} New Donation Request`,
              message: `${requester?.name || 'A recipient'} created a ${request.urgency} priority request for ${request.category}`,
              data: {
                request_id: request.id,
                requester_id: request.requester_id,
                requester_name: requester?.name || 'Unknown',
                title: request.title,
                category: request.category,
                urgency: request.urgency,
                link: '/admin/requests',
                notification_type: 'new_request'
              }
            });
          }
        }
        
        // 3. Event Participant notifications (using real events)
        if (events && events.length > 0) {
          for (const event of events.slice(0, 2)) {
            const participant = [...donors, ...recipients, ...volunteers][Math.floor(Math.random() * (donors.length + recipients.length + volunteers.length))];
            if (participant) {
              adminNotifications.push({
                title: '🎉 New Event Participant',
                message: `${participant.name} joined "${event.name}"`,
                data: {
                  event_id: event.id,
                  event_name: event.name,
                  user_id: participant.id,
                  user_name: participant.name,
                  link: '/admin/events',
                  notification_type: 'event_participant_joined'
                }
              });
            }
          }
        }
        
        // 4. New User Registration notifications (using real users)
        const newUsers = [...donors.slice(0, 2), ...recipients.slice(0, 1), ...volunteers.slice(0, 1)];
        for (const newUser of newUsers) {
          const roleEmoji = newUser.role === 'donor' ? '💝' : newUser.role === 'recipient' ? '🤲' : '🚚';
          adminNotifications.push({
            title: `${roleEmoji} New User Registration`,
            message: `${newUser.name} registered as ${newUser.role}`,
            data: {
              user_id: newUser.id,
              user_name: newUser.name,
              user_role: newUser.role,
              link: '/admin/users',
              notification_type: 'new_user'
            }
          });
        }
        
        // 5. Delivery Completed notifications (using real volunteers)
        if (volunteers.length > 0 && donations && donations.length > 0) {
          const volunteer = volunteers[0];
          const donation = donations[0];
          adminNotifications.push({
            title: '✅ Delivery Completed',
            message: `${volunteer.name} completed delivery of "${donation.title}"`,
            data: {
              volunteer_id: volunteer.id,
              volunteer_name: volunteer.name,
              donation_id: donation.id,
              donation_title: donation.title,
              status: 'completed',
              link: '/admin/volunteers',
              notification_type: 'delivery_completed'
            }
          });
        }
        
        // 6. ID Upload notifications (using real volunteers)
        if (volunteers.length > 0) {
          const volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
          adminNotifications.push({
            title: '🆔 New ID Document Uploaded',
            message: `${volunteer.name} uploaded Driver's License for verification`,
            data: {
              user_id: volunteer.id,
              user_name: volunteer.name,
              user_role: 'volunteer',
              id_type: 'Driver\'s License',
              has_primary_id: true,
              link: '/admin/id-verification',
              notification_type: 'new_id_upload'
            }
          });
      }
      
        // Insert notifications for this admin
        for (const notifTemplate of adminNotifications) {
      let notificationId;
      do {
        notificationId = randomUUID();
      } while (usedNotificationIds.has(notificationId));
      usedNotificationIds.add(notificationId);
      
          notificationsToInsert.push({
        id: notificationId,
            user_id: admin.id,
            type: 'system_alert',
            title: notifTemplate.title,
            message: notifTemplate.message,
            data: notifTemplate.data,
            // 50% unread for testing
            read_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    // Create DONOR notifications using real data
    if (donors.length > 0 && donations && donations.length > 0) {
      console.log(`   Creating donor notifications with real data for ${donors.length} donor(s)...`);
      
      // Find preferred donor to prioritize
      const preferredDonor = donors.find(d => d.email && d.email.toLowerCase() === PREFERRED.donorEmail.toLowerCase());
      
      for (const donor of donors) {
        const donorNotifications = [];
        
        // Get donations by this donor (use more donations to create more requests)
        const donorDonations = donations.filter(d => d.donor_id === donor.id);
        
        // For preferred donor, use ALL their donations to create more notifications
        // For other donors, use up to 8 donations
        const maxDonationsToUse = (preferredDonor && donor.id === preferredDonor.id) 
          ? donorDonations.length 
          : Math.min(8, donorDonations.length);
        
        // Create donation requests for each donor's donations
        for (const donation of donorDonations.slice(0, maxDonationsToUse)) {
          // Donation request from recipient - create 2-4 requests per donation (more for preferred donor)
          if (recipients.length > 0) {
            const numRequests = (preferredDonor && donor.id === preferredDonor.id) 
              ? Math.floor(Math.random() * 3) + 3  // 3-5 requests for preferred donor
              : Math.floor(Math.random() * 2) + 2;   // 2-3 requests for others
            const selectedRecipients = [...recipients]
              .sort(() => 0.5 - Math.random())
              .slice(0, Math.min(numRequests, recipients.length));
            
            for (const recipient of selectedRecipients) {
              donorNotifications.push({
                title: '📋 New Donation Request',
                message: `${recipient.name} is interested in your "${donation.title}" donation`,
                data: {
                  donation_id: donation.id,
                  requester_id: recipient.id,
                  requester_name: recipient.name,
                  requester_email: recipient.email || '',
                  requester_phone: recipient.phone_number || '',
                  requester_address: recipient.address || '',
                  donation_title: donation.title,
                  type: 'donation_request'
                },
                type: 'donation_request',
                isUnread: true // Mark as unread for pending requests page
              });
            }
          }
          
          // Volunteer request - create 2-3 requests per donation (more for preferred donor)
          if (volunteers.length > 0 && donation.delivery_mode === 'volunteer') {
            const numVolunteerRequests = (preferredDonor && donor.id === preferredDonor.id)
              ? Math.floor(Math.random() * 2) + 2  // 2-3 requests for preferred donor
              : Math.floor(Math.random() * 2) + 1; // 1-2 requests for others
            const selectedVolunteers = [...volunteers]
              .sort(() => 0.5 - Math.random())
              .slice(0, Math.min(numVolunteerRequests, volunteers.length));
            
            for (const volunteer of selectedVolunteers) {
              donorNotifications.push({
                title: '🚚 Volunteer Delivery Request',
                message: `${volunteer.name} wants to deliver your "${donation.title}" donation`,
                data: {
                  donation_id: donation.id,
                  volunteer_id: volunteer.id,
                  volunteer_name: volunteer.name,
                  volunteer_email: volunteer.email || '',
                  volunteer_phone: volunteer.phone_number || '',
                  donation_title: donation.title,
                  type: 'volunteer_request'
                },
                type: 'volunteer_request',
                isUnread: true // Mark as unread for pending requests page
              });
            }
          }
          
          // Delivery status update (can be read) - skip for preferred donor to focus on pending requests
          if (volunteers.length > 0 && (!preferredDonor || donor.id !== preferredDonor.id) && Math.random() > 0.7) {
            const volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
            donorNotifications.push({
              title: '✅ Delivery In Progress',
              message: `${volunteer.name} is delivering your "${donation.title}"`,
              data: {
                donation_id: donation.id,
                volunteer_name: volunteer.name,
                donation_title: donation.title,
                status: 'in_transit',
                type: 'delivery_update'
              },
              type: 'delivery_completed',
              isUnread: false // Can be read
            });
          }
        }
        
        // Insert donor notifications
        // Prioritize donation_request and volunteer_request notifications (keep them unread)
        for (const notifTemplate of donorNotifications) {
          let notificationId;
          do {
            notificationId = randomUUID();
          } while (usedNotificationIds.has(notificationId));
          usedNotificationIds.add(notificationId);
          
          // For donation_request and volunteer_request, ALWAYS keep them unread (read_at = null)
          // For other notifications, randomly mark as read
          const shouldBeUnread = notifTemplate.isUnread || 
            (notifTemplate.type === 'donation_request' || notifTemplate.type === 'volunteer_request');
          
          notificationsToInsert.push({
            id: notificationId,
            user_id: donor.id,
            type: notifTemplate.type,
            title: notifTemplate.title,
            message: notifTemplate.message,
            data: notifTemplate.data,
            // CRITICAL: donation_request and volunteer_request MUST be unread (null) for pending-requests page
            read_at: shouldBeUnread ? null : (Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null),
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
        
        // Log notification count for preferred donor
        if (preferredDonor && donor.id === preferredDonor.id) {
          const unreadDonationRequests = donorNotifications.filter(n => n.type === 'donation_request').length;
          const unreadVolunteerRequests = donorNotifications.filter(n => n.type === 'volunteer_request').length;
          console.log(`   ✅ Created ${unreadDonationRequests} donation requests and ${unreadVolunteerRequests} volunteer requests for ${donor.email || donor.name}`);
        }
      }
    }
    
    // Create RECIPIENT notifications using real data
    if (recipients.length > 0 && donations && donations.length > 0) {
      console.log(`   Creating recipient notifications with real data for ${recipients.length} recipient(s)...`);
      
      for (const recipient of recipients) {
        const recipientNotifications = [];
        
        // New donations available
        const availableDonations = donations.filter(d => d.donation_destination === 'recipients').slice(0, 3);
        for (const donation of availableDonations) {
          const donor = users.find(u => u.id === donation.donor_id);
          recipientNotifications.push({
            title: '🎁 New Donation Available',
            message: `${donor?.name || 'A donor'} posted ${donation.category}: "${donation.title}"`,
            data: {
              donation_id: donation.id,
              donor_name: donor?.name || 'Unknown',
              category: donation.category,
              title: donation.title,
              type: 'new_donation'
            },
            type: 'system_alert'
          });
        }
        
        // Donation approved/matched
        if (availableDonations.length > 0) {
          const donation = availableDonations[0];
          const donor = users.find(u => u.id === donation.donor_id);
          recipientNotifications.push({
            title: '✅ Donation Request Approved',
            message: `Your request for "${donation.title}" has been approved by ${donor?.name || 'the donor'}`,
            data: {
              donation_id: donation.id,
              donor_name: donor?.name || 'Unknown',
              title: donation.title,
              type: 'donation_approved'
            },
            type: 'system_alert'
          });
        }
        
        // Delivery status updates
        if (volunteers.length > 0 && availableDonations.length > 0) {
          const volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
          const donation = availableDonations[0];
          recipientNotifications.push({
            title: '🚚 Delivery On The Way',
            message: `${volunteer.name} is delivering "${donation.title}" to you`,
            data: {
              donation_id: donation.id,
              volunteer_name: volunteer.name,
              title: donation.title,
              status: 'in_transit',
              type: 'delivery_update'
            },
            type: 'delivery_completed'
          });
        }
        
        // Event invitations
        if (events && events.length > 0) {
          const event = events[Math.floor(Math.random() * events.length)];
          recipientNotifications.push({
            title: '📅 Event Invitation',
            message: `You're invited to "${event.name}"`,
            data: {
              event_id: event.id,
              event_name: event.name,
              event_date: event.event_date,
              type: 'event_invitation'
            },
            type: 'system_alert'
          });
        }
        
        // Insert recipient notifications
        for (const notifTemplate of recipientNotifications.slice(0, 8)) {
          let notificationId;
          do {
            notificationId = randomUUID();
          } while (usedNotificationIds.has(notificationId));
          usedNotificationIds.add(notificationId);
          
          notificationsToInsert.push({
            id: notificationId,
            user_id: recipient.id,
            type: notifTemplate.type,
            title: notifTemplate.title,
            message: notifTemplate.message,
            data: notifTemplate.data,
            read_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    // Create VOLUNTEER notifications using real data
    if (volunteers.length > 0 && donations && donations.length > 0) {
      console.log(`   Creating volunteer notifications with real data for ${volunteers.length} volunteer(s)...`);
      
      for (const volunteer of volunteers) {
        const volunteerNotifications = [];
        
        // Delivery assignments
        const volunteerDonations = donations.filter(d => d.delivery_mode === 'volunteer').slice(0, 3);
        for (const donation of volunteerDonations) {
          const donor = users.find(u => u.id === donation.donor_id);
          volunteerNotifications.push({
            title: '📦 New Delivery Assignment',
            message: `You've been assigned to deliver "${donation.title}" from ${donor?.name || 'a donor'}`,
            data: {
              donation_id: donation.id,
              donor_name: donor?.name || 'Unknown',
              title: donation.title,
              type: 'delivery_assigned'
            },
            type: 'delivery_assigned'
          });
        }
        
        // Volunteer request approved
        if (volunteerDonations.length > 0) {
          const donation = volunteerDonations[0];
          const donor = users.find(u => u.id === donation.donor_id);
          volunteerNotifications.push({
            title: '✅ Volunteer Request Approved',
            message: `${donor?.name || 'The donor'} approved your request to deliver "${donation.title}"`,
            data: {
              donation_id: donation.id,
              donor_name: donor?.name || 'Unknown',
              title: donation.title,
              type: 'volunteer_approved'
            },
            type: 'volunteer_approved'
          });
        }
        
        // Event participation
        if (events && events.length > 0) {
          const event = events[Math.floor(Math.random() * events.length)];
          volunteerNotifications.push({
            title: '🎉 Event Participation Confirmed',
            message: `You're registered for "${event.name}"`,
            data: {
              event_id: event.id,
              event_name: event.name,
              event_date: event.event_date,
              type: 'event_confirmed'
            },
            type: 'system_alert'
          });
        }
        
        // Insert volunteer notifications
        for (const notifTemplate of volunteerNotifications.slice(0, 8)) {
          let notificationId;
          do {
            notificationId = randomUUID();
          } while (usedNotificationIds.has(notificationId));
          usedNotificationIds.add(notificationId);
          
          notificationsToInsert.push({
            id: notificationId,
            user_id: volunteer.id,
            type: notifTemplate.type,
            title: notifTemplate.title,
            message: notifTemplate.message,
            data: notifTemplate.data,
            read_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null,
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    if (notificationsToInsert.length === 0) {
      console.log('⚠️  No notifications to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding notifications:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} notifications using real database data\n`);
    
    // Count notifications by user role
    const adminNotifCount = notificationsToInsert.filter(n => 
      admins.some(admin => admin.id === n.user_id)
    ).length;
    const donorNotifCount = notificationsToInsert.filter(n => 
      donors.some(donor => donor.id === n.user_id)
    ).length;
    const recipientNotifCount = notificationsToInsert.filter(n => 
      recipients.some(recipient => recipient.id === n.user_id)
    ).length;
    const volunteerNotifCount = notificationsToInsert.filter(n => 
      volunteers.some(volunteer => volunteer.id === n.user_id)
    ).length;
    
    // Count unread donation_request and volunteer_request notifications (for pending requests page)
    const unreadDonationRequests = notificationsToInsert.filter(n => 
      n.type === 'donation_request' && !n.read_at
    ).length;
    const unreadVolunteerRequests = notificationsToInsert.filter(n => 
      n.type === 'volunteer_request' && !n.read_at
    ).length;
    
    console.log(`   Admin notifications: ${adminNotifCount}`);
    console.log(`   Donor notifications: ${donorNotifCount}`);
    console.log(`   Recipient notifications: ${recipientNotifCount}`);
    console.log(`   Volunteer notifications: ${volunteerNotifCount}`);
    console.log(`   📋 Unread Donation Requests (for /pending-requests): ${unreadDonationRequests}`);
    console.log(`   🚚 Unread Volunteer Requests (for /pending-requests): ${unreadVolunteerRequests}`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    return [];
  }
}

async function seedDeliveries(claims, volunteers, donations, recipients, claimToVolunteerMap) {
  console.log('🌱 Seeding volunteer deliveries...\n');
  
  try {
    if (!volunteers || volunteers.length === 0 || !donations || donations.length === 0) {
      console.log('⚠️  No volunteers or donations available for deliveries.');
      return [];
    }
    
    // IMPORTANT: Only create deliveries for claims that have APPROVED volunteer requests
    // This ensures deliveries appear in my-deliveries page (which requires approved requests)
    if (!claimToVolunteerMap || claimToVolunteerMap.size === 0) {
      console.log('⚠️  No approved volunteer requests found. Deliveries will only be created for approved requests.');
      console.log('   This ensures deliveries appear in /my-deliveries page.\n');
      return [];
    }
    
    // Create a map of donations by ID for quick lookup
    const donationsMap = {};
    if (donations && donations.length > 0) {
      donations.forEach(donation => {
        donationsMap[donation.id] = donation;
      });
    }
    
    // Fetch all donations with claims (JSONB) to get actual claim data
    const { data: donationsWithClaims } = await supabase
      .from('donations')
      .select('id, claims, delivery_mode')
      .not('claims', 'is', null)
      .eq('delivery_mode', 'volunteer');
    
    if (!donationsWithClaims || donationsWithClaims.length === 0) {
      console.log('⚠️  No donations with volunteer delivery mode and claims available.');
      return [];
    }
    
    // Extract all claims from JSONB arrays and flatten them with donation_id
    const allVolunteerClaims = [];
    donationsWithClaims.forEach(donation => {
      if (Array.isArray(donation.claims)) {
        donation.claims.forEach(claim => {
          if (claim && claim.id) {
            allVolunteerClaims.push({
              ...claim,
              donation_id: donation.id
            });
          }
        });
      }
    });
    
    // IMPORTANT: Filter to only include claims that have approved volunteer requests
    const approvedClaims = allVolunteerClaims.filter(claim => claimToVolunteerMap.has(claim.id));
    
    console.log(`   Found ${allVolunteerClaims.length} total claims with volunteer delivery mode`);
    console.log(`   Found ${approvedClaims.length} claims with approved volunteer requests`);
    console.log(`   Available volunteers: ${volunteers.length}`);
    
    if (approvedClaims.length === 0) {
      console.log('⚠️  No claims with approved volunteer requests available for deliveries.');
      console.log('   Note: Deliveries are only created for approved volunteer requests to ensure they appear in /my-deliveries\n');
      return [];
    }
    
    if (volunteers.length === 0) {
      console.log('⚠️  No volunteers available for deliveries.');
      return [];
    }
    
    const deliveriesToInsert = [];
    const usedDeliveryIds = new Set();
    // Valid delivery statuses based on codebase: 'pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'
    // Note: 'completed' is NOT in the enum (error confirmed)
    const deliveryStatuses = ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'];
  let volunteerDeliveryHasDelivered = false;
    
    // Create deliveries for ALL approved claims (they have approved volunteer requests)
    const numDeliveries = approvedClaims.length;
    
    console.log(`   Creating ${numDeliveries} volunteer deliveries (one for each approved volunteer request)...`);
    
    // Create a set to track which claims already have deliveries
    const claimsWithDeliveries = new Set();
    
    // Find the prioritized volunteer (cristanjade70@gmail.com) if they exist
    const prioritizedVolunteer = volunteers.find(v => v.email && v.email.toLowerCase() === 'cristanjade70@gmail.com');
    let prioritizedCount = 0;
    
    // Create deliveries for all approved claims
    for (const claim of approvedClaims) {
      if (claimsWithDeliveries.has(claim.id)) continue;
      
      // Get the volunteer assigned to this claim from the approved volunteer request
      const assignedVolunteerId = claimToVolunteerMap.get(claim.id);
      const volunteer = volunteers.find(v => v.id === assignedVolunteerId);
      
      if (!volunteer) {
        console.log(`⚠️  Volunteer not found for claim ${claim.id}, skipping delivery creation.`);
        continue;
      }
      
      if (prioritizedVolunteer && volunteer.id === prioritizedVolunteer.id) {
        prioritizedCount++;
      }
      
      // Get donation info for addresses
      const donation = donationsMap[claim.donation_id];
      const recipient = recipients.find(r => r.id === claim.recipient_id);
      
      // Choose status - prefer more advanced statuses for variety
      // Since these are approved volunteer requests, they should start at 'assigned' or higher
      // Status distribution: 30% assigned, 25% accepted, 20% picked_up, 15% in_transit, 10% delivered
      const statusWeights = {
        'assigned': 6,      // Most common - just approved (30%)
        'accepted': 5,      // Volunteer accepted (25%)
        'picked_up': 4,    // In progress (20%)
        'in_transit': 3,   // On the way (15%)
        'delivered': 2     // Completed (10%)
      };
      const weightedStatuses = [];
      Object.entries(statusWeights).forEach(([status, weight]) => {
        for (let i = 0; i < weight; i++) {
          weightedStatuses.push(status);
        }
      });
      const status = weightedStatuses[Math.floor(Math.random() * weightedStatuses.length)];
      
      // Generate unique ID
      let deliveryId;
      do {
        deliveryId = randomUUID();
      } while (usedDeliveryIds.has(deliveryId));
      usedDeliveryIds.add(deliveryId);
      
      // Set addresses based on donation and recipient info
      const pickupAddress = donation?.pickup_location || 'TBD';
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : 'TBD';
      const pickupCity = donation?.pickup_location?.split(',')?.pop()?.trim() || 'TBD';
      const deliveryCity = recipient?.city || 'TBD';
      
      const delivery = {
        id: deliveryId,
        claim_id: claim.id,
        volunteer_id: volunteer.id,
        status: status,
        delivery_mode: 'volunteer',
        // Use normalized fields defined in schema
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        pickup_city: pickupCity,
        delivery_city: deliveryCity
        // Note: created_at and updated_at are auto-generated by the database
      };
      
      // Add status-specific timestamps based on delivery status
      if (status === 'accepted' || ['picked_up', 'in_transit', 'delivered'].includes(status)) {
        delivery.accepted_at = new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (['picked_up', 'in_transit', 'delivered'].includes(status)) {
        delivery.picked_up_at = new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (['in_transit', 'delivered'].includes(status)) {
        delivery.in_transit_at = new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (status === 'delivered') {
        delivery.delivered_at = new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString();
        // Note: volunteer_notes column removed - not in deliveries table schema
      }
      volunteerDeliveryHasDelivered = volunteerDeliveryHasDelivered || status === 'delivered';
      // Provide a scheduled date for display if not already implied
      // Do not set scheduled_delivery_date if the column doesn't exist in schema
      
      deliveriesToInsert.push(delivery);
      claimsWithDeliveries.add(claim.id);
    }
    
    if (!volunteerDeliveryHasDelivered && deliveriesToInsert.length > 0) {
      const delivery = deliveriesToInsert[0];
      delivery.status = 'delivered';
      delivery.accepted_at = delivery.accepted_at || new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      delivery.picked_up_at = delivery.picked_up_at || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      delivery.in_transit_at = delivery.in_transit_at || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      delivery.delivered_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }
    
    if (deliveriesToInsert.length === 0) {
      console.log('⚠️  No deliveries to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(deliveriesToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding deliveries:', error.message);
      return [];
    }
    
    // Count how many deliveries were assigned to the prioritized volunteer
    if (prioritizedVolunteer) {
      const prioritizedDeliveries = data.filter(d => d.volunteer_id === prioritizedVolunteer.id);
      console.log(`✅ Created ${data.length} volunteer deliveries (all from approved volunteer requests)`);
      console.log(`   📦 ${prioritizedDeliveries.length} delivery(ies) assigned to ${prioritizedVolunteer.email || prioritizedVolunteer.name || 'prioritized volunteer'}`);
      console.log(`   ✅ All deliveries have approved volunteer requests and will appear in /my-deliveries page\n`);
    } else {
      console.log(`✅ Created ${data.length} volunteer deliveries (all from approved volunteer requests)`);
      console.log(`   ✅ All deliveries have approved volunteer requests and will appear in /my-deliveries page\n`);
    }
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding deliveries:', error);
    return [];
  }
}

async function seedDirectDeliveries(claims, donations, recipients) {
  console.log('🌱 Seeding direct deliveries (merged into deliveries table with delivery_mode)...\n');
  
  try {
    if (!claims || claims.length === 0) {
      console.log('⚠️  No claims available for direct deliveries.');
      return [];
    }
    
    // Create a map of donations by ID for quick lookup
    const donationsMap = {};
    if (donations && donations.length > 0) {
      donations.forEach(donation => {
        donationsMap[donation.id] = donation;
      });
    }
    
    // Filter claims that use direct delivery mode (check donation.delivery_mode)
    const directClaims = claims.filter(claim => {
      const donation = donationsMap[claim.donation_id];
      return donation && donation.delivery_mode === 'direct';
    });
    
    if (directClaims.length === 0) {
      console.log('⚠️  No direct delivery claims available.');
      console.log(`   Total claims: ${claims.length}`);
      console.log(`   Donations with direct mode: ${donations ? donations.filter(d => d.delivery_mode === 'direct').length : 0}`);
      return [];
    }
    
    console.log(`   Found ${directClaims.length} claims with direct delivery mode`);
    
    // Create recipients map for quick lookup
    const recipientsMap = {};
    if (recipients && recipients.length > 0) {
      recipients.forEach(recipient => {
        recipientsMap[recipient.id] = recipient;
      });
    }
    
    const deliveriesToInsert = [];
    const usedDeliveryIds = new Set();
    // Note: direct_deliveries was merged into deliveries table
    // Valid statuses for direct deliveries: 'pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'
    const directDeliveryStatuses = ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'];
  let directDeliveryHasDelivered = false;
    
    // Create direct deliveries for ALL direct claims (100%)
    const numDirectDeliveries = directClaims.length;
    const processedClaims = new Set();
    
    for (let i = 0; i < numDirectDeliveries && i < directClaims.length; i++) {
      const claim = directClaims[i];
      
      // Skip if this claim already processed
      if (processedClaims.has(claim.id) || deliveriesToInsert.some(d => d.claim_id === claim.id)) {
        continue;
      }
      processedClaims.add(claim.id);
      
      const status = directDeliveryStatuses[Math.floor(Math.random() * directDeliveryStatuses.length)];
      
      // Get recipient and donation info
      const recipient = recipientsMap[claim.recipient_id];
      const donation = donationsMap[claim.donation_id];
      
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : 'Recipient address TBD';
      
      const pickupAddress = donation?.pickup_location || 'Pickup location TBD';
      
      // Generate unique ID
      let deliveryId;
      do {
        deliveryId = randomUUID();
      } while (usedDeliveryIds.has(deliveryId));
      usedDeliveryIds.add(deliveryId);
      
      const delivery = {
        id: deliveryId,
        claim_id: claim.id,
        volunteer_id: null, // Direct deliveries don't have volunteers assigned
        status: status,
        delivery_mode: 'direct', // This is the key field that identifies it as a direct delivery
        // Use normalized fields defined in schema
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress,
        pickup_city: donation?.pickup_location?.split(',')?.pop()?.trim() || 'TBD',
        delivery_city: recipient?.city || 'TBD'
      };
      
      // Add status-specific timestamps
      if (['accepted', 'picked_up', 'in_transit', 'delivered'].includes(status)) {
        delivery.accepted_at = new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (['picked_up', 'in_transit', 'delivered'].includes(status)) {
        delivery.picked_up_at = new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (['in_transit', 'delivered'].includes(status)) {
        delivery.in_transit_at = new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (status === 'delivered') {
        delivery.delivered_at = new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString();
      }
      // Provide a scheduled date for display if not already implied
      // Do not set scheduled_delivery_date if the column doesn't exist in schema
      
      deliveriesToInsert.push(delivery);
      directDeliveryHasDelivered = directDeliveryHasDelivered || status === 'delivered';
    }
    
    if (!directDeliveryHasDelivered && deliveriesToInsert.length > 0) {
      const delivery = deliveriesToInsert[0];
      delivery.status = 'delivered';
      delivery.accepted_at = delivery.accepted_at || new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
      delivery.picked_up_at = delivery.picked_up_at || new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      delivery.in_transit_at = delivery.in_transit_at || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      delivery.delivered_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }
    
    if (deliveriesToInsert.length === 0) {
      console.log('⚠️  No direct deliveries to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('deliveries')
      .insert(deliveriesToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding direct deliveries:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} direct deliveries (in deliveries table with delivery_mode='direct')\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding direct deliveries:', error);
    return [];
  }
}

async function seedMatchingParameters() {
  console.log('🌱 Seeding matching_parameters...\n');
  
  try {
    // Check if matching parameters exist
    const { data: existingParams, error: checkError } = await supabase
      .from('matching_parameters')
      .select('*')
      .eq('parameter_group', 'DONOR_RECIPIENT_VOLUNTEER')
      .limit(1);
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('⚠️  Error checking matching parameters:', checkError.message);
      return null;
    }
    
    if (existingParams && existingParams.length > 0) {
      console.log('✅ Matching parameters already exist, skipping...\n');
      return existingParams;
    }
    
    // Create default matching parameters for DONOR_RECIPIENT_VOLUNTEER group
    // These are the default weights that sum to 1.0 (100%)
    const matchingParamsToInsert = {
      id: randomUUID(),
      parameter_group: 'DONOR_RECIPIENT_VOLUNTEER',
      geographic_proximity_weight: 0.30,        // 30% - Distance between donor, recipient, and volunteer
      item_compatibility_weight: 0.25,          // 25% - Donor's item matches recipient's request
      urgency_alignment_weight: 0.20,           // 20% - Priority matching for urgent requests
      user_reliability_weight: 0.15,           // 15% - User ratings and history
      delivery_compatibility_weight: 0.10,      // 10% - Delivery method preferences
      auto_match_enabled: false,                // Auto-matching disabled by default
      auto_match_threshold: 0.75,               // 75% score threshold for auto-matching
      auto_claim_threshold: 0.85,               // 85% score threshold for auto-claiming
      max_matching_distance_km: 50,             // Maximum 50km for geographic matching
      min_quantity_match_ratio: 0.8,           // 80% quantity match required
      perishable_geographic_boost: 0.35,        // 35% boost for perishable items
      critical_urgency_boost: 0.30,             // 30% boost for critical urgency
      description: 'Unified matching parameters for donors, recipients, and volunteers',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('matching_parameters')
      .insert(matchingParamsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding matching_parameters:', error.message);
      return null;
    }
    
    console.log(`✅ Created matching parameters for DONOR_RECIPIENT_VOLUNTEER group\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding matching_parameters:', error);
    return null;
  }
}

async function seedSettings() {
  console.log('🌱 Seeding system_settings...\n');
  
  try {
    // Check if settings exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1);
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('⚠️  Error checking settings:', checkError.message);
      return null;
    }
    
    if (existingSettings && existingSettings.length > 0) {
      console.log('✅ System settings already exist, skipping...\n');
      return existingSettings;
    }
    
    // Create default settings as key-value pairs
    const settingsToInsert = [
      {
        id: randomUUID(),
        setting_key: 'enable_system_logs',
        setting_value: true,
        description: 'Enable system logging',
        setting_type: 'boolean',
        category: 'platform',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        setting_key: 'log_retention_days',
        setting_value: 30,
        description: 'Number of days to retain logs',
        setting_type: 'number',
        category: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        setting_key: 'require_id_verification',
        setting_value: true,
        description: 'Require ID verification for volunteers',
        setting_type: 'boolean',
        category: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        setting_key: 'donor_signup_enabled',
        setting_value: true,
        description: 'Allow donor signups',
        setting_type: 'boolean',
        category: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        setting_key: 'recipient_signup_enabled',
        setting_value: true,
        description: 'Allow recipient signups',
        setting_type: 'boolean',
        category: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        setting_key: 'volunteer_signup_enabled',
        setting_value: true,
        description: 'Allow volunteer signups',
        setting_type: 'boolean',
        category: 'platform',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    const { data, error } = await supabase
      .from('system_settings')
      .insert(settingsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding system_settings:', error.message);
      return null;
    }
    
    console.log(`✅ Created ${data.length} system settings\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding system_settings:', error);
    return null;
  }
}

async function seedDeliveryConfirmations(donations, deliveries) {
  console.log('🌱 Seeding delivery confirmations as JSONB in donations table...\n');
  
  try {
    if (!donations || donations.length === 0 || !deliveries || deliveries.length === 0) {
      console.log('⚠️  No donations or deliveries available for confirmations.');
      return [];
    }
    
    // Get donations that have claims
    const { data: donationsWithClaims } = await supabase
      .from('donations')
      .select('id, claims')
      .not('claims', 'is', null);
    
    if (!donationsWithClaims || donationsWithClaims.length === 0) {
      console.log('⚠️  No donations with claims for confirmations.');
      return [];
    }
    
    let totalCreated = 0;
    
    // Add confirmations to ~30% of donations with claims
    const numToUpdate = Math.max(1, Math.floor(donationsWithClaims.length * 0.3));
    const selectedDonations = donationsWithClaims.slice(0, numToUpdate);
    
    for (const donation of selectedDonations) {
      const confirmations = [];
      
      // Create 1-2 confirmations per donation
      const numConfirmations = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numConfirmations; i++) {
        const delivery = deliveries[Math.floor(Math.random() * deliveries.length)];
        confirmations.push({
          id: randomUUID(),
          delivery_id: delivery?.id || randomUUID(),
          confirmed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
      if (confirmations.length > 0) {
        await supabase
          .from('donations')
          .update({ confirmations: confirmations })
          .eq('id', donation.id);
        totalCreated += confirmations.length;
      }
    }
    
    console.log(`✅ Created ${totalCreated} delivery confirmations as JSONB\n`);
      return [];
    
  } catch (error) {
    console.error('❌ Error seeding delivery confirmations:', error);
    return [];
  }
}

async function seedFeedbackRatings(donations, requests, allUsers) {
  console.log('🌱 Seeding feedback...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for feedback.');
      return [];
    }
    
    const feedbackToInsert = [];
    const usedFeedbackIds = new Set();
    
    const allDonations = donations || [];
    const allRequests = requests || [];
    
    const feedbackTexts = [
      'Great experience! Very helpful.',
      'Thank you so much for your generosity.',
      'Quick and smooth process.',
      'Appreciated the help received.',
      'Could be better, but overall good.'
    ];
    
    // Create feedback for ~30% of donations
    const numDonationFeedback = Math.max(1, Math.floor(allDonations.length * 0.3));
    for (let i = 0; i < numDonationFeedback && i < allDonations.length; i++) {
      const donation = allDonations[i];
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      let feedbackId;
      do {
        feedbackId = randomUUID();
      } while (usedFeedbackIds.has(feedbackId));
      usedFeedbackIds.add(feedbackId);
      
      feedbackToInsert.push({
        id: feedbackId,
        user_id: user.id,
        feedback_text: feedbackTexts[Math.floor(Math.random() * feedbackTexts.length)],
        feedback_type: 'donation',
        transaction_type: 'donation',
        transaction_id: donation.id,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Create feedback for ~30% of requests
    const numRequestFeedback = Math.max(1, Math.floor(allRequests.length * 0.3));
    for (let i = 0; i < numRequestFeedback && i < allRequests.length; i++) {
      const request = allRequests[i];
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      let feedbackId;
      do {
        feedbackId = randomUUID();
      } while (usedFeedbackIds.has(feedbackId));
      usedFeedbackIds.add(feedbackId);
      
      feedbackToInsert.push({
        id: feedbackId,
        user_id: user.id,
        feedback_text: feedbackTexts[Math.floor(Math.random() * feedbackTexts.length)],
        feedback_type: 'request',
        transaction_type: 'request',
        transaction_id: request.id,
        rating: Math.floor(Math.random() * 2) + 4,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Create some platform feedback
    const numPlatformFeedback = Math.min(5, allUsers.length);
    for (let i = 0; i < numPlatformFeedback; i++) {
      const user = allUsers[i];
      let feedbackId;
      do {
        feedbackId = randomUUID();
      } while (usedFeedbackIds.has(feedbackId));
      usedFeedbackIds.add(feedbackId);
      
      feedbackToInsert.push({
        id: feedbackId,
        user_id: user.id,
        feedback_text: 'Platform feedback: ' + feedbackTexts[Math.floor(Math.random() * feedbackTexts.length)],
        feedback_type: 'platform',
        rating: Math.floor(Math.random() * 2) + 4,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (feedbackToInsert.length === 0) {
      console.log('⚠️  No feedback to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding feedback:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} feedback entries\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding feedback:', error);
    return [];
  }
}

async function seedPerformanceMetrics(allUsers) {
  console.log('🌱 Seeding performance metrics...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for performance metrics.');
      return [];
    }
    
    const metricsToInsert = [];
    const usedMetricIds = new Set();
    
    // Create performance metrics for ~30% of users
    // Note: performance_metrics table requires table_name and operation_type (not null)
    const numMetrics = Math.max(1, Math.floor(allUsers.length * 0.3));
    const selectedUsers = allUsers.slice(0, numMetrics);
    
    const tableNames = ['users', 'donations', 'requests', 'deliveries', 'events'];
    const operationTypes = ['insert', 'update', 'delete', 'select'];
    
    for (const user of selectedUsers) {
      let metricId;
      do {
        metricId = randomUUID();
      } while (usedMetricIds.has(metricId));
      usedMetricIds.add(metricId);
      
      metricsToInsert.push({
        id: metricId,
        table_name: tableNames[Math.floor(Math.random() * tableNames.length)],
        operation_type: operationTypes[Math.floor(Math.random() * operationTypes.length)],
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (metricsToInsert.length === 0) {
      console.log('⚠️  No performance metrics to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('performance_metrics')
      .insert(metricsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding performance metrics:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} performance metrics\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding performance metrics:', error);
    return [];
  }
}

// Note: The following functions are no longer needed as data is now stored in user_profiles JSONB:
// - seedUserPreferences (user_profiles.preferences)
// - seedUserReports (user_profiles.reports)
// - seedUserVerifications (user_profiles.id_documents)
// - seedVolunteerRatings (consolidated into feedback table)

async function seedVolunteerUrgencyPreferences(volunteers) {
  console.log('🌱 Seeding volunteer urgency preferences...\n');
  
  try {
    if (!volunteers || volunteers.length === 0) {
      console.log('⚠️  No volunteers available for urgency preferences.');
      return;
    }
    
    const urgencyLevels = ['low', 'medium', 'high', 'critical'];
    let updatedCount = 0;
    
    // Distribute urgency preferences evenly across volunteers for better diversity
    // This ensures we have volunteers with all urgency preferences
    const urgencyDistribution = [];
    for (let i = 0; i < volunteers.length; i++) {
      urgencyDistribution.push(urgencyLevels[i % urgencyLevels.length]);
    }
    // Shuffle for more natural distribution
    urgencyDistribution.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < volunteers.length; i++) {
      const volunteer = volunteers[i];
      // Assign urgency preference from distributed array for better diversity
      const urgencyPreference = urgencyDistribution[i] || urgencyLevels[i % urgencyLevels.length];
      
      // Check if user_profiles row exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id, volunteer')
        .eq('user_id', volunteer.id)
        .maybeSingle();
      
      if (existingProfile) {
        // Update existing profile with volunteer urgency preference
        const volunteerData = existingProfile.volunteer || {};
        volunteerData.urgency_response = urgencyPreference;
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ volunteer: volunteerData })
          .eq('user_id', volunteer.id);
        
        if (updateError) {
          console.error(`⚠️  Error updating urgency preference for volunteer ${volunteer.id}:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        // Create new profile with volunteer urgency preference
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: volunteer.id,
            volunteer: {
              urgency_response: urgencyPreference
            }
          });
        
        if (insertError) {
          console.error(`⚠️  Error creating profile with urgency preference for volunteer ${volunteer.id}:`, insertError.message);
        } else {
          updatedCount++;
        }
      }
    }
    
    console.log(`✅ Seeded urgency preferences for ${updatedCount} volunteers\n`);
  } catch (error) {
    console.error('❌ Error seeding volunteer urgency preferences:', error);
  }
}

async function seedVolunteerRequests(claims, volunteers, donations) {
  console.log('🌱 Seeding volunteer requests...\n');
  
  try {
    if (!claims || claims.length === 0 || !volunteers || volunteers.length === 0) {
      console.log('⚠️  No claims or volunteers available for volunteer requests.');
      return { requests: [], claimToVolunteerMap: new Map() };
    }
    
    // Create a map of donations by ID for quick lookup
    const donationsMap = new Map();
    if (donations && donations.length > 0) {
      donations.forEach(donation => {
        donationsMap.set(donation.id, donation);
      });
    }
    
    // Only create requests for claims that need volunteer delivery
    // Filter claims where the donation has delivery_mode = 'volunteer'
    const volunteerClaims = claims.filter(c => {
      const donation = donationsMap.get(c.donation_id);
      // Only include claims for donations with volunteer delivery mode
      // Exclude CFC-GK donations (donation_destination = 'organization') as they don't have claims
      return donation && 
             donation.delivery_mode === 'volunteer' && 
             donation.donation_destination === 'recipients';
    });
    
    if (volunteerClaims.length === 0) {
      console.log('⚠️  No volunteer claims available for volunteer requests.');
      return { requests: [], claimToVolunteerMap: new Map() };
    }
    
    const requestsToInsert = [];
    const usedRequestIds = new Set();
    
    // IMPORTANT: Create volunteer requests for claims that will have deliveries
    // We need to ensure that deliveries are only created for approved volunteer requests
    // Create requests for ~40% of volunteer claims (matching the delivery creation rate)
    const numRequests = Math.max(1, Math.floor(volunteerClaims.length * 0.4));
    const selectedClaims = volunteerClaims.slice(0, numRequests);
    
    // Track which volunteers are assigned to which claims to avoid duplicates
    const claimToVolunteerMap = new Map();
    
    for (const claim of selectedClaims) {
      const volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
      
      let requestId;
      do {
        requestId = randomUUID();
      } while (usedRequestIds.has(requestId));
      usedRequestIds.add(requestId);
      
      // IMPORTANT: For deliveries to appear in my-deliveries, volunteer requests MUST be 'approved'
      // Distribute: 70% approved (for deliveries), 20% pending, 10% rejected
      let status;
      const rand = Math.random();
      if (rand < 0.7) {
        status = 'approved'; // These will have deliveries created
      } else if (rand < 0.9) {
        status = 'pending';
      } else {
        status = 'rejected';
      }
      
      // Store the volunteer assignment for this claim (for delivery creation)
      if (status === 'approved') {
        claimToVolunteerMap.set(claim.id, volunteer.id);
      }
      
      // Note: volunteer_requests table has claim_id and request_id, but NOT donation_id
      // CFC-GK donations don't have claims, so they won't have volunteer requests seeded here
      // Volunteer requests for CFC-GK donations are created when volunteers accept tasks in the UI
      requestsToInsert.push({
        id: requestId,
        volunteer_id: volunteer.id,
        claim_id: claim.id,
        request_id: null,
        task_type: 'approved_donation',
        status: status,
        created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    if (requestsToInsert.length === 0) {
      console.log('⚠️  No volunteer requests to insert.');
      return { requests: [], claimToVolunteerMap: new Map() };
    }
    
    const { data, error } = await supabase
      .from('volunteer_requests')
      .insert(requestsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding volunteer requests:', error.message);
      return { requests: [], claimToVolunteerMap: new Map() };
    }
    
    const approvedCount = data.filter(r => r.status === 'approved').length;
    const pendingCount = data.filter(r => r.status === 'pending').length;
    const rejectedCount = data.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Created ${data.length} volunteer requests for regular donations (with claims)`);
    console.log(`   • ${approvedCount} approved (will have deliveries created)`);
    console.log(`   • ${pendingCount} pending`);
    console.log(`   • ${rejectedCount} rejected`);
    console.log(`   Note: CFC-GK donations don't have claims, so volunteer requests for them are created when volunteers accept tasks in the UI\n`);
    
    return { requests: data, claimToVolunteerMap };
    
  } catch (error) {
    console.error('❌ Error seeding volunteer requests:', error);
    return { requests: [], claimToVolunteerMap: new Map() };
  }
}

async function seedVolunteerTimeTracking(deliveries, volunteers) {
  console.log('🌱 Seeding volunteer time tracking...\n');
  
  try {
    if (!deliveries || deliveries.length === 0 || !volunteers || volunteers.length === 0) {
      console.log('⚠️  No deliveries or volunteers available for time tracking.');
      return [];
    }
    
    const timeTrackingToInsert = [];
    const usedTrackingIds = new Set();
    
    // Create time tracking for ~50% of deliveries
    // Note: volunteer_time_tracking table requires volunteer_id (not null)
    const numTracking = Math.max(1, Math.floor(deliveries.length * 0.5));
    const selectedDeliveries = deliveries.slice(0, numTracking);
    
    for (const delivery of selectedDeliveries) {
      const volunteer = volunteers.find(v => v.id === delivery.volunteer_id);
      if (!volunteer) continue;
      
      let trackingId;
      do {
        trackingId = randomUUID();
      } while (usedTrackingIds.has(trackingId));
      usedTrackingIds.add(trackingId);
      
      const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (Math.random() * 2 + 0.5) * 60 * 60 * 1000); // 0.5-2.5 hours
      
      timeTrackingToInsert.push({
        id: trackingId,
        volunteer_id: volunteer.id,
        delivery_id: delivery.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_at: startTime.toISOString(),
        updated_at: endTime.toISOString()
      });
    }
    
    if (timeTrackingToInsert.length === 0) {
      console.log('⚠️  No volunteer time tracking to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('volunteer_time_tracking')
      .insert(timeTrackingToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding volunteer time tracking:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} volunteer time tracking records\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding volunteer time tracking:', error);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting comprehensive database seeding...\n');
  console.log('⚠️  This will delete and reseed all data!\n');
  
  try {
    await cleanupAll();
    await normalizeUsers();
    
    // Seed core data
    const donations = await seedDonations();
    // Seed additional CFC-GK direct donations
    const cfcgkDonations = await seedCFCGKDirectDonations();
    // Combine all donations
    const allDonations = [...(donations || []), ...(cfcgkDonations || [])];
    const requests = await seedRequests();
    const events = await seedEvents();
    
    // Get all users for related data
    const allUsers = await getAllUsers();
    const recipients = await getUsersByRole('recipient');
    let volunteers = await getUsersByRole('volunteer');
    
    // Find user with email cristanjade70@gmail.com and ensure they are included as a volunteer
    const targetEmail = 'cristanjade70@gmail.com';
    const targetUser = allUsers.find(user => user.email && user.email.toLowerCase() === targetEmail.toLowerCase());
    if (targetUser) {
      if (!volunteers.find(v => v.id === targetUser.id)) {
        // If user exists but is not a volunteer, add them to the volunteers list
        console.log(`✅ Found user with email ${targetEmail} (${targetUser.name || targetUser.email}), adding to volunteers list.`);
        volunteers.push(targetUser);
      } else {
        console.log(`✅ Found user with email ${targetEmail} (${targetUser.name || targetUser.email}) in volunteers list.`);
      }
      // Prioritize this volunteer by placing them first in the array
      volunteers = [targetUser, ...volunteers.filter(v => v.id !== targetUser.id)];
      console.log(`✅ Prioritized ${targetEmail} as primary volunteer for deliveries.`);
    } else {
      console.log(`⚠️  User with email ${targetEmail} not found. Using available volunteers.`);
    }
    
    // Find "Volunteer Deded" and ensure they are included as a volunteer
    const dededUser = allUsers.find(user => user.name && user.name.toLowerCase().includes('deded'));
    if (dededUser && !volunteers.find(v => v.id === dededUser.id)) {
      // If Deded exists but is not a volunteer, add them to the volunteers list
      console.log(`✅ Found "Volunteer Deded" (${dededUser.name}), adding to volunteers list.`);
      volunteers.push(dededUser);
    } else if (dededUser) {
      console.log(`✅ Found "Volunteer Deded" (${dededUser.name}) in volunteers list.`);
    } else {
      console.log(`⚠️  "Volunteer Deded" not found. Using available volunteers.`);
    }
    
    // Seed related data
    const claims = await seedDonationClaims(allDonations, recipients);
    const participants = await seedEventParticipants(events, allUsers);
    
    // IMPORTANT: Seed volunteer requests BEFORE deliveries
    // Deliveries should only be created for approved volunteer requests
    // This ensures deliveries appear in /my-deliveries page
    const volunteerRequestsResult = await seedVolunteerRequests(claims, volunteers, allDonations);
    const volunteerRequests = volunteerRequestsResult.requests || volunteerRequestsResult || [];
    const claimToVolunteerMap = volunteerRequestsResult.claimToVolunteerMap || new Map();
    
    // Create deliveries only for approved volunteer requests
    const deliveries = await seedDeliveries(claims, volunteers, allDonations, recipients, claimToVolunteerMap);
    const directDeliveries = await seedDirectDeliveries(claims, allDonations, recipients);
    const notifications = await seedNotifications(allUsers, allDonations, events, claims);
    const matchingParams = await seedMatchingParameters();
    const settings = await seedSettings();
    // Seed a small set of user reports for the admin moderation UI
    const seededReports = await seedSampleReports(allUsers);
    // Seed volunteer urgency preferences for proper urgency matching
    await seedVolunteerUrgencyPreferences(volunteers);
    
    // Seed additional tables
    const deliveryConfirmations = await seedDeliveryConfirmations(allDonations, deliveries);
    const feedbackRatings = await seedFeedbackRatings(allDonations, requests, allUsers);
    const performanceMetrics = await seedPerformanceMetrics(allUsers);
    // Note: user_preferences, user_reports, user_verifications, volunteer_ratings are now JSONB in user_profiles
    const volunteerTimeTracking = await seedVolunteerTimeTracking(deliveries, volunteers);

    await diversifyDonationStatuses(allDonations, claims, deliveries, directDeliveries);
    await diversifyRequestStatuses(requests);
    await diversifyEventStatuses(events);
    
    console.log('✅ All done! Database fully seeded.\n');
    console.log('📊 Summary:');
    console.log(`  - Regular Donations (to recipients): ${donations?.length || 0} with matching images`);
    console.log(`  - CFC-GK Direct Donations (to organization): ${cfcgkDonations?.length || 0}`);
    console.log(`    • Total Donations: ${allDonations?.length || 0}`);
    console.log(`    • Claims added as JSONB: ${claims?.length || 0}`);
    console.log(`    • Confirmations added as JSONB: in ${deliveryConfirmations?.length || 0} donations`);
    console.log(`  - Requests: ${requests?.length || 0} with matching images`);
    console.log(`  - Events: ${events?.length || 0} with matching images`);
    console.log(`    • Participants added as JSONB: ${participants?.length || 0}`);
    console.log(`  - Volunteer Deliveries: ${deliveries?.length || 0} (with various statuses)`);
    console.log(`  - Direct Deliveries: ${directDeliveries?.length || 0} (with various statuses)`);
    console.log(`  - Notifications: ${notifications?.length || 0}`);
    console.log(`  - Matching Parameters: ${matchingParams ? 'Created' : 'Skipped'}`);
    console.log(`  - System Settings: ${settings ? 'Created' : 'Skipped'}`);
    console.log(`  - Feedback: ${feedbackRatings?.length || 0}`);
    console.log(`  - Performance Metrics: ${performanceMetrics?.length || 0}`);
    console.log(`  - Volunteer Requests: ${volunteerRequests?.length || 0}`);
    console.log(`  - Volunteer Time Tracking: ${volunteerTimeTracking?.length || 0}`);
    console.log(`  - User Reports (JSONB): ${seededReports?.length || 0}`);
    console.log(`\n  Note: All data is stored in database. User preferences, reports, verifications stored in user_profiles JSONB\n`);
    
    console.log('  Status breakdowns:');
    logStatusBreakdown('Donations by status', donations);
    logStatusBreakdown('Donations by delivery mode', donations, 'delivery_mode');
    logStatusBreakdown('Requests by status', requests);
    const combinedDeliveries = [...(deliveries || []), ...(directDeliveries || [])];
    logStatusBreakdown('Deliveries by status', combinedDeliveries);
    logStatusBreakdown('Events by status', events);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

