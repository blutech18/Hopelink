#!/usr/bin/env node
/**
 * Seed script for HopeLink sample data.
 *
 * Creates at least 10 donations, 10 recipient requests, and 10 admin events
 * tied to the provided donor, recipient, and admin accounts.
 *
 * Usage:
 *   node scripts/seed_sample_data.js
 *   node scripts/seed_sample_data.js --dry-run
 *   node scripts/seed_sample_data.js --batch=QA-DEMO
 *   node scripts/seed_sample_data.js --no-purge
 *
 * Environment (from .env):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY)
 *   Optional overrides:
 *     SEED_DONOR_EMAIL
 *     SEED_RECIPIENT_EMAIL
 *     SEED_ADMIN_EMAIL
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env') })

const dayMs = 24 * 60 * 60 * 1000
const now = Date.now()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const skipPurge = args.includes('--no-purge')
const batchArg = args.find((arg) => arg.startsWith('--batch='))
const batchNameRaw = batchArg ? batchArg.split('=')[1] : new Date().toISOString().split('T')[0]
const batchName = batchNameRaw
  .replace(/[^a-z0-9-]/gi, '-')
  .replace(/-+/g, '-')
  .substring(0, 32)
  .toUpperCase()

const seedMarkerTag = `seed-batch-${batchName.toLowerCase()}`

const defaultAccounts = {
  donor: process.env.SEED_DONOR_EMAIL || 'cjjumawan43925@liceo.edu.ph',
  recipient: process.env.SEED_RECIPIENT_EMAIL || 'cristanjade14@gmail.com',
  admin: process.env.SEED_ADMIN_EMAIL || 'blutech18@gmail.com'
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const categoryImageMap = {
  Food: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?auto=format&fit=crop&w=1200&q=80',
  'Food & Beverages': 'https://images.unsplash.com/photo-1504484656217-38f8ffc617f7?auto=format&fit=crop&w=1200&q=80',
  'Educational Materials': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
  'Medical Supplies': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  'Personal Care Items': 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1200&q=80',
  'Clothing & Accessories': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
  'Electronics & Technology': 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80',
  'Household Items': 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
  'Emergency Supplies': 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80',
  Electronics: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
  default: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80'
}

const pickupLocationsPool = [
  {
    address: 'Nazareth Gymnasium, 14th Street, Nazareth, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Gate 2, ring the bell and wait for the volunteer desk.'
  },
  {
    address: 'Pueblo de Oro Business Park, Masterson Avenue, Upper Balulang, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Proceed to Building B concierge; present valid ID for access.'
  },
  {
    address: 'SM City Cagayan de Oro Loading Bay, Masterson Avenue, Upper Carmen, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Text 0917-111-2233 before arrival; use Dock 3 for drop-offs.'
  },
  {
    address: 'Balulang Barangay Hall Annex, Tomas Saco Street Extension, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Deliver to logistics room beside the MDRRMO satellite office.'
  },
  {
    address: 'Kauswagan Riverside Warehouse, Kauswagan Highway, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Coordinate with the guard post; forklift available on request.'
  },
  {
    address: 'St. Augustine Parish Convent, Velez Street, Barangay Carmen, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Blue gate #24, contact office staff for receiving logbook.'
  },
  {
    address: 'Agusan Public Market, Sayre Highway, Barangay Agusan, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Meet at Stall 7 near the admin office between 9 AM - 4 PM.'
  },
  {
    address: 'One Oasis CDO Main Gate, Rosario Strip, C.M. Recto Avenue, Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    instructions: 'Request visitor pass from Gate 2 and proceed to Tower 1 lobby.'
  }
]

const organizationDonationBlueprints = [
  {
    title: 'Medical First-Aid Sets',
    description: 'Fully stocked trauma and primary care kits prepared for barangay health stations.',
    category: 'Medical Supplies',
    quantity: 48,
    condition: 'new',
    pickup_location: 'Balay Mindanaw Warehouse, National Highway, Barangay Tablon, Cagayan de Oro City, Misamis Oriental, Philippines',
    pickup_instructions: 'Deliver straight to receiving bay 2; bring gate pass for logging.',
    is_urgent: true,
    tags: ['medical', 'preparedness', 'cdo-health'],
    image: categoryImageMap['Medical Supplies']
  },
  {
    title: 'Hygiene Care Buckets',
    description: 'Complete hygiene kits with soap, detergent, shampoo, toothbrushes, and sanitary pads.',
    category: 'Personal Care Items',
    quantity: 60,
    condition: 'new',
    pickup_location: 'Barangay Gusa Covered Court, J. Roa Street, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines',
    pickup_instructions: 'Look for the HopeLink booth beside the stage; log items before drop-off.',
    is_urgent: false,
    tags: ['hygiene', 'women', 'public-health'],
    image: categoryImageMap['Personal Care Items']
  },
  {
    title: 'Emergency Shelter Tarps',
    description: 'Heavy-duty tarpaulins with ropes, bundled for rapid shelter deployment after storms.',
    category: 'Emergency Supplies',
    quantity: 30,
    condition: 'new',
    pickup_location: 'PNR Compound Logistics Yard, Kauswagan Highway, Barangay Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    pickup_instructions: 'Forklift access required; coordinate with guard post for scheduling.',
    is_urgent: true,
    tags: ['shelter', 'disaster-response', 'cdo'],
    image: categoryImageMap['Emergency Supplies']
  }
]

const communitySites = [
  {
    name: 'Barangay 17 Evacuation Center',
    barangay: 'Barangay 17',
    location: 'Barangay 17 Evacuation Center, Velez Street, Barangay 17, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Currently accommodating 23 families displaced by the recent river flooding.',
    defaultDelivery: 'volunteer',
    barangayTag: 'brgy17',
    focusTag: 'evacuation'
  },
  {
    name: 'Kauswagan Youth Development Hub',
    barangay: 'Barangay Kauswagan',
    location: 'Kauswagan Youth Development Hub, Kauswagan Highway, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Hosts mentoring sessions for ALS learners and youth volunteers from nearby barangays.',
    defaultDelivery: 'pickup',
    barangayTag: 'kauswagan',
    focusTag: 'youth'
  },
  {
    name: 'Gonzalo Roque Elderly Home',
    barangay: 'Barangay Lapasan',
    location: 'Gonzalo Roque Elderly Home, J.R. Borja Extension, Barangay Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Provides permanent shelter and care to 35 senior residents requiring mobility assistance.',
    defaultDelivery: 'direct',
    barangayTag: 'lapasan',
    focusTag: 'senior'
  },
  {
    name: 'Barangay 7 Daycare Complex',
    barangay: 'Barangay 7',
    location: 'Barangay 7 Daycare Center, Pinikitan Street, Barangay 7, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Runs weekday daycare for low-income families and doubles as an emergency feeding site.',
    defaultDelivery: 'pickup',
    barangayTag: 'brgy7',
    focusTag: 'child-care'
  },
  {
    name: 'ALS Hub - Barangay 40',
    barangay: 'Barangay 40',
    location: 'ALS Hub, 6th Division Road, Barangay 40, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Alternative Learning System facilitators conduct tests and remedial sessions weekly.',
    defaultDelivery: 'volunteer',
    barangayTag: 'als-hub',
    focusTag: 'education'
  },
  {
    name: 'CSWD Staging Area Macabalan Port',
    barangay: 'Barangay Macabalan',
    location: 'CSWD Staging Area, Macabalan Port Road, Barangay Macabalan, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Serves as the logistics hub for relief dispatch to coastal barangays and island sitios.',
    defaultDelivery: 'direct',
    barangayTag: 'macabalan',
    focusTag: 'relief'
  },
  {
    name: 'Canitoan Multipurpose Hall',
    barangay: 'Barangay Canitoan',
    location: 'Canitoan Multipurpose Hall, Puerto Road, Barangay Canitoan, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Venue for community assemblies, feeding drives, and emergency sheltering during storms.',
    defaultDelivery: 'pickup',
    barangayTag: 'canitoan',
    focusTag: 'community'
  },
  {
    name: 'CDO ICT Innovation Hub',
    barangay: 'Barangay Lapasan',
    location: 'CDO ICT Innovation Hub, C.M. Recto Avenue, Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Hosts digital livelihood bootcamps and upskilling programs for out-of-school youth.',
    defaultDelivery: 'volunteer',
    barangayTag: 'ict-hub',
    focusTag: 'digital'
  },
  {
    name: 'Umalag Elementary School Gym',
    barangay: 'Barangay Umalag',
    location: 'Umalag Elementary School Gym, Umalag Road, Barangay Umalag, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Currently used as a temporary shelter for upland residents affected by landslides.',
    defaultDelivery: 'pickup',
    barangayTag: 'umalag',
    focusTag: 'shelter'
  },
  {
    name: 'FS Catanico Demo Farm',
    barangay: 'Barangay FS Catanico',
    location: 'FS Catanico Demo Farm, Claveria Road, Barangay FS Catanico, Cagayan de Oro City, Misamis Oriental, Philippines',
    context: 'Agricultural demo site supporting farmer cooperatives rebuilding after drought.',
    defaultDelivery: 'direct',
    barangayTag: 'fs-catanico',
    focusTag: 'agriculture'
  }
]

const requestNeedsBlueprints = [
  {
    baseTitle: 'Rice and canned goods for evacuation families',
    category: 'Food',
    minQty: 60,
    maxQty: 90,
    urgency: 'high',
    deliveryMode: 'volunteer',
    neededInDays: 5,
    tags: ['evacuation', 'food-security'],
    description: 'Need ready-to-eat items for evacuees while kitchens remain limited.'
  },
  {
    baseTitle: 'College review materials for scholars',
    category: 'Educational Materials',
    minQty: 20,
    maxQty: 35,
    urgency: 'medium',
    deliveryMode: 'pickup',
    neededInDays: 12,
    tags: ['education', 'scholars'],
    description: 'Study guides and highlighters help keep scholars on track for entrance exams.'
  },
  {
    baseTitle: 'Wheelchairs for senior residents',
    category: 'Medical Supplies',
    minQty: 4,
    maxQty: 8,
    urgency: 'critical',
    deliveryMode: 'direct',
    neededInDays: 3,
    tags: ['mobility', 'seniors'],
    description: 'Fire damage destroyed existing mobility aids; seniors now need replacements.'
  },
  {
    baseTitle: 'Reusable diapers for community nursery',
    category: 'Personal Care Items',
    minQty: 30,
    maxQty: 60,
    urgency: 'high',
    deliveryMode: 'pickup',
    neededInDays: 7,
    tags: ['child-care', 'nursery'],
    description: 'Reusable diapers lower supply expenses for daycare parents affected by layoffs.'
  },
  {
    baseTitle: 'Whiteboards and markers for ALS class',
    category: 'Educational Materials',
    minQty: 8,
    maxQty: 15,
    urgency: 'medium',
    deliveryMode: 'volunteer',
    neededInDays: 10,
    tags: ['ALS', 'education'],
    description: 'Facilitators need fresh boards and markers to run learning reviews each week.'
  },
  {
    baseTitle: 'Drinking water gallons for relief workers',
    category: 'Emergency Supplies',
    minQty: 25,
    maxQty: 40,
    urgency: 'high',
    deliveryMode: 'direct',
    neededInDays: 4,
    tags: ['hydration', 'volunteers'],
    description: 'Tanker deliveries remain delayed, so volunteers rely on donated water refills.'
  },
  {
    baseTitle: 'Monoblock chairs for multipurpose hall',
    category: 'Household Items',
    minQty: 60,
    maxQty: 120,
    urgency: 'medium',
    deliveryMode: 'pickup',
    neededInDays: 20,
    tags: ['community', 'infrastructure'],
    description: 'Extra seats needed for simultaneous feeding sessions and consultations.'
  },
  {
    baseTitle: 'Smartphones for digital livelihood training',
    category: 'Electronics',
    minQty: 12,
    maxQty: 20,
    urgency: 'low',
    deliveryMode: 'volunteer',
    neededInDays: 25,
    tags: ['digital', 'livelihood'],
    description: 'Participants need basic Android devices to complete app-based course modules.'
  },
  {
    baseTitle: 'Bed sheets for temporary shelters',
    category: 'Household Items',
    minQty: 40,
    maxQty: 70,
    urgency: 'high',
    deliveryMode: 'pickup',
    neededInDays: 6,
    tags: ['shelter', 'bedding'],
    description: 'Fresh linens keep evacuee sleeping areas sanitary while families remain displaced.'
  },
  {
    baseTitle: 'Seedlings for upland farmers',
    category: 'Other',
    minQty: 150,
    maxQty: 250,
    urgency: 'low',
    deliveryMode: 'direct',
    neededInDays: 30,
    tags: ['agriculture', 'livelihood'],
    description: 'Farmer co-ops aim to restart communal gardens with hardy vegetable seedlings.'
  }
]

const deterministicQuantity = (min, max, idx) => {
  if (!max || max <= min) return min
  const span = max - min
  const steps = Math.min(4, span)
  const increment = Math.max(1, Math.floor(span / steps))
  const raw = min + increment * (idx % (steps + 1))
  return Math.min(max, raw)
}

function buildRequestTemplates() {
  return requestNeedsBlueprints.map((need, idx) => {
    const site = communitySites[idx % communitySites.length]
    const quantity = deterministicQuantity(need.minQty, need.maxQty, idx)
    const neededInDays = need.neededInDays + (idx % 2)
    const deliveryMode = need.deliveryMode || site.defaultDelivery || 'pickup'
    const tags = Array.from(new Set([
      ...(need.tags || []),
      site.barangayTag,
      site.focusTag
    ].filter(Boolean)))

    return {
      title: `${need.baseTitle} - ${site.barangay}`,
      category: need.category,
      quantity_needed: quantity,
      urgency: need.urgency,
      location: site.location,
      neededInDays,
      delivery_mode: deliveryMode,
      tags,
      description: `${site.context} ${need.description}`,
      image: categoryImageMap[need.category] || categoryImageMap.default
    }
  })
}

const requestTemplates = buildRequestTemplates()

function buildDonationTemplates() {
  const recipientDonations = requestTemplates.map((request, idx) => {
    const pickupInfo = pickupLocationsPool[idx % pickupLocationsPool.length]
    const locationName = request.location.split(',')[0]?.trim() || request.location
    const quantity = Math.max(1, Math.round(request.quantity_needed * 0.6))
    const conditionOptions = ['new', 'like_new', 'good']
    const condition = conditionOptions[idx % conditionOptions.length]
    const tags = Array.from(new Set([...(request.tags || []), request.urgency, 'community-response'].filter(Boolean)))

    return {
      title: `${locationName} ${request.category} Support`,
      description: `Responding to the community request "${request.title}" originating from ${request.location}. ${request.description}`,
      category: request.category === 'Other' ? 'Household Items' : request.category,
      quantity,
      condition,
      destination: 'recipients',
      pickup_location: pickupInfo.address,
      pickup_instructions: pickupInfo.instructions,
      is_urgent: ['critical', 'high'].includes(request.urgency),
      tags,
      image: categoryImageMap[request.category] || categoryImageMap.default,
      expiry_offset_days: 10 + idx
    }
  })

  const organizationDonations = organizationDonationBlueprints.map((item, idx) => ({
    ...item,
    destination: 'organization',
    expiry_offset_days: 25 + idx
  }))

  return [
    ...recipientDonations.slice(0, 7),
    ...organizationDonations.slice(0, 3)
  ]
}

const donationTemplates = buildDonationTemplates()

const eventTemplates = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Barangay Meal Distribution',
    event_type: 'Food Distribution',
    description: 'Coordinate hot meal packs for 300 evacuees with staggered serving windows.',
    location: 'Barangay 21 Gym, Tomas Saco Street, Nazareth, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 45,
    donation_items: [
      { name: 'Cooked meal packs', category: 'Food & Beverages', quantity: 300, description: 'Rice + viand combo', collected_quantity: 0 },
      { name: 'Water gallons', category: 'Emergency Supplies', quantity: 25, description: 'Refillable 5-gallon', collected_quantity: 0 }
    ],
    requirements: ['Bring hairnet and apron', 'Attend pre-shift briefing'],
    what_to_bring: ['Reusable water bottle', 'Face towel'],
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Coastal Cleanup Drive',
    event_type: 'Community Cleanup',
    description: 'Monthly cleanup along Macajalar Bay focusing on plastics and fishing debris.',
    location: 'Bayabas Shoreline Park, Coastal Road, Barangay Bayabas, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 80,
    donation_items: [
      { name: 'Garbage sacks', category: 'Household Items', quantity: 200, description: 'Heavy-duty sacks', collected_quantity: 0 },
      { name: 'Work gloves', category: 'Personal Care Items', quantity: 100, description: 'Reusable gloves', collected_quantity: 0 }
    ],
    requirements: ['Wear closed shoes', 'Sign waiver'],
    what_to_bring: ['Sunblock', 'Cap'],
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Medical Screening Caravan',
    event_type: 'Medical Mission',
    description: 'Conduct basic health screening, BP monitoring, and distribute maintenance meds.',
    location: 'Kauswagan Covered Court, Kauswagan Highway, Barangay Kauswagan, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 35,
    donation_items: [
      { name: 'Maintenance medicines', category: 'Medical Supplies', quantity: 150, description: 'Hypertension and diabetes meds', collected_quantity: 0 },
      { name: 'Vitamin packs', category: 'Medical Supplies', quantity: 200, description: 'Multivitamins for adults', collected_quantity: 0 }
    ],
    requirements: ['Licensed medical volunteers prioritized', 'Bring own stethoscope if possible'],
    what_to_bring: ['Clipboard', 'Extra mask'],
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    name: 'Literacy Bootcamp',
    event_type: 'Educational Program',
    description: 'Weekend reading program for 60 early graders with parent sessions.',
    location: 'City Central School Library, Velez Street, Barangay 1, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 30,
    donation_items: [
      { name: 'Story books', category: 'Educational Materials', quantity: 120, description: 'English & Filipino titles', collected_quantity: 0 },
      { name: 'Snacks for kids', category: 'Food & Beverages', quantity: 60, description: 'Healthy biscuits and milk', collected_quantity: 0 }
    ],
    requirements: ['Complete volunteer orientation', 'Submit ID photocopy'],
    what_to_bring: ['Markers', 'Foldable fan'],
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    name: 'Shelter Repair Blitz',
    event_type: 'Emergency Relief',
    description: 'Two-day minor shelter repair for 15 households affected by strong winds.',
    location: 'Sitio Calaanan Covered Court, Calaanan Road, Barangay Canitoan, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 50,
    donation_items: [
      { name: 'Roofing sheets', category: 'Emergency Supplies', quantity: 80, description: 'GI roofing materials', collected_quantity: 0 },
      { name: 'Construction nails', category: 'Emergency Supplies', quantity: 150, description: 'Assorted sizes', collected_quantity: 0 }
    ],
    requirements: ['Experience with carpentry preferred', 'Bring gloves and safety shoes'],
    what_to_bring: ['Measuring tape', 'Protective eyewear'],
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    name: 'Youth Coding Sprint',
    event_type: 'Volunteer Training',
    description: 'Intro-to-code mentoring for out-of-school youth using refurbished laptops.',
    location: 'CDO ICT Innovation Hub, Corrales Avenue Extension, Lapasan, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 25,
    donation_items: [
      { name: 'USB flash drives', category: 'Electronics & Technology', quantity: 40, description: '16GB up', collected_quantity: 0 },
      { name: 'Snacks and drinks', category: 'Food & Beverages', quantity: 80, description: 'Packed snacks', collected_quantity: 0 }
    ],
    requirements: ['Basic programming knowledge', 'Attend dry run'],
    what_to_bring: ['Laptop (if available)', 'Extension cord'],
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    name: 'Farmers’ Market Pop-Up',
    event_type: 'Fundraising',
    description: 'Give farmers direct selling access; proceeds fund irrigation pumps.',
    location: 'Ayala Malls Centrio Activity Center, Corrales Avenue, Barangay 24, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 60,
    donation_items: [
      { name: 'Eco bags', category: 'Household Items', quantity: 300, description: 'Reusable tote bags', collected_quantity: 0 },
      { name: 'Table rentals', category: 'Other', quantity: 20, description: 'Sponsor booth rentals', collected_quantity: 0 }
    ],
    requirements: ['Cooperate with mall guidelines', 'Attend walkthrough'],
    what_to_bring: ['ID', 'Own water bottle'],
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    name: 'Volunteer Appreciation Night',
    event_type: 'Awareness Campaign',
    description: 'Celebrate top volunteers, share impact stories, onboard new champions.',
    location: 'Xavier Estates Country Club, Masterson Avenue, Upper Balulang, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 120,
    donation_items: [
      { name: 'Token kits', category: 'Other', quantity: 120, description: 'Certificates + goodies', collected_quantity: 0 },
      { name: 'Catering sponsorship', category: 'Food & Beverages', quantity: 1, description: 'Dinner buffet for 120 pax', collected_quantity: 0 }
    ],
    requirements: ['Formal attire recommended'],
    what_to_bring: ['QR invite', 'Camera or phone'],
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-111111111109',
    name: 'Psychosocial Support Workshop',
    event_type: 'Volunteer Training',
    description: 'Equip barangay first responders with psychological first aid skills.',
    location: 'CDRRMD Training Center, Macasandig-Malaybalay Road, Barangay Macasandig, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 40,
    donation_items: [
      { name: 'Training manuals', category: 'Educational Materials', quantity: 50, description: 'Module printing', collected_quantity: 0 },
      { name: 'Refreshments', category: 'Food & Beverages', quantity: 40, description: 'Snacks + coffee', collected_quantity: 0 }
    ],
    requirements: ['Complete online pre-work', 'Bring government ID'],
    what_to_bring: ['Notebook', 'Pen'],
    image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: '11111111-1111-4111-8111-11111111110a',
    name: 'Community Sports Fest',
    event_type: 'Other',
    description: 'Promote wellness with mixed-age sports activities and health booths.',
    location: 'Balulang Covered Court, Tomas Saco Street Extension, Barangay Balulang, Cagayan de Oro City, Misamis Oriental, Philippines',
    max_participants: 150,
    donation_items: [
      { name: 'Sports equipment', category: 'Toys & Recreation', quantity: 50, description: 'Balls, nets, cones', collected_quantity: 0 },
      { name: 'Hydration station supplies', category: 'Emergency Supplies', quantity: 10, description: 'Water dispensers + cups', collected_quantity: 0 }
    ],
    requirements: ['Sign waiver', 'Wear sport attire'],
    what_to_bring: ['Extra shirt', 'Tumbler'],
    image: 'https://images.unsplash.com/photo-1432752641289-a25fc853fceb?auto=format&fit=crop&w=1400&q=80'
  }
]

const buildSchedule = () => ([
  { time: '07:30', activity: 'Volunteer check-in & briefing' },
  { time: '09:00', activity: 'Main activity rollout' },
  { time: '12:00', activity: 'Meal / hydration break' },
  { time: '15:00', activity: 'Debrief and wrap-up' }
])

const baseContactInfo = {
  coordinator: 'HopeLink Field Desk',
  phone: '0917-123-4567',
  email: 'events@hopelink.local'
}

const addDaysFromNow = (days, hour = 9) => {
  const date = new Date(now + days * dayMs)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const subtractHoursFromNow = (hours) => {
  const date = new Date(now - hours * 60 * 60 * 1000)
  return date.toISOString()
}

async function fetchUserByEmail(email, expectedRole) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .ilike('email', email)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to lookup user ${email}: ${error.message}`)
  }
  if (!data) {
    throw new Error(`User ${email} not found in Supabase`)
  }
  if (expectedRole && data.role !== expectedRole) {
    console.warn(`⚠️  User ${email} has role "${data.role}", expected "${expectedRole}". Proceeding anyway.`)
  }
  return data
}

async function getAllAdminUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'admin')

  if (error) {
    throw new Error(`Failed to fetch admin users: ${error.message}`)
  }
  return data || []
}

async function purgeSeedData() {
  if (dryRun) {
    console.log(`🧹 Dry-run: skipping purge for seed markers`)
    return
  }

  console.log(`🧹 Removing previous records tagged with legacy or marker tags`)

  const purgeOperations = [
    // Legacy title-based entries with [SEED-...] prefix
    supabase
      .from('donations')
      .delete({ count: 'exact' })
      .like('title', '[SEED-%'),
    supabase
      .from('donation_requests')
      .delete({ count: 'exact' })
      .like('title', '[SEED-%'),
    supabase
      .from('events')
      .delete({ count: 'exact' })
      .like('name', '[SEED-%'),
    // New marker-based cleanup
    supabase
      .from('donations')
      .delete({ count: 'exact' })
      .contains('tags', [seedMarkerTag]),
    supabase
      .from('donation_requests')
      .delete({ count: 'exact' })
      .contains('tags', [seedMarkerTag]),
    supabase
      .from('events')
      .delete({ count: 'exact' })
      .contains('contact_info', { batch_tag: seedMarkerTag })
  ]

  for (const op of purgeOperations) {
    const { error } = await op
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed during purge operation: ${error.message}`)
    }
  }

  // Also delete events by their known IDs (in case they exist from previous runs)
  console.log('   • Purging events by known IDs...')
  const eventIds = eventTemplates.map(t => t.id)
  if (eventIds.length > 0) {
    const { error: eventDeleteError } = await supabase
      .from('events')
      .delete()
      .in('id', eventIds)
    
    if (eventDeleteError && eventDeleteError.code !== 'PGRST116') {
      console.warn(`⚠️  Warning: Could not delete events by ID: ${eventDeleteError.message}`)
    }
  }

  // Purge all notifications separately (clear all to start fresh)
  console.log('   • Purging all notifications...')
  try {
    // Get all notification IDs first, then delete in batches if needed
    const { data: allNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id')
      .limit(10000) // Reasonable limit
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn(`⚠️  Warning: Could not fetch notifications for purge: ${fetchError.message}`)
    } else if (allNotifications && allNotifications.length > 0) {
      // Delete in batches to avoid timeout
      const batchSize = 1000
      for (let i = 0; i < allNotifications.length; i += batchSize) {
        const batch = allNotifications.slice(i, i + batchSize)
        const ids = batch.map(n => n.id)
        
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .in('id', ids)
        
        if (deleteError && deleteError.code !== 'PGRST116') {
          console.warn(`⚠️  Warning: Could not delete notification batch ${i / batchSize + 1}: ${deleteError.message}`)
        }
      }
      console.log(`   • Deleted ${allNotifications.length} notification(s)`)
    } else {
      console.log('   • No notifications to delete')
    }
  } catch (notifErr) {
    console.warn(`⚠️  Warning: Notification purge encountered an error: ${notifErr.message}`)
    // Continue anyway - notifications will be created fresh
  }

  console.log('   • Purge completed (including all notifications)')
}

function buildDonationsPayload(donorId) {
  const recipientModes = ['pickup', 'volunteer', 'direct']
  const organizationModes = ['donor_delivery', 'volunteer', 'organization_pickup']
  let recipientModeIndex = 0
  let organizationModeIndex = 0

  return donationTemplates.map((template, index) => ({
    donor_id: donorId,
    title: template.title,
    description: template.description,
    category: template.category,
    quantity: template.quantity,
    condition: template.condition,
    donation_destination: template.destination,
    delivery_mode: template.destination === 'organization'
      ? organizationModes[organizationModeIndex++ % organizationModes.length]
      : recipientModes[recipientModeIndex++ % recipientModes.length],
    pickup_location: template.pickup_location,
    pickup_instructions: template.pickup_instructions,
    is_urgent: template.is_urgent,
    tags: [...template.tags, seedMarkerTag],
    images: [template.image],
    status: 'available',
    expiry_date: addDaysFromNow(template.expiry_offset_days ?? 30),
    created_at: subtractHoursFromNow((index + 1) * 3),
    updated_at: new Date().toISOString()
  }))
}

function buildRequestsPayload(recipientId) {
  return requestTemplates.map((template, index) => ({
    requester_id: recipientId,
    title: template.title,
    description: template.description,
    category: template.category,
    quantity_needed: template.quantity_needed,
    urgency: template.urgency,
    location: template.location,
    needed_by: addDaysFromNow(template.neededInDays, 16),
    delivery_mode: template.delivery_mode,
    tags: [...template.tags, seedMarkerTag],
    sample_image: template.image,
    status: 'open',
    created_at: subtractHoursFromNow((index + 1) * 2),
    updated_at: new Date().toISOString()
  }))
}

function buildEventsPayload(adminId) {
  return eventTemplates.map((template, index) => {
    const start = addDaysFromNow(5 + index * 2, 8 + (index % 3))
    const endDate = new Date(start)
    endDate.setHours(endDate.getHours() + 6)

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      location: template.location,
      start_date: start,
      end_date: endDate.toISOString(),
      max_participants: template.max_participants,
      target_goal: template.event_type,
      status: 'upcoming',
      image_url: template.image,
      items: template.donation_items,
      schedule: buildSchedule(),
      requirements: template.requirements,
      what_to_bring: template.what_to_bring,
      contact_info: { ...baseContactInfo, batch_tag: seedMarkerTag },
      created_by: adminId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })
}

async function insertWithPreview(table, payload, selectFields = 'id') {
  if (dryRun) {
    console.log(`📝 Dry-run for ${table}: would insert ${payload.length} record(s). Sample:`)
    console.dir(payload[0], { depth: 2 })
    return []
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select(selectFields)

  if (error) {
    throw new Error(`Failed to insert into ${table}: ${error.message}`)
  }
  return data || []
}

function buildNotificationsPayload(donations, requests, events, donor, recipient, admin) {
  const notifications = []
  
  const donorName = donor.name || donor.email || 'A donor'
  const requesterName = recipient.name || recipient.email || 'A recipient'
  const creatorName = admin.name || admin.email || 'An admin'
  
  // Notifications for donations
  donations.forEach((donation) => {
    // Note: donation object from insertWithPreview only has: id, title, donor_id, category, donation_destination
    // We need to infer quantity from the original payload or use a default
    const notificationType = donation.donation_destination === 'organization' 
      ? 'new_cfc_donation' 
      : 'new_donation'
    const title = donation.donation_destination === 'organization'
      ? 'New Direct Donation to CFC-GK'
      : 'New Donation Posted'
    const message = donation.donation_destination === 'organization'
      ? `${donorName} donated ${donation.category} directly to the organization`
      : `${donorName} posted ${donation.category} for recipients`
    
    // Store notification data with seed marker
    notifications.push({
      type: 'system_alert',
      title,
      message,
      data: {
        donation_id: donation.id,
        donor_id: donation.donor_id || donor.id,
        donor_name: donorName,
        title: donation.title,
        category: donation.category,
        link: donation.donation_destination === 'organization' ? '/admin/cfc-donations' : '/admin/donations',
        notification_type: notificationType,
        seed_batch: seedMarkerTag
      }
    })
  })
  
  // Notifications for requests
  requests.forEach((request) => {
    // Note: request object from insertWithPreview only has: id, title, requester_id, category, urgency, quantity_needed
    notifications.push({
      type: 'system_alert',
      title: 'New Donation Request',
      message: `${requesterName} created a ${request.urgency} priority request for ${request.category}`,
      data: {
        request_id: request.id,
        requester_id: request.requester_id || recipient.id,
        requester_name: requesterName,
        title: request.title,
        category: request.category,
        urgency: request.urgency,
        quantity_needed: request.quantity_needed,
        link: '/admin/requests',
        notification_type: 'new_request',
        seed_batch: seedMarkerTag
      }
    })
  })
  
  // Notifications for events
  events.forEach((event) => {
    // Note: event object from insertWithPreview only has: id, name, created_by
    notifications.push({
      type: 'event_created',
      title: 'New Event Created',
      message: `A new event "${event.name}" has been created`,
      data: {
        event_id: event.id,
        event_name: event.name,
        creator_id: event.created_by || admin.id,
        creator_name: creatorName,
        seed_batch: seedMarkerTag
      }
    })
  })
  
  return notifications
}

async function insertNotifications(notifications, adminUsers) {
  if (dryRun) {
    console.log(`📝 Dry-run for notifications: would create ${notifications.length} notification template(s) for ${adminUsers.length} admin(s)`)
    if (notifications.length > 0) {
      console.log('   Sample notification:')
      console.dir(notifications[0], { depth: 2 })
    }
    return []
  }

  if (adminUsers.length === 0) {
    console.warn('⚠️  No admin users found, skipping notification creation')
    return []
  }

  // Create a notification for each admin for each notification template
  const notificationsToInsert = []
  notifications.forEach((notificationTemplate) => {
    adminUsers.forEach((admin) => {
      // Skip self-notification for events created by admin
      if (notificationTemplate.type === 'event_created' && 
          notificationTemplate.data?.creator_id === admin.id) {
        return
      }
      
      notificationsToInsert.push({
        user_id: admin.id,
        type: notificationTemplate.type,
        title: notificationTemplate.title,
        message: notificationTemplate.message,
        data: notificationTemplate.data,
        read_at: null,
        created_at: subtractHoursFromNow(Math.floor(Math.random() * 48)) // Random time within last 48 hours
      })
    })
  })

  if (notificationsToInsert.length === 0) {
    console.log('   • No notifications to insert (all filtered out)')
    return []
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationsToInsert)
    .select('id')

  if (error) {
    throw new Error(`Failed to insert notifications: ${error.message}`)
  }
  
  return data || []
}

async function main() {
  try {
    console.log(`🚀 HopeLink seed script starting (batch marker ${seedMarkerTag})`)
    console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`)

    const [donor, recipient, admin] = await Promise.all([
      fetchUserByEmail(defaultAccounts.donor, 'donor'),
      fetchUserByEmail(defaultAccounts.recipient, 'recipient'),
      fetchUserByEmail(defaultAccounts.admin, 'admin')
    ])

    console.log(`👤 Donor: ${donor.name || donor.email} (${donor.id})`)
    console.log(`👤 Recipient: ${recipient.name || recipient.email} (${recipient.id})`)
    console.log(`👤 Admin: ${admin.name || admin.email} (${admin.id})`)

    if (dryRun) {
      console.log('ℹ️  Dry run enabled: skipping purge and inserts.')
    } else if (skipPurge) {
      console.log('⚠️  Skipping purge due to --no-purge flag (existing seed data may remain).')
    } else {
      await purgeSeedData()
    }

    const donationsPayload = buildDonationsPayload(donor.id)
    const requestsPayload = buildRequestsPayload(recipient.id)
    const eventsPayload = buildEventsPayload(admin.id)

    const donations = dryRun ? [] : await insertWithPreview('donations', donationsPayload, 'id,title,donor_id,category,donation_destination')
    const requests = dryRun ? [] : await insertWithPreview('donation_requests', requestsPayload, 'id,title,requester_id,category,urgency,quantity_needed')
    const events = dryRun ? [] : await insertWithPreview('events', eventsPayload, 'id,name,created_by')

    if (!dryRun) {
      console.log(`✅ Inserted ${donations.length} donations`)
      console.log(`✅ Inserted ${requests.length} requests`)
      console.log(`✅ Inserted ${events.length} events`)
    } else {
      console.log('✅ Dry run complete (no records inserted)')
    }

    // Create notifications based on inserted data
    if (!dryRun && (donations.length > 0 || requests.length > 0 || events.length > 0)) {
      console.log('\n📬 Creating notifications...')
      const adminUsers = await getAllAdminUsers()
      console.log(`   Found ${adminUsers.length} admin user(s)`)
      
      const notificationTemplates = buildNotificationsPayload(
        donations,
        requests,
        events,
        donor,
        recipient,
        admin
      )
      
      const insertedNotifications = await insertNotifications(notificationTemplates, adminUsers)
      console.log(`✅ Created ${insertedNotifications.length} notification(s)`)
    } else if (dryRun) {
      console.log('\n📬 Dry-run: would create notifications for:')
      console.log(`   - ${donationsPayload.length} donation(s)`)
      console.log(`   - ${requestsPayload.length} request(s)`)
      console.log(`   - ${eventsPayload.length} event(s)`)
    }

    console.log('\nNext steps:')
    console.log(' - Launch http://localhost:3000/post-donation to verify donor data')
    console.log(' - Visit http://localhost:3000/create-request as the recipient to confirm requests')
    console.log(' - Check http://localhost:3000/admin/events with the admin account to review events')
    console.log('\n✨ Done!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seed script failed:', err.message)
    process.exit(1)
  }
}

main()

