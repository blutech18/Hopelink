import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    await supabase.from('event_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted event_participants');
    
    await supabase.from('deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted deliveries');
    
    await supabase.from('direct_deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted direct_deliveries');
    
    await supabase.from('volunteer_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted volunteer_requests');
    
    await supabase.from('donation_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted donation_claims');
    
    await supabase.from('event_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted event_items');
    
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted events');
    
    await supabase.from('donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted donations');
    
    await supabase.from('donation_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted donation_requests');
    
    // Delete old notifications to reseed with new format
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted notifications');
    
    // Clean up additional tables
    await supabase.from('delivery_confirmations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted delivery_confirmations');
    
    await supabase.from('feedback_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted feedback_ratings');
    
    await supabase.from('performance_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted performance_metrics');
    
    await supabase.from('user_preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted user_preferences');
    
    await supabase.from('user_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted user_reports');
    
    await supabase.from('user_verifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted user_verifications');
    
    await supabase.from('volunteer_ratings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted volunteer_ratings');
    
    await supabase.from('volunteer_time_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Deleted volunteer_time_tracking');
    
    console.log('✅ Cleanup completed!\n');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function getUsersByRole(role) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone_number, city, province, address, address_barangay, address_house, address_street, address_subdivision, address_landmark')
    .eq('role', role)
    .limit(20);
  
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
const requestTemplates = [
  {
    title: 'Urgent Need: Food Supplies',
    description: 'Our family is in urgent need of food supplies. Any help would be greatly appreciated.',
    category: 'Food Items',
    urgency: 'high',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
  },
  {
    title: 'School Supplies for Children',
    description: 'Need school supplies for my three children who are starting school next month.',
    category: 'School Supplies',
    urgency: 'medium',
    quantity: 3,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800'
  },
  {
    title: 'Baby Items Needed',
    description: 'Expecting a baby soon and need essential baby items.',
    category: 'Baby Items',
    urgency: 'high',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800'
  },
  {
    title: 'Clothing for Family',
    description: 'Looking for clothing donations for a family of five.',
    category: 'Clothing',
    urgency: 'medium',
    quantity: 5,
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800'
  },
  {
    title: 'Medical Supplies Request',
    description: 'Need basic medical supplies for elderly family member.',
    category: 'Medical Supplies',
    urgency: 'critical',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800'
  },
  {
    title: 'Books for Learning',
    description: 'Seeking educational books for children\'s learning.',
    category: 'Books',
    urgency: 'low',
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
  },
  {
    title: 'Household Items',
    description: 'Starting a new home and need basic household items.',
    category: 'Household Items',
    urgency: 'medium',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'
  },
  {
    title: 'Furniture Needed',
    description: 'Need furniture for our new home. Any furniture in good condition would help.',
    category: 'Furniture',
    urgency: 'low',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'
  },
  {
    title: 'Emergency Food Assistance',
    description: 'Lost job recently and need immediate food assistance for my family.',
    category: 'Food Items',
    urgency: 'critical',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800'
  },
  {
    title: 'Children\'s Toys Request',
    description: 'Looking for toys for my children\'s birthday celebration.',
    category: 'Toys',
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
    const donors = await getUsersByRole('donor');
    
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
    
    for (let i = 0; i < numDonations; i++) {
      const template = donationTemplates[i];
      const donor = donors[Math.floor(Math.random() * donors.length)];
      // Use distribution array to ensure more volunteer-mode donations (cycles through the distribution)
      const deliveryMode = deliveryModeDistribution[i % deliveryModeDistribution.length];
      
      // Generate unique ID
      let donationId;
      do {
        donationId = randomUUID();
      } while (usedDonationIds.has(donationId));
      usedDonationIds.add(donationId);
      
      // Format donor address properly for pickup location
      const donorAddress = formatAddress(donor) || `${donor.address || ''}, ${donor.city || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Address TBD';
      
      const donation = {
        id: donationId,
        donor_id: donor.id,
        title: template.title,
        description: template.description,
        category: template.category,
        quantity: template.quantity + Math.floor(Math.random() * 3),
        condition: template.condition,
        pickup_location: donorAddress,
        pickup_instructions: 'Please contact me before pickup. Available weekdays 9 AM - 5 PM.',
        status: 'available',
        delivery_mode: deliveryMode,
        donation_destination: deliveryMode === 'direct' ? 'organization' : 'recipients', // Direct donations go to organization (CFC-GK)
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

async function seedRequests() {
  console.log('🌱 Seeding donation requests with matching images...\n');
  
  try {
    const recipients = await getUsersByRole('recipient');
    
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
      
      const request = {
        id: requestId,
        requester_id: recipient.id,
        title: template.title,
        description: template.description,
        category: template.category,
        quantity_needed: template.quantity,
        urgency: template.urgency,
        location: `${recipient.address}, ${recipient.city}`,
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
    const admins = await getUsersByRole('admin');
    
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
  console.log('🌱 Seeding donation claims...\n');
  
  try {
    if (!donations || donations.length === 0 || !recipients || recipients.length === 0) {
      console.log('⚠️  No donations or recipients available for claims.');
      return [];
    }
    
    const claimsToInsert = [];
    const usedClaimIds = new Set();
    const claimedDonations = new Set(); // Track which donations have been claimed
    // Valid claim statuses based on actual database enum: only 'claimed' (initial status when claim is created)
    // Other statuses like 'assigned' are set by the system when volunteers are assigned
    const statuses = ['claimed'];
    
    // Separate donations by delivery mode to ensure variety
    const donationsByMode = {
      pickup: donations.filter(d => d.delivery_mode === 'pickup'),
      volunteer: donations.filter(d => d.delivery_mode === 'volunteer'),
      direct: donations.filter(d => d.delivery_mode === 'direct')
    };
    
    console.log(`   Donations by mode: pickup=${donationsByMode.pickup.length}, volunteer=${donationsByMode.volunteer.length}, direct=${donationsByMode.direct.length}`);
    
    // Create claims ensuring we get enough claims for each delivery mode
    // Priority: volunteer > direct > pickup (to ensure we have deliveries to seed)
    // IMPORTANT: Create MORE volunteer claims so some remain without deliveries (available tasks)
    // We'll create deliveries for only ~40% of volunteer claims, leaving 60% as available tasks
    const claimsByMode = {
      volunteer: Math.min(8, donationsByMode.volunteer.length), // Create 8 volunteer claims (or all if less)
      direct: Math.min(donationsByMode.direct.length, 6), // Create claims for ALL or up to 6 direct donations
      pickup: Math.min(3, donationsByMode.pickup.length)
    };
    
    const totalClaims = claimsByMode.volunteer + claimsByMode.direct + claimsByMode.pickup;
    console.log(`   Planning to create ${totalClaims} claims: volunteer=${claimsByMode.volunteer}, direct=${claimsByMode.direct}, pickup=${claimsByMode.pickup}`);
    console.log(`   Note: Only ~40% of volunteer claims will have deliveries, leaving ~60% as available tasks`);
    
    // Create claims for volunteer-mode donations first (priority)
    for (let i = 0; i < claimsByMode.volunteer; i++) {
      const availableVolunteerDonations = donationsByMode.volunteer.filter(d => !claimedDonations.has(d.id));
      if (availableVolunteerDonations.length === 0) break;
      
      const donation = availableVolunteerDonations[Math.floor(Math.random() * availableVolunteerDonations.length)];
      let recipient = recipients[Math.floor(Math.random() * recipients.length)];
      
      // Make sure recipient is not the donor
      let recipientAttempts = 0;
      while (recipient.id === donation.donor_id && recipientAttempts < 10) {
        recipient = recipients[Math.floor(Math.random() * recipients.length)];
        recipientAttempts++;
      }
      
      if (recipient.id === donation.donor_id) continue; // Skip if can't find different recipient
      
      claimedDonations.add(donation.id);
      
      let claimId;
      do {
        claimId = randomUUID();
      } while (usedClaimIds.has(claimId));
      usedClaimIds.add(claimId);
      
      const claim = {
        id: claimId,
        donation_id: donation.id,
        recipient_id: recipient.id,
        donor_id: donation.donor_id,
        status: 'claimed',
        quantity_claimed: donation.quantity || 1
      };
      
      claimsToInsert.push(claim);
    }
    
    // Create claims for direct-mode donations
    for (let i = 0; i < claimsByMode.direct; i++) {
      const availableDirectDonations = donationsByMode.direct.filter(d => !claimedDonations.has(d.id));
      if (availableDirectDonations.length === 0) break;
      
      const donation = availableDirectDonations[Math.floor(Math.random() * availableDirectDonations.length)];
      let recipient = recipients[Math.floor(Math.random() * recipients.length)];
      
      let recipientAttempts = 0;
      while (recipient.id === donation.donor_id && recipientAttempts < 10) {
        recipient = recipients[Math.floor(Math.random() * recipients.length)];
        recipientAttempts++;
      }
      
      if (recipient.id === donation.donor_id) continue;
      
      claimedDonations.add(donation.id);
      
      let claimId;
      do {
        claimId = randomUUID();
      } while (usedClaimIds.has(claimId));
      usedClaimIds.add(claimId);
      
      const claim = {
        id: claimId,
        donation_id: donation.id,
        recipient_id: recipient.id,
        donor_id: donation.donor_id,
        status: 'claimed',
        quantity_claimed: donation.quantity || 1
      };
      
      claimsToInsert.push(claim);
    }
    
    // Create claims for pickup-mode donations
    for (let i = 0; i < claimsByMode.pickup; i++) {
      const availablePickupDonations = donationsByMode.pickup.filter(d => !claimedDonations.has(d.id));
      if (availablePickupDonations.length === 0) break;
      
      const donation = availablePickupDonations[Math.floor(Math.random() * availablePickupDonations.length)];
      let recipient = recipients[Math.floor(Math.random() * recipients.length)];
      
      let recipientAttempts = 0;
      while (recipient.id === donation.donor_id && recipientAttempts < 10) {
        recipient = recipients[Math.floor(Math.random() * recipients.length)];
        recipientAttempts++;
      }
      
      if (recipient.id === donation.donor_id) continue;
      
      claimedDonations.add(donation.id);
      
      let claimId;
      do {
        claimId = randomUUID();
      } while (usedClaimIds.has(claimId));
      usedClaimIds.add(claimId);
      
      const claim = {
        id: claimId,
        donation_id: donation.id,
        recipient_id: recipient.id,
        donor_id: donation.donor_id,
        status: 'claimed',
        quantity_claimed: donation.quantity || 1
      };
      
      claimsToInsert.push(claim);
    }
    
    if (claimsToInsert.length === 0) {
      console.log('⚠️  No claims to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('donation_claims')
      .insert(claimsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding claims:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} donation claims\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding donation claims:', error);
    return [];
  }
}

async function seedEventParticipants(events, users) {
  console.log('🌱 Seeding event participants...\n');
  
  try {
    if (!events || events.length === 0 || !users || users.length === 0) {
      console.log('⚠️  No events or users available for participants.');
      return [];
    }
    
    const participantsToInsert = [];
    const usedParticipantIds = new Set();
    const participantSet = new Set(); // Track (event_id, user_id) pairs to avoid duplicates
    
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
      
      for (const user of eventUsers) {
        const key = `${event.id}-${user.id}`;
        if (participantSet.has(key)) continue;
        participantSet.add(key);
        
        // Generate unique ID
        let participantId;
        do {
          participantId = randomUUID();
        } while (usedParticipantIds.has(participantId));
        usedParticipantIds.add(participantId);
        
        const participant = {
          id: participantId,
          event_id: event.id,
          user_id: user.id,
          attendance_status: 'pending', // pending, present, absent
          joined_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          // Note: created_at is auto-generated by the database if it exists
        };
        
        participantsToInsert.push(participant);
      }
    }
    
    if (participantsToInsert.length === 0) {
      console.log('⚠️  No participants to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('event_participants')
      .insert(participantsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding event participants:', error.message);
      return [];
    }
    
    // Update event participant counts
    if (data.length > 0) {
      const eventCounts = {};
      data.forEach(participant => {
        eventCounts[participant.event_id] = (eventCounts[participant.event_id] || 0) + 1;
      });
      
      // Update each event's current_participants count
      for (const [eventId, count] of Object.entries(eventCounts)) {
        try {
          await supabase
            .from('events')
            .update({ current_participants: count })
            .eq('id', eventId);
        } catch (updateError) {
          console.error(`⚠️  Error updating participant count for event ${eventId}:`, updateError.message);
        }
      }
    }
    
    console.log(`✅ Created ${data.length} event participants\n`);
    return data;
    
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
      
      for (const donor of donors) {
        const donorNotifications = [];
        
        // Get donations by this donor (use more donations to create more requests)
        const donorDonations = donations.filter(d => d.donor_id === donor.id);
        
        // Create donation requests for each donor's donations
        // Use up to 5 donations per donor to ensure we have enough requests
        for (const donation of donorDonations.slice(0, 5)) {
          // Donation request from recipient - create 2-3 requests per donation
          if (recipients.length > 0) {
            const numRequests = Math.floor(Math.random() * 2) + 2; // 2-3 requests per donation
            const selectedRecipients = [...recipients]
              .sort(() => 0.5 - Math.random())
              .slice(0, numRequests);
            
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
          
          // Volunteer request - create 1-2 requests per donation
          if (volunteers.length > 0 && donation.delivery_mode === 'volunteer') {
            const numVolunteerRequests = Math.floor(Math.random() * 2) + 1; // 1-2 requests per donation
            const selectedVolunteers = [...volunteers]
              .sort(() => 0.5 - Math.random())
              .slice(0, numVolunteerRequests);
            
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
          
          // Delivery status update (can be read)
          if (volunteers.length > 0 && Math.random() > 0.7) {
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
          
          // For donation_request and volunteer_request, keep them unread (read_at = null)
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
            read_at: shouldBeUnread ? null : (Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : null),
            created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
          });
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

async function seedDeliveries(claims, volunteers, donations, recipients) {
  console.log('🌱 Seeding volunteer deliveries...\n');
  
  try {
    if (!claims || claims.length === 0 || !volunteers || volunteers.length === 0) {
      console.log('⚠️  No claims or volunteers available for deliveries.');
      return [];
    }
    
    // Create a map of donations by ID for quick lookup
    const donationsMap = {};
    if (donations && donations.length > 0) {
      donations.forEach(donation => {
        donationsMap[donation.id] = donation;
      });
    }
    
    // Filter claims that use volunteer delivery mode (check donation.delivery_mode)
    const volunteerClaims = claims.filter(claim => {
      const donation = donationsMap[claim.donation_id];
      return donation && donation.delivery_mode === 'volunteer';
    });
    
    console.log(`   Found ${volunteerClaims.length} claims with volunteer delivery mode`);
    console.log(`   Available volunteers: ${volunteers.length}`);
    
    if (volunteerClaims.length === 0) {
      console.log('⚠️  No volunteer delivery claims available.');
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
    
    // IMPORTANT: Only create deliveries for ~40% of volunteer claims
    // This leaves ~60% of claims WITHOUT deliveries, making them available tasks on the available-tasks page
    // Available tasks = claims with volunteer delivery mode that don't have volunteer assignments yet
    const numDeliveriesToCreate = Math.max(1, Math.floor(volunteerClaims.length * 0.4)); // 40% of volunteer claims
    const numDeliveries = Math.min(numDeliveriesToCreate, volunteers.length * 2);
    
    console.log(`   Total volunteer claims: ${volunteerClaims.length}`);
    console.log(`   Creating ${numDeliveries} volunteer deliveries (leaving ${volunteerClaims.length - numDeliveries} claims as available tasks)...`);
    
    // Create a set to track which claims already have deliveries
    const claimsWithDeliveries = new Set();
    
    // Shuffle volunteer claims to randomly select which ones get deliveries
    const shuffledClaims = [...volunteerClaims].sort(() => Math.random() - 0.5);
    
    // Find the prioritized volunteer (cristanjade70@gmail.com) if they exist
    const prioritizedVolunteer = volunteers.find(v => v.email && v.email.toLowerCase() === 'cristanjade70@gmail.com');
    let volunteerAssignmentCount = 0;
    const maxAssignmentsForPrioritized = Math.min(Math.floor(numDeliveries * 0.6), numDeliveries); // Give 60% of deliveries to prioritized volunteer
    
    // Only create deliveries for the first numDeliveries claims (40% of total)
    for (let i = 0; i < shuffledClaims.length && deliveriesToInsert.length < numDeliveries; i++) {
      const claim = shuffledClaims[i];
      if (claimsWithDeliveries.has(claim.id)) continue;
      
      // Assign a volunteer - prioritize cristanjade70@gmail.com for first assignments
      let volunteer;
      if (prioritizedVolunteer && volunteerAssignmentCount < maxAssignmentsForPrioritized) {
        volunteer = prioritizedVolunteer;
        volunteerAssignmentCount++;
      } else {
        // Assign random volunteer from the list
        volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
      }
      
      // Get donation info for addresses
      const donation = donationsMap[claim.donation_id];
      const recipient = recipients.find(r => r.id === claim.recipient_id);
      
      // Choose status - prefer more advanced statuses for variety
      const statusWeights = {
        'pending': 1,
        'assigned': 2,
        'accepted': 3,
        'picked_up': 2,
        'in_transit': 2,
        'delivered': 1
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
      
      deliveriesToInsert.push(delivery);
      claimsWithDeliveries.add(claim.id);
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
      console.log(`✅ Created ${data.length} volunteer deliveries`);
      console.log(`   📦 ${prioritizedDeliveries.length} delivery(ies) assigned to ${prioritizedVolunteer.email || prioritizedVolunteer.name || 'prioritized volunteer'}\n`);
    } else {
    console.log(`✅ Created ${data.length} volunteer deliveries\n`);
    }
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding deliveries:', error);
    return [];
  }
}

async function seedDirectDeliveries(claims, donations, recipients) {
  console.log('🌱 Seeding direct deliveries...\n');
  
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
    
    const directDeliveriesToInsert = [];
    const usedDirectDeliveryIds = new Set();
    const directDeliveryStatuses = ['coordination_needed', 'scheduled', 'out_for_delivery', 'delivered', 'cancelled'];
    
    // Create direct deliveries for ALL direct claims (100%)
    // This ensures all direct delivery mode claims have corresponding direct deliveries
    const numDirectDeliveries = directClaims.length;
    
    // Create a set to track which claims we've already processed
    const processedClaims = new Set();
    
    for (let i = 0; i < numDirectDeliveries && i < directClaims.length; i++) {
      // Use directClaims in order to ensure we process all of them
      const claim = directClaims[i];
      
      // Skip if this claim already has a direct delivery
      if (processedClaims.has(claim.id) || directDeliveriesToInsert.some(d => d.claim_id === claim.id)) {
        continue;
      }
      processedClaims.add(claim.id);
      
      const status = directDeliveryStatuses[Math.floor(Math.random() * directDeliveryStatuses.length)];
      
      // Get recipient info for delivery address
      const recipient = recipientsMap[claim.recipient_id];
      const deliveryAddress = recipient?.address 
        ? `${recipient.address}, ${recipient.city || ''}`.trim()
        : claim.location || 'Recipient address';
      
      // Generate unique ID
      let directDeliveryId;
      do {
        directDeliveryId = randomUUID();
      } while (usedDirectDeliveryIds.has(directDeliveryId));
      usedDirectDeliveryIds.add(directDeliveryId);
      
      const directDelivery = {
        id: directDeliveryId,
        claim_id: claim.id,
        status: status,
        delivery_address: deliveryAddress,
        delivery_instructions: status === 'scheduled' || status === 'out_for_delivery' 
          ? 'Please call when you arrive. Recipient will meet you at the gate.'
          : status === 'coordination_needed'
          ? ''
          : null,
        notes: status === 'delivered' 
          ? 'Successfully delivered. Recipient was very happy!'
          : status === 'cancelled'
          ? 'Delivery cancelled by donor.'
          : null
        // Note: created_at and updated_at are auto-generated by the database
      };
      
      directDeliveriesToInsert.push(directDelivery);
    }
    
    if (directDeliveriesToInsert.length === 0) {
      console.log('⚠️  No direct deliveries to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('direct_deliveries')
      .insert(directDeliveriesToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding direct deliveries:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} direct deliveries\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding direct deliveries:', error);
    return [];
  }
}

async function seedSettings() {
  console.log('🌱 Seeding settings...\n');
  
  try {
    // Check if settings exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle();
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('⚠️  Error checking settings:', checkError.message);
      return null;
    }
    
    if (existingSettings) {
      console.log('✅ Settings already exist, skipping...\n');
      return existingSettings;
    }
    
    // Create default settings
    const settings = {
      id: 1,
      platformName: 'HopeLink',
      platformDescription: 'A platform connecting donors with recipients in need',
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
      supportEmail: 'support@hopelink.org',
      maxFileUploadSize: 10,
      auto_assign_enabled: false,
      expiry_retention_days: 30,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('settings')
      .insert(settings)
      .select()
      .single();
    
    if (error) {
      console.error('⚠️  Error seeding settings:', error.message);
      return null;
    }
    
    console.log('✅ Created default settings\n');
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding settings:', error);
    return null;
  }
}

async function seedDeliveryConfirmations(deliveries, allUsers) {
  console.log('🌱 Seeding delivery confirmations...\n');
  
  try {
    if (!deliveries || deliveries.length === 0 || !allUsers || allUsers.length === 0) {
      console.log('⚠️  No deliveries or users available for confirmations.');
      return [];
    }
    
    // Create confirmations for all deliveries (not just delivered ones)
    // Note: delivery_confirmations table requires delivery_id and user_id (not null)
    const confirmationsToInsert = [];
    const usedConfirmationIds = new Set();
    
    // Create confirmations for ~70% of deliveries
    const numConfirmations = Math.max(1, Math.floor(deliveries.length * 0.7));
    const selectedDeliveries = deliveries.slice(0, numConfirmations);
    
    for (const delivery of selectedDeliveries) {
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      if (!user) continue;
      
      let confirmationId;
      do {
        confirmationId = randomUUID();
      } while (usedConfirmationIds.has(confirmationId));
      usedConfirmationIds.add(confirmationId);
      
      // Note: delivery_confirmations has a check constraint on user_role
      // Use only valid roles: likely 'donor' or 'recipient' for confirmations
      const userRoles = ['donor', 'recipient'];
      
      confirmationsToInsert.push({
        id: confirmationId,
        delivery_id: delivery.id,
        user_id: user.id,
        user_role: userRoles[Math.floor(Math.random() * userRoles.length)],
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (confirmationsToInsert.length === 0) {
      console.log('⚠️  No confirmations to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('delivery_confirmations')
      .insert(confirmationsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding delivery confirmations:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} delivery confirmations\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding delivery confirmations:', error);
    return [];
  }
}

async function seedFeedbackRatings(donations, requests, allUsers) {
  console.log('🌱 Seeding feedback ratings...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for feedback ratings.');
      return [];
    }
    
    const feedbackToInsert = [];
    const usedFeedbackIds = new Set();
    
    // Create feedback for all donations and requests (not just completed ones)
    // Note: feedback_ratings table only has id and created_at columns
    const allDonations = donations || [];
    const allRequests = requests || [];
    
    // Create feedback for ~50% of donations
    // Note: feedback_ratings table requires transaction_id (not null)
    const numDonationFeedback = Math.max(1, Math.floor(allDonations.length * 0.5));
    for (let i = 0; i < numDonationFeedback && i < allDonations.length; i++) {
      const donation = allDonations[i];
      let feedbackId;
      do {
        feedbackId = randomUUID();
      } while (usedFeedbackIds.has(feedbackId));
      usedFeedbackIds.add(feedbackId);
      
      feedbackToInsert.push({
        id: feedbackId,
        transaction_id: donation.id,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Create feedback for ~50% of requests
    const numRequestFeedback = Math.max(1, Math.floor(allRequests.length * 0.5));
    for (let i = 0; i < numRequestFeedback && i < allRequests.length; i++) {
      const request = allRequests[i];
      let feedbackId;
      do {
        feedbackId = randomUUID();
      } while (usedFeedbackIds.has(feedbackId));
      usedFeedbackIds.add(feedbackId);
      
      feedbackToInsert.push({
        id: feedbackId,
        transaction_id: request.id,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (feedbackToInsert.length === 0) {
      console.log('⚠️  No feedback ratings to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('feedback_ratings')
      .insert(feedbackToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding feedback ratings:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} feedback ratings\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding feedback ratings:', error);
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

async function seedUserPreferences(allUsers) {
  console.log('🌱 Seeding user preferences...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for user preferences.');
      return [];
    }
    
    const preferencesToInsert = [];
    const usedPreferenceIds = new Set();
    
    // Create preferences for ~60% of users
    // Note: user_preferences table requires user_id (not null)
    const numPreferences = Math.max(1, Math.floor(allUsers.length * 0.6));
    const selectedUsers = allUsers.slice(0, numPreferences);
    
    for (const user of selectedUsers) {
      let preferenceId;
      do {
        preferenceId = randomUUID();
      } while (usedPreferenceIds.has(preferenceId));
      usedPreferenceIds.add(preferenceId);
      
      preferencesToInsert.push({
        id: preferenceId,
        user_id: user.id,
        created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    if (preferencesToInsert.length === 0) {
      console.log('⚠️  No user preferences to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_preferences')
      .insert(preferencesToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding user preferences:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} user preferences\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding user preferences:', error);
    return [];
  }
}

async function seedUserReports(allUsers) {
  console.log('🌱 Seeding user reports...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for user reports.');
      return [];
    }
    
    const reportsToInsert = [];
    const usedReportIds = new Set();
    const usedReportPairs = new Set(); // Track reporter-reported pairs to avoid duplicates
    
    // Create reports - ensure we have at least 3-5 reports for testing
    // Calculate all possible non-self report pairs
    const allPairs = [];
    for (let i = 0; i < allUsers.length; i++) {
      for (let j = 0; j < allUsers.length; j++) {
        if (i !== j) {
          allPairs.push({
            reporter: allUsers[i],
            reported: allUsers[j]
          });
        }
      }
    }
    
    // Shuffle pairs to randomize selection
    const shuffledPairs = allPairs.sort(() => Math.random() - 0.5);
    
    // Create reports for 3-5 pairs (or all available pairs if less)
    const numReports = Math.min(5, Math.max(3, shuffledPairs.length));
    
    let reportIndex = 0; // Track how many reports we've actually created
    
    for (let i = 0; i < numReports && i < shuffledPairs.length; i++) {
      const { reporter, reported } = shuffledPairs[i];
      
      // Skip if we already have a report for this pair
      const pairKey = `${reporter.id}-${reported.id}`;
      if (usedReportPairs.has(pairKey)) continue;
      usedReportPairs.add(pairKey);
      
      let reportId;
      do {
        reportId = randomUUID();
      } while (usedReportIds.has(reportId));
      usedReportIds.add(reportId);
      
      const reasons = ['inappropriate_behavior', 'spam', 'fraud', 'harassment', 'other'];
      // Ensure at least 60% of reports are 'pending' so they show up in the modal by default
      // The rest can be 'resolved' or 'dismissed'
      const status = reportIndex < Math.floor(numReports * 0.6) 
        ? 'pending' 
        : ['resolved', 'dismissed'][Math.floor(Math.random() * 2)];
      
      reportsToInsert.push({
        id: reportId,
        reported_user_id: reported.id,
        reported_by_user_id: reporter.id,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        description: 'User reported for inappropriate behavior.',
        status: status,
        created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
      
      reportIndex++; // Increment after successfully adding a report
    }
    
    if (reportsToInsert.length === 0) {
      console.log('⚠️  No user reports to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_reports')
      .insert(reportsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding user reports:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} user reports\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding user reports:', error);
    return [];
  }
}

async function seedUserVerifications(allUsers) {
  console.log('🌱 Seeding user verifications...\n');
  
  try {
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️  No users available for user verifications.');
      return [];
    }
    
    const verificationsToInsert = [];
    const usedVerificationIds = new Set();
    
    // Create verifications for ~40% of users
    // Note: user_verifications table requires user_id and verification_type (not null)
    const numVerifications = Math.max(1, Math.floor(allUsers.length * 0.4));
    const selectedUsers = allUsers.slice(0, numVerifications);
    
    const verificationTypes = ['email', 'phone', 'id', 'address'];
    
    for (const user of selectedUsers) {
      let verificationId;
      do {
        verificationId = randomUUID();
      } while (usedVerificationIds.has(verificationId));
      usedVerificationIds.add(verificationId);
      
      verificationsToInsert.push({
        id: verificationId,
        user_id: user.id,
        verification_type: verificationTypes[Math.floor(Math.random() * verificationTypes.length)]
      });
    }
    
    if (verificationsToInsert.length === 0) {
      console.log('⚠️  No user verifications to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_verifications')
      .insert(verificationsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding user verifications:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} user verifications\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding user verifications:', error);
    return [];
  }
}

async function seedVolunteerRatings(deliveries, allUsers) {
  console.log('🌱 Seeding volunteer ratings...\n');
  
  try {
    if (!deliveries || deliveries.length === 0 || !allUsers || allUsers.length === 0) {
      console.log('⚠️  No deliveries or users available for volunteer ratings.');
      return [];
    }
    
    // Create ratings for all deliveries (not just delivered ones)
    // Note: volunteer_ratings table requires volunteer_id (not null)
    const ratingsToInsert = [];
    const usedRatingIds = new Set();
    
    // Create ratings for ~60% of deliveries
    const numRatings = Math.max(1, Math.floor(deliveries.length * 0.6));
    const selectedDeliveries = deliveries.slice(0, numRatings);
    
    for (const delivery of selectedDeliveries) {
      const volunteer = allUsers.find(u => u.id === delivery.volunteer_id);
      if (!volunteer) continue;
      
      // Find a rater who is not the volunteer
      let rater = allUsers[Math.floor(Math.random() * allUsers.length)];
      let attempts = 0;
      while (rater && rater.id === volunteer.id && attempts < 10) {
        rater = allUsers[Math.floor(Math.random() * allUsers.length)];
        attempts++;
      }
      if (!rater || volunteer.id === rater.id) continue;
      
      let ratingId;
      do {
        ratingId = randomUUID();
      } while (usedRatingIds.has(ratingId));
      usedRatingIds.add(ratingId);
      
      // Determine rater type based on user role
      const raterTypes = ['donor', 'recipient', 'admin'];
      const raterType = raterTypes[Math.floor(Math.random() * raterTypes.length)];
      
      ratingsToInsert.push({
        id: ratingId,
        volunteer_id: volunteer.id,
        rater_id: rater.id,
        rater_type: raterType,
        delivery_id: delivery.id,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (ratingsToInsert.length === 0) {
      console.log('⚠️  No volunteer ratings to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('volunteer_ratings')
      .insert(ratingsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding volunteer ratings:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} volunteer ratings\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding volunteer ratings:', error);
    return [];
  }
}

async function seedVolunteerRequests(claims, volunteers) {
  console.log('🌱 Seeding volunteer requests...\n');
  
  try {
    if (!claims || claims.length === 0 || !volunteers || volunteers.length === 0) {
      console.log('⚠️  No claims or volunteers available for volunteer requests.');
      return [];
    }
    
    // Only create requests for claims that need volunteer delivery
    const volunteerClaims = claims.filter(c => {
      // This would need to check the donation's delivery_mode
      // For now, we'll use a subset of claims
      return true;
    });
    
    if (volunteerClaims.length === 0) {
      console.log('⚠️  No volunteer claims available for volunteer requests.');
      return [];
    }
    
    const requestsToInsert = [];
    const usedRequestIds = new Set();
    
    // Create requests for ~30% of volunteer claims
    const numRequests = Math.max(1, Math.floor(volunteerClaims.length * 0.3));
    const selectedClaims = volunteerClaims.slice(0, numRequests);
    
    for (const claim of selectedClaims) {
      const volunteer = volunteers[Math.floor(Math.random() * volunteers.length)];
      
      let requestId;
      do {
        requestId = randomUUID();
      } while (usedRequestIds.has(requestId));
      usedRequestIds.add(requestId);
      
      const statuses = ['pending', 'approved', 'rejected'];
      
      requestsToInsert.push({
        id: requestId,
        volunteer_id: volunteer.id,
        claim_id: claim.id,
        request_id: null,
        task_type: 'approved_donation',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    if (requestsToInsert.length === 0) {
      console.log('⚠️  No volunteer requests to insert.');
      return [];
    }
    
    const { data, error } = await supabase
      .from('volunteer_requests')
      .insert(requestsToInsert)
      .select();
    
    if (error) {
      console.error('⚠️  Error seeding volunteer requests:', error.message);
      return [];
    }
    
    console.log(`✅ Created ${data.length} volunteer requests\n`);
    return data;
    
  } catch (error) {
    console.error('❌ Error seeding volunteer requests:', error);
    return [];
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
    
    // Seed core data
    const donations = await seedDonations();
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
    const claims = await seedDonationClaims(donations, recipients);
    const participants = await seedEventParticipants(events, allUsers);
    const deliveries = await seedDeliveries(claims, volunteers, donations, recipients);
    const directDeliveries = await seedDirectDeliveries(claims, donations, recipients);
    const notifications = await seedNotifications(allUsers, donations, events, claims);
    const settings = await seedSettings();
    
    // Seed additional tables
    const deliveryConfirmations = await seedDeliveryConfirmations(deliveries, allUsers);
    const feedbackRatings = await seedFeedbackRatings(donations, requests, allUsers);
    const performanceMetrics = await seedPerformanceMetrics(allUsers);
    const userPreferences = await seedUserPreferences(allUsers);
    const userReports = await seedUserReports(allUsers);
    const userVerifications = await seedUserVerifications(allUsers);
    const volunteerRatings = await seedVolunteerRatings(deliveries, allUsers);
    const volunteerRequests = await seedVolunteerRequests(claims, volunteers);
    const volunteerTimeTracking = await seedVolunteerTimeTracking(deliveries, volunteers);
    
    console.log('✅ All done! Database fully seeded.\n');
    console.log('📊 Summary:');
    console.log(`  - Donations: ${donations?.length || 0} with matching images`);
    console.log(`  - Requests: ${requests?.length || 0} with matching images`);
    console.log(`  - Events: ${events?.length || 0} with matching images`);
    console.log(`  - Donation Claims: ${claims?.length || 0}`);
    console.log(`  - Event Participants: ${participants?.length || 0}`);
    console.log(`  - Volunteer Deliveries: ${deliveries?.length || 0} (with various statuses)`);
    console.log(`  - Direct Deliveries: ${directDeliveries?.length || 0} (with various statuses)`);
    console.log(`  - Notifications: ${notifications?.length || 0}`);
    console.log(`  - Settings: ${settings ? 'Created' : 'Skipped'}`);
    console.log(`  - Delivery Confirmations: ${deliveryConfirmations?.length || 0}`);
    console.log(`  - Feedback Ratings: ${feedbackRatings?.length || 0}`);
    console.log(`  - Performance Metrics: ${performanceMetrics?.length || 0}`);
    console.log(`  - User Preferences: ${userPreferences?.length || 0}`);
    console.log(`  - User Reports: ${userReports?.length || 0}`);
    console.log(`  - User Verifications: ${userVerifications?.length || 0}`);
    console.log(`  - Volunteer Ratings: ${volunteerRatings?.length || 0}`);
    console.log(`  - Volunteer Requests: ${volunteerRequests?.length || 0}`);
    console.log(`  - Volunteer Time Tracking: ${volunteerTimeTracking?.length || 0}\n`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

