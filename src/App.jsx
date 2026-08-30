import React, { useState, useEffect, useRef, useMemo } from 'react';
import HeaderNav from './components/HeaderNav';
import LandingHeroPage from './components/LandingHeroPage';
import VoiceHUD from './components/VoiceHUD';
import PropertyCard from './components/PropertyCard';
import NeighborhoodTelemetry from './components/NeighborhoodTelemetry';
import SpatialRadarMap from './components/SpatialRadarMap';
import PropertyComparisonMatrix from './components/PropertyComparisonMatrix';
import DesignSystemShowcase from './components/DesignSystemShowcase';
import SellerIntakePanel from './components/SellerIntakePanel';
import SellerListingsWorkspace from './components/SellerListingsWorkspace';
import SourcesDrawer from './components/SourcesDrawer';
import BookingModal from './components/BookingModal';
import MortgageCalculatorModal from './components/MortgageCalculatorModal';
import SpotlightPropertyPanel from './components/SpotlightPropertyPanel';
import InfoModals from './components/InfoModals';
import {
  SITE_VISIT_TIME_SLOTS,
  fetchBrokerSlotAvailability,
  submitSiteVisitRequest
} from './utils/siteVisitBooking';
import { createVoiceActivityDetector } from './utils/voiceActivityDetection';
import {
  normalizeInterruptTranscript,
  shouldProcessBargeInTranscript,
  shouldTriggerBargeIn
} from './utils/voiceInterrupt';
import {
  isPurchaseIntent,
  isRentalIntent,
  hasRentalSearchCriteria,
  getMissingRentalPrompt,
  getRequirementsPrompt,
  hasPreferenceInput,
  PURCHASE_DECLINE_MSG,
  OUT_OF_SCOPE_DECLINE_MSG,
  OUT_OF_SCOPE_CONTINUE_PROMPT,
  isOutOfScopeQuery,
  getOutOfScopeResponse,
  isAffirmativeResponse,
  isNegativeResponse,
  getScopeContinueResumePrompt,
} from './utils/intentDetection';
import {
  extractLocalitiesFromText,
  fuzzyResolveLocality,
  shouldConfirmFuzzyLocality,
  buildLocalityConfirmationPrompt,
  mergePersistedInterviewSlots,
} from './utils/localityResolver';
import {
  extractSoftPreferences,
  mergeSoftPreferences,
  hasNoPreference,
  scorePropertyForPreferences,
  buildShortlistVerdict,
  getPropertyPreferenceReason
} from './utils/softPreferences';
import {
  findShortlistPropertyFromQuery,
  isSiteVisitBookingIntent,
  canTriggerSiteVisitBooking,
  isAmbiguousPostDiscoveryUtterance,
  getPostDiscoveryBrowsePrompt,
  BOOKING_COMPLETED_THANK_YOU,
  BUYER_STEP_BOOKING_COMPLETED,
  shouldOfferSiteVisitResume,
  isBookingCompletedStep,
  buildBookingCompletedMessage,
  userAlreadyPickedShortlistProperty,
  isConfidentPropertyNamePick,
} from './utils/voiceAgentLogic';
import { propertyMatchesLocality, resolveListingLocality } from './utils/listingLocality';
import { apiUrl } from './utils/apiBase';

// Word-to-number dictionary for English/Hindi spoken numbers
const wordToNumberMap = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100,
  'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'panch': 5, 'sau': 100
};

// Strict Indian Currency Parser supporting digits AND spoken numbers ("1.5 lakh", "one point five lakh", "1.5 cr", "80,00,000", "50k")
const parseIndianCurrencyStrict = (text) => {
  if (!text) return null;

  let cleanText = text.replace(/,/g, '').toLowerCase();

  // Normalize common spoken decimal variations
  cleanText = cleanText
    .replace(/\bone point five\b/g, '1.5')
    .replace(/\bone and a half\b/g, '1.5')
    .replace(/\b1 and a half\b/g, '1.5')
    .replace(/\btwo point five\b/g, '2.5')
    .replace(/\bthree point five\b/g, '3.5')
    .replace(/\bhalf a lakh\b/g, '0.5 lakh')
    .replace(/\bdedh lakh\b/g, '1.5 lakh')
    .replace(/\bdhai lakh\b/g, '2.5 lakh');

  Object.keys(wordToNumberMap).forEach(word => {
    const regex = new RegExp(`\\b${word}\\s+(crore|crores|cr|lakh|lakhs|lac|lacs|k|thousand)\\b`, 'g');
    cleanText = cleanText.replace(regex, `${wordToNumberMap[word]} $1`);
  });

  // 1. Check Crore (e.g. "1.5 crore", "1.5cr", "2 crores")
  const croreMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b/);
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 10000000);

  // 2. Check Lakh / Lac (e.g. "1.5 lakh", "1.5 lakhs", "1.5 lac", "1.5l", "1.5 l")
  const lakhMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|l)\b/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);

  // 3. Check Thousand / K (e.g. "50k", "50 thousand", "150k")
  const kMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*(?:k|thousand|thousands)\b/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  // 4. Check Raw Digits >= 1000 (e.g. "150000", "50000")
  const plainMatch = cleanText.match(/\b\d{4,9}\b/g);
  if (plainMatch) {
    const rawNum = parseInt(plainMatch[0]);
    if (rawNum >= 1000) return rawNum;
  }

  return null;
};

// Format currency for human speech & text display
const formatIndianCurrencyDisplay = (amount, listingType) => {
  if (!amount) return "";
  if (amount >= 10000000) {
    const cr = (amount / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${cr} Crore rupees`;
  }
  if (amount >= 100000) {
    const lakh = (amount / 100000).toFixed(2).replace(/\.00$/, '');
    return `${lakh} Lakh rupees`;
  }
  return `${amount.toLocaleString('en-IN')} rupees${listingType === 'rent' ? ' per month' : ''}`;
};

const METRO_MAP = {
  'Indiranagar': { station: 'Indiranagar Metro Station', distance: 'under 1 km', line: 'Purple Line' },
  'Koramangala': { station: 'Trinity Metro Station', distance: 'around 4.4 km', line: 'Purple Line' },
  'HSR Layout': { station: 'Silk Board Metro Station', distance: 'under 1.5 km', line: 'Yellow Line' },
  'Whitefield': { station: 'Whitefield (Kadugodi) Metro Station', distance: 'under 1 km', line: 'Purple Line' },
  'Mahadevapura': { station: 'Singayyanapalya Metro Station', distance: 'under 1 km', line: 'Purple Line' },
  'Jayanagar': { station: 'Jayanagar Metro Station', distance: 'under 1 km', line: 'Green Line' },
  'Sarjapura': { station: 'Bellandur Road Metro Station', distance: 'around 3.5 km', line: 'Blue Line' },
  'Domlur': { station: 'Indiranagar Metro Station', distance: 'under 2 km', line: 'Purple Line' }
};

const getMetroInfoForLocality = (locName) => {
  if (!locName) return { station: 'Indiranagar Metro Station', distance: 'under 1 km', line: 'Purple Line' };
  for (const [key, info] of Object.entries(METRO_MAP)) {
    if (locName.toLowerCase().includes(key.toLowerCase())) return info;
  }
  return { station: `${locName} Metro Station`, distance: 'under 1.5 km', line: 'Namma Metro Network' };
};

const extractBhksFromText = (text) => {
  if (!text) return [];
  const q = text.toLowerCase();
  const bhks = new Set();

  // 1. Direct regex for multi-BHK phrases like "2 or 3", "2 and 3 bhk", "2, 3 bhk", "2/3 bhk"
  const comboMatches = q.matchAll(/\b([1-4])\s*(?:and|or|to|,|\/)\s*([1-4])\s*(?:bhk|bedroom|bedrooms)?\b/g);
  for (const match of comboMatches) {
    bhks.add(parseInt(match[1]));
    bhks.add(parseInt(match[2]));
  }

  // 2. Individual BHK pattern checks
  if (q.match(/\b1\s*(?:bhk|bedroom|bedrooms)?\b/) || q.includes('1bhk') || q.includes('1-bhk') || q.includes('one bhk')) {
    bhks.add(1);
  }
  if (q.match(/\b2\s*(?:bhk|bedroom|bedrooms)?\b/) || q.includes('2bhk') || q.includes('2-bhk') || q.includes('two bhk')) {
    bhks.add(2);
  }
  if (q.match(/\b3\s*(?:bhk|bedroom|bedrooms)?\b/) || q.includes('3bhk') || q.includes('3-bhk') || q.includes('three bhk')) {
    bhks.add(3);
  }
  if (q.match(/\b4\s*(?:bhk|bedroom|bedrooms)?\b/) || q.includes('4bhk') || q.includes('4-bhk') || q.includes('four bhk')) {
    bhks.add(4);
  }
  if (q.match(/\bone\s*(?:bhk|bedroom|bedrooms)\b/) || q.includes('one bhk')) {
    bhks.add(1);
  }
  if (q.match(/\btwo\s*(?:bhk|bedroom|bedrooms)\b/) || q.includes('two bhk')) {
    bhks.add(2);
  }
  if (q.match(/\bthree\s*(?:bhk|bedroom|bedrooms)\b/) || q.includes('three bhk')) {
    bhks.add(3);
  }
  if (q.match(/\bfour\s*(?:bhk|bedroom|bedrooms)\b/) || q.includes('four bhk')) {
    bhks.add(4);
  }
  if (q.includes('ek bhk') || q.match(/\bek\s*(?:bhk|bedroom|bedrooms)\b/)) {
    bhks.add(1);
  }
  if (q.includes('do bhk') || q.match(/\bdo\s*(?:bhk|bedroom|bedrooms)\b/)) {
    bhks.add(2);
  }
  if (q.includes('teen bhk') || q.match(/\bteen\s*(?:bhk|bedroom|bedrooms)\b/)) {
    bhks.add(3);
  }
  if (q.includes('char bhk') || q.match(/\bchar\s*(?:bhk|bedroom|bedrooms)\b/)) {
    bhks.add(4);
  }

  // Standalone digit answers common in voice (e.g. user says only "2")
  const trimmed = q.trim();
  if (bhks.size === 0 && trimmed.match(/^([1-4])$/)) {
    bhks.add(parseInt(trimmed, 10));
  }

  return Array.from(bhks);
};

// Flatten legacy nested listing arrays and drop invalid entries
const normalizeListings = (list) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const flat = list.some((item) => Array.isArray(item)) ? list.flat() : list;
  return flat.filter((item) => item && item.listing_id);
};

const formatVisitDateForSpeech = (dateStr) => {
  if (!dateStr) return dateStr;
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
};

const parseVisitDateFromText = (text) => {
  if (!text) return null;
  const q = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (q.includes('tomorrow')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (q.includes('today')) {
    return today.toISOString().split('T')[0];
  }

  const iso = q.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 12
  };
  for (const [name, idx] of Object.entries(months)) {
    const monthDay = q.match(new RegExp(`${name}\\s+(\\d{1,2})`));
    if (monthDay) {
      const d = new Date(today.getFullYear(), idx, parseInt(monthDay[1], 10));
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    }
    const dayMonth = q.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${name}`));
    if (dayMonth) {
      const d = new Date(today.getFullYear(), idx, parseInt(dayMonth[1], 10));
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    }
  }

  const slash = q.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (slash) {
    const year = slash[3] ? (slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : String(today.getFullYear());
    const d = new Date(parseInt(year, 10), parseInt(slash[2], 10) - 1, parseInt(slash[1], 10));
    return d.toISOString().split('T')[0];
  }

  return null;
};

const parseTimeSlotFromText = (text) => {
  if (!text) return null;
  const q = text.toLowerCase();
  if (q.includes('11:30') || q.includes('11 30') || (q.includes('11') && q.includes('30'))) {
    return '11:30 AM - 12:30 PM';
  }
  if (q.includes('2 pm') || q.includes('2pm') || q.includes('14:00') || q.includes('14 ') || q.includes('afternoon')) {
    return '02:00 PM - 03:00 PM';
  }
  if (q.includes('4 pm') || q.includes('4pm') || q.includes('16:') || q.includes('evening')) {
    return '04:00 PM - 05:00 PM';
  }
  if (q.match(/\b10\b/) || q.includes('10 am') || q.includes('ten am') || q.includes('morning')) {
    return '10:00 AM - 11:00 AM';
  }
  for (const slot of SITE_VISIT_TIME_SLOTS) {
    if (q.includes(slot.toLowerCase().slice(0, 5))) return slot;
  }
  return null;
};

const extractEmailFromText = (text) => {
  if (!text) return null;
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
};

const extractPhoneFromText = (text) => {
  if (!text) return null;
  const m = text.match(/(\+?\d[\d\s\-]{8,14}\d)/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
};

// Seed active property listings with real high-resolution photos matching listings.json
const initialListings = [
  {
    "listing_id": "rent_bengaluru_1_1",
    "society_name": "TVS Emerald Court Cantonment Area",
    "locality": "Cantonment Area",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 600000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1138,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Cantonment Area. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_1_1"
  },
  {
    "listing_id": "rent_bengaluru_1_2",
    "society_name": "Sumadhura Enclave Cantonment Area",
    "locality": "Cantonment Area",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1008,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Cantonment Area. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_1_2"
  },
  {
    "listing_id": "rent_bengaluru_2_1",
    "society_name": "Rohan Gardenia Domlur",
    "locality": "Domlur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1416,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Domlur. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_2_1"
  },
  {
    "listing_id": "rent_bengaluru_2_2",
    "society_name": "Divyasree Parkview Domlur",
    "locality": "Domlur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1022,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Domlur. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_2_2"
  },
  {
    "listing_id": "rent_bengaluru_3_1",
    "society_name": "Mahaveer Splendour Indiranagar",
    "locality": "Indiranagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 112000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1138,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Indiranagar. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_3_1"
  },
  {
    "listing_id": "rent_bengaluru_3_2",
    "society_name": "Mantri Gardenia Indiranagar",
    "locality": "Indiranagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1641,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Indiranagar. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_3_2"
  },
  {
    "listing_id": "rent_bengaluru_4_1",
    "society_name": "Goyal & Co Gardenia Rajajinagar",
    "locality": "Rajajinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2272,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Rajajinagar. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_4_1"
  },
  {
    "listing_id": "rent_bengaluru_4_2",
    "society_name": "Divyasree Gardenia Rajajinagar",
    "locality": "Rajajinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1626,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Rajajinagar. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_4_2"
  },
  {
    "listing_id": "rent_bengaluru_5_1",
    "society_name": "Assetz Vista Malleswaram",
    "locality": "Malleswaram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 992,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Malleswaram. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_5_1"
  },
  {
    "listing_id": "rent_bengaluru_5_2",
    "society_name": "Brigade Sanctuary Malleswaram",
    "locality": "Malleswaram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1084,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Malleswaram. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_5_2"
  },
  {
    "listing_id": "rent_bengaluru_6_1",
    "society_name": "TVS Emerald Meadows Pete Area",
    "locality": "Pete Area",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1058,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Pete Area. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_6_1"
  },
  {
    "listing_id": "rent_bengaluru_6_2",
    "society_name": "Sumadhura Solitaire Pete Area",
    "locality": "Pete Area",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 84000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 458,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Pete Area. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_6_2"
  },
  {
    "listing_id": "rent_bengaluru_7_1",
    "society_name": "Shriram Greens Sadashivanagar",
    "locality": "Sadashivanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2268,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Sadashivanagar. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_7_1"
  },
  {
    "listing_id": "rent_bengaluru_7_2",
    "society_name": "Salarpuria Sattva Solitaire Sadashivanagar",
    "locality": "Sadashivanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 210000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1180,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Sadashivanagar. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_7_2"
  },
  {
    "listing_id": "rent_bengaluru_8_1",
    "society_name": "Salarpuria Sattva Gardenia Seshadripuram",
    "locality": "Seshadripuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1092,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Seshadripuram. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_8_1"
  },
  {
    "listing_id": "rent_bengaluru_8_2",
    "society_name": "Sobha Greens Seshadripuram",
    "locality": "Seshadripuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1497,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Seshadripuram. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_8_2"
  },
  {
    "listing_id": "rent_bengaluru_9_1",
    "society_name": "Century Gardenia Shivajinagar",
    "locality": "Shivajinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1707,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Shivajinagar. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_9_1"
  },
  {
    "listing_id": "rent_bengaluru_9_2",
    "society_name": "Goyal & Co Gardenia Shivajinagar",
    "locality": "Shivajinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1563,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Shivajinagar. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_9_2"
  },
  {
    "listing_id": "rent_bengaluru_10_1",
    "society_name": "Total Environment Residences Ulsoor",
    "locality": "Ulsoor",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 567,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Ulsoor. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_10_1"
  },
  {
    "listing_id": "rent_bengaluru_10_2",
    "society_name": "TVS Emerald Residences Ulsoor",
    "locality": "Ulsoor",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1710,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Ulsoor. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_10_2"
  },
  {
    "listing_id": "rent_bengaluru_11_1",
    "society_name": "Mantri Greens Vasanth Nagar",
    "locality": "Vasanth Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 195000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1452,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vasanth Nagar. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_11_1"
  },
  {
    "listing_id": "rent_bengaluru_11_2",
    "society_name": "Shriram Solitaire Vasanth Nagar",
    "locality": "Vasanth Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 340000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1389,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vasanth Nagar. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_11_2"
  },
  {
    "listing_id": "rent_bengaluru_12_1",
    "society_name": "Godrej Greens R. T. Nagar",
    "locality": "R. T. Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 480,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in R. T. Nagar. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_12_1"
  },
  {
    "listing_id": "rent_bengaluru_12_2",
    "society_name": "Century Gardenia R. T. Nagar",
    "locality": "R. T. Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1503,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in R. T. Nagar. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_12_2"
  },
  {
    "listing_id": "rent_bengaluru_13_1",
    "society_name": "Shriram Greens Bellandur",
    "locality": "Bellandur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1178,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bellandur. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_13_1"
  },
  {
    "listing_id": "rent_bengaluru_13_2",
    "society_name": "Century Palms Bellandur",
    "locality": "Bellandur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1683,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bellandur. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_13_2"
  },
  {
    "listing_id": "rent_bengaluru_14_1",
    "society_name": "Rohan Palms C. V. Raman Nagar",
    "locality": "C. V. Raman Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 598,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in C. V. Raman Nagar. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_14_1"
  },
  {
    "listing_id": "rent_bengaluru_14_2",
    "society_name": "Rohan Meadows C. V. Raman Nagar",
    "locality": "C. V. Raman Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 260000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 502,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in C. V. Raman Nagar. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_14_2"
  },
  {
    "listing_id": "rent_bengaluru_15_1",
    "society_name": "Rohan Vista Hoodi",
    "locality": "Hoodi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 565,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hoodi. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_15_1"
  },
  {
    "listing_id": "rent_bengaluru_15_2",
    "society_name": "Assetz Sanctuary Hoodi",
    "locality": "Hoodi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 930,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hoodi. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_15_2"
  },
  {
    "listing_id": "rent_bengaluru_16_1",
    "society_name": "Assetz Vista Krishnarajapuram",
    "locality": "Krishnarajapuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 565,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Krishnarajapuram. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_16_1"
  },
  {
    "listing_id": "rent_bengaluru_16_2",
    "society_name": "Sumadhura Elegance Krishnarajapuram",
    "locality": "Krishnarajapuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 556,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Krishnarajapuram. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_16_2"
  },
  {
    "listing_id": "rent_bengaluru_17_1",
    "society_name": "Assetz Residences Mahadevapura",
    "locality": "Mahadevapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 195000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1172,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mahadevapura. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_17_1"
  },
  {
    "listing_id": "rent_bengaluru_17_2",
    "society_name": "Godrej Elegance Mahadevapura",
    "locality": "Mahadevapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 105000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1200,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mahadevapura. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_17_2"
  },
  {
    "listing_id": "rent_bengaluru_18_1",
    "society_name": "Mantri Meadows Marathahalli",
    "locality": "Marathahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 66000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1164,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Marathahalli. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_18_1"
  },
  {
    "listing_id": "rent_bengaluru_18_2",
    "society_name": "Sumadhura Enclave Marathahalli",
    "locality": "Marathahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 535,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Marathahalli. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_18_2"
  },
  {
    "listing_id": "rent_bengaluru_19_1",
    "society_name": "Salarpuria Sattva Vista Varthur",
    "locality": "Varthur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 105000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1912,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Varthur. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_19_1"
  },
  {
    "listing_id": "rent_bengaluru_19_2",
    "society_name": "Rohan Vista Varthur",
    "locality": "Varthur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 484,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Varthur. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_19_2"
  },
  {
    "listing_id": "rent_bengaluru_20_1",
    "society_name": "Sobha Gardenia Whitefield",
    "locality": "Whitefield",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1422,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Whitefield. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_20_1"
  },
  {
    "listing_id": "rent_bengaluru_20_2",
    "society_name": "Embassy Enclave Whitefield",
    "locality": "Whitefield",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1184,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Whitefield. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_20_2"
  },
  {
    "listing_id": "rent_bengaluru_21_1",
    "society_name": "Salarpuria Sattva Sanctuary Banaswadi",
    "locality": "Banaswadi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 66000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1584,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Banaswadi. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_21_1"
  },
  {
    "listing_id": "rent_bengaluru_21_2",
    "society_name": "Godrej Meadows Banaswadi",
    "locality": "Banaswadi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 976,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Banaswadi. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_21_2"
  },
  {
    "listing_id": "rent_bengaluru_22_1",
    "society_name": "Total Environment Meadows HBR Layout",
    "locality": "HBR Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2080,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in HBR Layout. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_22_1"
  },
  {
    "listing_id": "rent_bengaluru_22_2",
    "society_name": "Mantri Parkview HBR Layout",
    "locality": "HBR Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 584,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in HBR Layout. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_22_2"
  },
  {
    "listing_id": "rent_bengaluru_23_1",
    "society_name": "Sobha Sanctuary Horamavu",
    "locality": "Horamavu",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2176,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Horamavu. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_23_1"
  },
  {
    "listing_id": "rent_bengaluru_23_2",
    "society_name": "Provident Palms Horamavu",
    "locality": "Horamavu",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 527,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Horamavu. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_23_2"
  },
  {
    "listing_id": "rent_bengaluru_24_1",
    "society_name": "Total Environment Solitaire Kalyan Nagar",
    "locality": "Kalyan Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 260000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 461,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kalyan Nagar. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_24_1"
  },
  {
    "listing_id": "rent_bengaluru_24_2",
    "society_name": "Sobha Parkview Kalyan Nagar",
    "locality": "Kalyan Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 547,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kalyan Nagar. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_24_2"
  },
  {
    "listing_id": "rent_bengaluru_25_1",
    "society_name": "Vaswani Splendour Kammanahalli",
    "locality": "Kammanahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 562,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kammanahalli. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_25_1"
  },
  {
    "listing_id": "rent_bengaluru_25_2",
    "society_name": "Shriram Court Kammanahalli",
    "locality": "Kammanahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 970,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kammanahalli. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_25_2"
  },
  {
    "listing_id": "rent_bengaluru_26_1",
    "society_name": "Sumadhura Solitaire Lingarajapuram",
    "locality": "Lingarajapuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2228,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Lingarajapuram. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_26_1"
  },
  {
    "listing_id": "rent_bengaluru_26_2",
    "society_name": "Sobha Residences Lingarajapuram",
    "locality": "Lingarajapuram",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 110000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 575,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Lingarajapuram. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_26_2"
  },
  {
    "listing_id": "rent_bengaluru_27_1",
    "society_name": "Rohan Solitaire Ramamurthy Nagar",
    "locality": "Ramamurthy Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1629,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Ramamurthy Nagar. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_27_1"
  },
  {
    "listing_id": "rent_bengaluru_27_2",
    "society_name": "Godrej Sanctuary Ramamurthy Nagar",
    "locality": "Ramamurthy Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 932,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Ramamurthy Nagar. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_27_2"
  },
  {
    "listing_id": "rent_bengaluru_28_1",
    "society_name": "Puravankara Vista Hebbal",
    "locality": "Hebbal",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1860,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hebbal. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_28_1"
  },
  {
    "listing_id": "rent_bengaluru_28_2",
    "society_name": "Rohan Palms Hebbal",
    "locality": "Hebbal",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1407,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hebbal. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_28_2"
  },
  {
    "listing_id": "rent_bengaluru_29_1",
    "society_name": "Godrej Court Jalahalli",
    "locality": "Jalahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1852,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jalahalli. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_29_1"
  },
  {
    "listing_id": "rent_bengaluru_29_2",
    "society_name": "TVS Emerald Gardenia Jalahalli",
    "locality": "Jalahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 490,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jalahalli. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_29_2"
  },
  {
    "listing_id": "rent_bengaluru_30_1",
    "society_name": "Salarpuria Sattva Greens Mathikere",
    "locality": "Mathikere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1794,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mathikere. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_30_1"
  },
  {
    "listing_id": "rent_bengaluru_30_2",
    "society_name": "Godrej Greens Mathikere",
    "locality": "Mathikere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 463,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mathikere. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_30_2"
  },
  {
    "listing_id": "rent_bengaluru_31_1",
    "society_name": "Mantri Court Peenya",
    "locality": "Peenya",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1948,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Peenya. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_31_1"
  },
  {
    "listing_id": "rent_bengaluru_31_2",
    "society_name": "Vaswani Palms Peenya",
    "locality": "Peenya",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 105000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 980,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Peenya. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_31_2"
  },
  {
    "listing_id": "rent_bengaluru_32_1",
    "society_name": "Goyal & Co Meadows Vidyaranyapura",
    "locality": "Vidyaranyapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 469,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vidyaranyapura. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_32_1"
  },
  {
    "listing_id": "rent_bengaluru_32_2",
    "society_name": "Assetz Grandeur Vidyaranyapura",
    "locality": "Vidyaranyapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 459,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vidyaranyapura. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_32_2"
  },
  {
    "listing_id": "rent_bengaluru_33_1",
    "society_name": "Assetz Enclave Yelahanka",
    "locality": "Yelahanka",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1000,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Yelahanka. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_33_1"
  },
  {
    "listing_id": "rent_bengaluru_33_2",
    "society_name": "Salarpuria Sattva Sanctuary Yelahanka",
    "locality": "Yelahanka",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 325000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1644,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Yelahanka. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_33_2"
  },
  {
    "listing_id": "rent_bengaluru_34_1",
    "society_name": "Godrej Vista Yeshwanthpur",
    "locality": "Yeshwanthpur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1746,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Yeshwanthpur. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_34_1"
  },
  {
    "listing_id": "rent_bengaluru_34_2",
    "society_name": "Total Environment Solitaire Yeshwanthpur",
    "locality": "Yeshwanthpur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 954,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Yeshwanthpur. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_34_2"
  },
  {
    "listing_id": "rent_bengaluru_35_1",
    "society_name": "Goyal & Co Court Bommanahalli",
    "locality": "Bommanahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1128,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bommanahalli. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_35_1"
  },
  {
    "listing_id": "rent_bengaluru_35_2",
    "society_name": "TVS Emerald Enclave Bommanahalli",
    "locality": "Bommanahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 84000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1112,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bommanahalli. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_35_2"
  },
  {
    "listing_id": "rent_bengaluru_36_1",
    "society_name": "Mahaveer Sanctuary Bommasandra",
    "locality": "Bommasandra",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 482,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bommasandra. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_36_1"
  },
  {
    "listing_id": "rent_bengaluru_36_2",
    "society_name": "Provident Elegance Bommasandra",
    "locality": "Bommasandra",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 110000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2160,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Bommasandra. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_36_2"
  },
  {
    "listing_id": "rent_bengaluru_37_1",
    "society_name": "Brigade Solitaire BTM Layout",
    "locality": "BTM Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 210000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1056,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in BTM Layout. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_37_1"
  },
  {
    "listing_id": "rent_bengaluru_37_2",
    "society_name": "Total Environment Residences BTM Layout",
    "locality": "BTM Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 325000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2316,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in BTM Layout. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_37_2"
  },
  {
    "listing_id": "rent_bengaluru_38_1",
    "society_name": "Sumadhura Meadows Electronic City",
    "locality": "Electronic City",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 988,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Electronic City. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_38_1"
  },
  {
    "listing_id": "rent_bengaluru_38_2",
    "society_name": "Vaswani Meadows Electronic City",
    "locality": "Electronic City",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1064,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Electronic City. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_38_2"
  },
  {
    "listing_id": "rent_bengaluru_39_1",
    "society_name": "Goyal & Co Solitaire HSR Layout",
    "locality": "HSR Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 325000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1836,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in HSR Layout. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_39_1"
  },
  {
    "listing_id": "rent_bengaluru_39_2",
    "society_name": "Shriram Meadows HSR Layout",
    "locality": "HSR Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 112000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 538,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in HSR Layout. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_39_2"
  },
  {
    "listing_id": "rent_bengaluru_40_1",
    "society_name": "Century Gardenia Koramangala",
    "locality": "Koramangala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 112000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 546,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Koramangala. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_40_1"
  },
  {
    "listing_id": "rent_bengaluru_40_2",
    "society_name": "Godrej Palms Koramangala",
    "locality": "Koramangala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 175000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1002,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Koramangala. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_40_2"
  },
  {
    "listing_id": "rent_bengaluru_41_1",
    "society_name": "Sumadhura Greens Madiwala",
    "locality": "Madiwala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 260000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1428,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Madiwala. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_41_1"
  },
  {
    "listing_id": "rent_bengaluru_41_2",
    "society_name": "Salarpuria Sattva Parkview Madiwala",
    "locality": "Madiwala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 175000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 556,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Madiwala. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_41_2"
  },
  {
    "listing_id": "rent_bengaluru_42_1",
    "society_name": "Century Vista Banashankari",
    "locality": "Banashankari",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 65000,
    "deposit_inr": 325000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1608,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Banashankari. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_42_1"
  },
  {
    "listing_id": "rent_bengaluru_42_2",
    "society_name": "Salarpuria Sattva Splendour Banashankari",
    "locality": "Banashankari",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 912,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Banashankari. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_42_2"
  },
  {
    "listing_id": "rent_bengaluru_43_1",
    "society_name": "Shriram Court Basavanagudi",
    "locality": "Basavanagudi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 986,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Basavanagudi. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_43_1"
  },
  {
    "listing_id": "rent_bengaluru_43_2",
    "society_name": "Embassy Gardenia Basavanagudi",
    "locality": "Basavanagudi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 600000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1464,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Basavanagudi. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_43_2"
  },
  {
    "listing_id": "rent_bengaluru_44_1",
    "society_name": "Prestige Elegance Girinagar",
    "locality": "Girinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 210000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 916,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Girinagar. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_44_1"
  },
  {
    "listing_id": "rent_bengaluru_44_2",
    "society_name": "Prestige Palms Girinagar",
    "locality": "Girinagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 112000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2148,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Girinagar. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_44_2"
  },
  {
    "listing_id": "rent_bengaluru_45_1",
    "society_name": "Mahaveer Court JP Nagar",
    "locality": "JP Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2140,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in JP Nagar. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_45_1"
  },
  {
    "listing_id": "rent_bengaluru_45_2",
    "society_name": "Goyal & Co Gardenia JP Nagar",
    "locality": "JP Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 208000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 590,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in JP Nagar. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_45_2"
  },
  {
    "listing_id": "rent_bengaluru_46_1",
    "society_name": "Brigade Splendour Jayanagar",
    "locality": "Jayanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 105000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1014,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jayanagar. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_46_1"
  },
  {
    "listing_id": "rent_bengaluru_46_2",
    "society_name": "Total Environment Gardenia Jayanagar",
    "locality": "Jayanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 584,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jayanagar. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_46_2"
  },
  {
    "listing_id": "rent_bengaluru_47_1",
    "society_name": "Embassy Enclave Kumaraswamy Layout",
    "locality": "Kumaraswamy Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1964,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kumaraswamy Layout. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_47_1"
  },
  {
    "listing_id": "rent_bengaluru_47_2",
    "society_name": "Century Court Kumaraswamy Layout",
    "locality": "Kumaraswamy Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 84000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1042,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kumaraswamy Layout. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_47_2"
  },
  {
    "listing_id": "rent_bengaluru_48_1",
    "society_name": "Total Environment Parkview Padmanabhanagar",
    "locality": "Padmanabhanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 255000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 493,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Padmanabhanagar. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_48_1"
  },
  {
    "listing_id": "rent_bengaluru_48_2",
    "society_name": "Sumadhura Elegance Padmanabhanagar",
    "locality": "Padmanabhanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 483,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Padmanabhanagar. Features 1BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_48_2"
  },
  {
    "listing_id": "rent_bengaluru_49_1",
    "society_name": "Vaswani Gardenia Uttarahalli",
    "locality": "Uttarahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1980,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Uttarahalli. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_49_1"
  },
  {
    "listing_id": "rent_bengaluru_49_2",
    "society_name": "Sumadhura Vista Uttarahalli",
    "locality": "Uttarahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1425,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Uttarahalli. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_49_2"
  },
  {
    "listing_id": "rent_bengaluru_50_1",
    "society_name": "Prestige Splendour Anjanapura",
    "locality": "Anjanapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1134,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Anjanapura. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_50_1"
  },
  {
    "listing_id": "rent_bengaluru_50_2",
    "society_name": "Total Environment Solitaire Anjanapura",
    "locality": "Anjanapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1770,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Anjanapura. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_50_2"
  },
  {
    "listing_id": "rent_bengaluru_51_1",
    "society_name": "Puravankara Grandeur Arekere",
    "locality": "Arekere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 501,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Arekere. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_51_1"
  },
  {
    "listing_id": "rent_bengaluru_51_2",
    "society_name": "Godrej Residences Arekere",
    "locality": "Arekere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 140000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 502,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Arekere. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_51_2"
  },
  {
    "listing_id": "rent_bengaluru_52_1",
    "society_name": "Godrej Meadows Begur",
    "locality": "Begur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 84000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 504,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Begur. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_52_1"
  },
  {
    "listing_id": "rent_bengaluru_52_2",
    "society_name": "Godrej Meadows Begur",
    "locality": "Begur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2168,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Begur. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_52_2"
  },
  {
    "listing_id": "rent_bengaluru_53_1",
    "society_name": "Godrej Parkview Gottigere",
    "locality": "Gottigere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 35000,
    "deposit_inr": 105000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1689,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Gottigere. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_53_1"
  },
  {
    "listing_id": "rent_bengaluru_53_2",
    "society_name": "Assetz Vista Gottigere",
    "locality": "Gottigere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 66000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 480,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Gottigere. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_53_2"
  },
  {
    "listing_id": "rent_bengaluru_54_1",
    "society_name": "Brigade Gardenia Hulimavu",
    "locality": "Hulimavu",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 340000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 926,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hulimavu. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_54_1"
  },
  {
    "listing_id": "rent_bengaluru_54_2",
    "society_name": "Sobha Elegance Hulimavu",
    "locality": "Hulimavu",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1154,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hulimavu. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_54_2"
  },
  {
    "listing_id": "rent_bengaluru_55_1",
    "society_name": "Assetz Sanctuary Kothnur",
    "locality": "Kothnur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 489,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kothnur. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_55_1"
  },
  {
    "listing_id": "rent_bengaluru_55_2",
    "society_name": "Century Court Kothnur",
    "locality": "Kothnur",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2380,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kothnur. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_55_2"
  },
  {
    "listing_id": "rent_bengaluru_56_1",
    "society_name": "Total Environment Solitaire Basaveshwaranagar",
    "locality": "Basaveshwaranagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2056,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Basaveshwaranagar. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_56_1"
  },
  {
    "listing_id": "rent_bengaluru_56_2",
    "society_name": "Sobha Greens Basaveshwaranagar",
    "locality": "Basaveshwaranagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 126000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 992,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Basaveshwaranagar. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_56_2"
  },
  {
    "listing_id": "rent_bengaluru_57_1",
    "society_name": "Vaswani Parkview Kamakshipalya",
    "locality": "Kamakshipalya",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 112000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1563,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kamakshipalya. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_57_1"
  },
  {
    "listing_id": "rent_bengaluru_57_2",
    "society_name": "Assetz Palms Kamakshipalya",
    "locality": "Kamakshipalya",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2148,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kamakshipalya. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_57_2"
  },
  {
    "listing_id": "rent_bengaluru_58_1",
    "society_name": "Provident Solitaire Kengeri",
    "locality": "Kengeri",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 110000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1488,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kengeri. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_58_1"
  },
  {
    "listing_id": "rent_bengaluru_58_2",
    "society_name": "Godrej Gardenia Kengeri",
    "locality": "Kengeri",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2400,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kengeri. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_58_2"
  },
  {
    "listing_id": "rent_bengaluru_59_1",
    "society_name": "Vaswani Grandeur Mahalakshmi Layout",
    "locality": "Mahalakshmi Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1752,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mahalakshmi Layout. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_59_1"
  },
  {
    "listing_id": "rent_bengaluru_59_2",
    "society_name": "Prestige Court Mahalakshmi Layout",
    "locality": "Mahalakshmi Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1746,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Mahalakshmi Layout. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_59_2"
  },
  {
    "listing_id": "rent_bengaluru_60_1",
    "society_name": "Puravankara Palms Nagarbhavi",
    "locality": "Nagarbhavi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1042,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nagarbhavi. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_60_1"
  },
  {
    "listing_id": "rent_bengaluru_60_2",
    "society_name": "Divyasree Splendour Nagarbhavi",
    "locality": "Nagarbhavi",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1770,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nagarbhavi. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_60_2"
  },
  {
    "listing_id": "rent_bengaluru_61_1",
    "society_name": "Embassy Elegance Nandini Layout",
    "locality": "Nandini Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 902,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nandini Layout. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_61_1"
  },
  {
    "listing_id": "rent_bengaluru_61_2",
    "society_name": "Vaswani Gardenia Nandini Layout",
    "locality": "Nandini Layout",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1034,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nandini Layout. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_61_2"
  },
  {
    "listing_id": "rent_bengaluru_62_1",
    "society_name": "Vaswani Gardenia Nayandahalli",
    "locality": "Nayandahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1110,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nayandahalli. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_62_1"
  },
  {
    "listing_id": "rent_bengaluru_62_2",
    "society_name": "Mantri Palms Nayandahalli",
    "locality": "Nayandahalli",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 750000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2148,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nayandahalli. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_62_2"
  },
  {
    "listing_id": "rent_bengaluru_63_1",
    "society_name": "Total Environment Splendour Rajarajeshwari Nagar",
    "locality": "Rajarajeshwari Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 84000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2172,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Rajarajeshwari Nagar. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_63_1"
  },
  {
    "listing_id": "rent_bengaluru_63_2",
    "society_name": "Sumadhura Meadows Rajarajeshwari Nagar",
    "locality": "Rajarajeshwari Nagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 560,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Rajarajeshwari Nagar. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_63_2"
  },
  {
    "listing_id": "rent_bengaluru_64_1",
    "society_name": "Century Court Vijayanagar",
    "locality": "Vijayanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1485,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vijayanagar. Features 3BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_64_1"
  },
  {
    "listing_id": "rent_bengaluru_64_2",
    "society_name": "Salarpuria Sattva Elegance Vijayanagar",
    "locality": "Vijayanagar",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 156000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 593,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Vijayanagar. Features 1BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_64_2"
  },
  {
    "listing_id": "rent_bengaluru_65_1",
    "society_name": "Divyasree Greens Kengeri Satellite Town",
    "locality": "Kengeri Satellite Town",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2112,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kengeri Satellite Town. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_65_1"
  },
  {
    "listing_id": "rent_bengaluru_65_2",
    "society_name": "Puravankara Greens Kengeri Satellite Town",
    "locality": "Kengeri Satellite Town",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 509,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Kengeri Satellite Town. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_65_2"
  },
  {
    "listing_id": "rent_bengaluru_66_1",
    "society_name": "Century Vista Attibele",
    "locality": "Attibele",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1036,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Attibele. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_66_1"
  },
  {
    "listing_id": "rent_bengaluru_66_2",
    "society_name": "Rohan Parkview Attibele",
    "locality": "Attibele",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 110000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2172,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Attibele. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_66_2"
  },
  {
    "listing_id": "rent_bengaluru_67_1",
    "society_name": "TVS Emerald Splendour Anekal",
    "locality": "Anekal",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 340000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1086,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Anekal. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_67_1"
  },
  {
    "listing_id": "rent_bengaluru_67_2",
    "society_name": "TVS Emerald Greens Anekal",
    "locality": "Anekal",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 440000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 2292,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Anekal. Features 4BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_67_2"
  },
  {
    "listing_id": "rent_bengaluru_68_1",
    "society_name": "Provident Elegance Chandapura",
    "locality": "Chandapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 28000,
    "deposit_inr": 140000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1916,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Chandapura. Features 4BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_68_1"
  },
  {
    "listing_id": "rent_bengaluru_68_2",
    "society_name": "Brigade Gardenia Chandapura",
    "locality": "Chandapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1066,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Chandapura. Features 2BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_68_2"
  },
  {
    "listing_id": "rent_bengaluru_69_1",
    "society_name": "Sobha Residences Thavarekere",
    "locality": "Thavarekere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 66000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1040,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Thavarekere. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_69_1"
  },
  {
    "listing_id": "rent_bengaluru_69_2",
    "society_name": "Assetz Vista Thavarekere",
    "locality": "Thavarekere",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1626,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Thavarekere. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_69_2"
  },
  {
    "listing_id": "rent_bengaluru_70_1",
    "society_name": "Salarpuria Sattva Vista Chikkabanavara",
    "locality": "Chikkabanavara",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 330000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 467,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Chikkabanavara. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_70_1"
  },
  {
    "listing_id": "rent_bengaluru_70_2",
    "society_name": "Vaswani Splendour Chikkabanavara",
    "locality": "Chikkabanavara",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 450000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1004,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Chikkabanavara. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_70_2"
  },
  {
    "listing_id": "rent_bengaluru_71_1",
    "society_name": "Total Environment Gardenia Hesaraghatta",
    "locality": "Hesaraghatta",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 150000,
    "deposit_inr": 600000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 1156,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hesaraghatta. Features 2BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_71_1"
  },
  {
    "listing_id": "rent_bengaluru_71_2",
    "society_name": "Mantri Court Hesaraghatta",
    "locality": "Hesaraghatta",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 85000,
    "deposit_inr": 425000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1527,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Hesaraghatta. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_71_2"
  },
  {
    "listing_id": "rent_bengaluru_72_1",
    "society_name": "Brigade Splendour Jigani",
    "locality": "Jigani",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 2,
    "bathrooms": 2,
    "sqft": 976,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jigani. Features 2BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_72_1"
  },
  {
    "listing_id": "rent_bengaluru_72_2",
    "society_name": "Rohan Parkview Jigani",
    "locality": "Jigani",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 52000,
    "deposit_inr": 260000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1476,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Jigani. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_72_2"
  },
  {
    "listing_id": "rent_bengaluru_73_1",
    "society_name": "Assetz Parkview Nelamangala",
    "locality": "Nelamangala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 110000,
    "deposit_inr": 550000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1548,
    "furnishing": "Unfurnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nelamangala. Features 3BHK, unfurnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_73_1"
  },
  {
    "listing_id": "rent_bengaluru_73_2",
    "society_name": "Provident Enclave Nelamangala",
    "locality": "Nelamangala",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 42000,
    "deposit_inr": 168000,
    "bedrooms": 4,
    "bathrooms": 3,
    "sqft": 1852,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Nelamangala. Features 4BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_73_2"
  },
  {
    "listing_id": "rent_bengaluru_74_1",
    "society_name": "Brigade Meadows Sarjapura",
    "locality": "Sarjapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 1,
    "bathrooms": 1,
    "sqft": 564,
    "furnishing": "Semi-Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Sarjapura. Features 1BHK, semi-furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_74_1"
  },
  {
    "listing_id": "rent_bengaluru_74_2",
    "society_name": "Mahaveer Enclave Sarjapura",
    "locality": "Sarjapura",
    "city": "Bengaluru",
    "listing_type": "rent",
    "rent_inr": 22000,
    "deposit_inr": 88000,
    "bedrooms": 3,
    "bathrooms": 3,
    "sqft": 1524,
    "furnishing": "Fully Furnished",
    "availability_status": "Available",
    "description": "Verified rental property from bengaluru.rent in Sarjapura. Features 3BHK, fully furnished layout, 24/7 security, and power backup.",
    "images": [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80"
    ],
    "contact_type": "Platform Agent",
    "contact_ref": "REF-rent_bengaluru_74_2"
  }
];

export default function App() {
  const [activeView, setActiveView] = useState('landing');
  const [activePersona, setActivePersona] = useState('Renter');
  const [selectedLocality, setSelectedLocality] = useState('All Bengaluru');
  const [shortlist, setShortlist] = useState(initialListings);
  const [sellerListings, setSellerListings] = useState([]);
  const [comparedListings, setComparedListings] = useState([]);
  const [buyerFilterType, setBuyerFilterType] = useState('rent'); // Focus strictly on rent
  const [selectedSpotlightProperty, setSelectedSpotlightProperty] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Permanent Dark Mode Lock
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('scout_theme', 'dark');
  }, []);

  // Favorites State with localStorage Persistence
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('scout_favorite_properties');
      return saved ? JSON.parse(saved) : ['blr_ind_1020'];
    } catch (e) {
      return ['blr_ind_1020'];
    }
  });

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [emiModalOpen, setEmiModalOpen] = useState(false);
  const [emiModalPrice, setEmiModalPrice] = useState(12500000);

  // Sync favorites
  useEffect(() => {
    localStorage.setItem('scout_favorite_properties', JSON.stringify(favorites));
  }, [favorites]);

  // Automatically trigger background live sync from bengaluru.rent on load
  useEffect(() => {
    const autoSyncBackendListings = async () => {
      try {
        const res = await fetch(apiUrl('/api/listings'));
        const data = await res.json();
        if (data.listings && data.listings.length > 0) {
          setShortlist(prev => data.listings.length >= prev.length ? data.listings : prev);
        }
      } catch (e) {
        console.warn("Notice: background backend sync on mount:", e);
      }
    };
    autoSyncBackendListings();
  }, []);

  const toggleFavorite = (propertyId) => {
    setFavorites(prev => 
      prev.includes(propertyId) ? prev.filter(id => id !== propertyId) : [...prev, propertyId]
    );
  };
  
  // Explicit Buyer State Machine
  const [buyerStep, setBuyerStep] = useState(0);
  const [buyerData, setBuyerData] = useState({
    listingType: 'rent',
    locality: '',
    localities: [],
    maxBudget: null,
    bedrooms: null,
    isPenthouse: false,
    familyPreferences: '',
    softPreferences: [],
    requirementsAsked: false
  });

  const buyerStepRef = useRef(buyerStep);
  buyerStepRef.current = buyerStep;

  const buyerDataRef = useRef(buyerData);
  buyerDataRef.current = buyerData;

  const [bookingCompleted, setBookingCompleted] = useState(false);
  const bookingCompletedRef = useRef(bookingCompleted);
  bookingCompletedRef.current = bookingCompleted;

  const [pendingLocalityConfirm, setPendingLocalityConfirm] = useState(null);
  const pendingLocalityConfirmRef = useRef(pendingLocalityConfirm);
  pendingLocalityConfirmRef.current = pendingLocalityConfirm;

  const [awaitingScopeContinue, setAwaitingScopeContinue] = useState(false);
  const awaitingScopeContinueRef = useRef(awaitingScopeContinue);
  awaitingScopeContinueRef.current = awaitingScopeContinue;

  const shortlistRef = useRef(shortlist);
  shortlistRef.current = shortlist;

  const hasSearchedRef = useRef(hasSearched);
  hasSearchedRef.current = hasSearched;

  // Seller Intake Interview State Machine
  const [sellerStep, setSellerStep] = useState(0);
  const [sellerData, setSellerData] = useState({
    listingType: 'sale',
    locality: 'Koramangala',
    title: '',
    bedrooms: 2,
    price: null,
    notes: ''
  });

  // Voice HUD & Dialogue States
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [unrecognizedRepeatCount, setUnrecognizedRepeatCount] = useState(0);

  // Modals & Drawers
  const [activeModal, setActiveModal] = useState(null);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [bookingProperty, setBookingProperty] = useState(null);
  const [voiceBookingStep, setVoiceBookingStep] = useState(null);
  const [voiceBookingDraft, setVoiceBookingDraft] = useState({
    visitDate: '',
    timeSlot: '',
    name: '',
    email: '',
    phone: ''
  });

  const voiceBookingStepRef = useRef(voiceBookingStep);
  voiceBookingStepRef.current = voiceBookingStep;
  const bookingPropertyRef = useRef(bookingProperty);
  bookingPropertyRef.current = bookingProperty;
  const voiceBookingDraftRef = useRef(voiceBookingDraft);
  voiceBookingDraftRef.current = voiceBookingDraft;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const activeRecognitionRef = useRef(null);
  const bargeInRecognitionRef = useRef(null);
  const vadDetectorRef = useRef(null);
  const micStreamRef = useRef(null);
  const bargeInPendingRef = useRef(false);
  const bargeInListenFallbackRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const speechKeepAliveIntervalRef = useRef(null);
  const sentenceWatchdogTimerRef = useRef(null);
  const isVoiceModeActiveRef = useRef(false);
  const isPlayingAudioRef = useRef(false);
  const listenTimeoutRef = useRef(null);
  const speechCancelledRef = useRef(false);
  const speechStartTimeoutRef = useRef(null);
  const bargeInArmTimeoutRef = useRef(null);

  const stopBargeInMonitoring = () => {
    if (bargeInArmTimeoutRef.current) {
      clearTimeout(bargeInArmTimeoutRef.current);
      bargeInArmTimeoutRef.current = null;
    }
    if (bargeInListenFallbackRef.current) {
      clearTimeout(bargeInListenFallbackRef.current);
      bargeInListenFallbackRef.current = null;
    }
    bargeInPendingRef.current = false;

    if (vadDetectorRef.current) {
      vadDetectorRef.current.stop();
      vadDetectorRef.current = null;
    }
    if (bargeInRecognitionRef.current) {
      try { bargeInRecognitionRef.current.abort(); } catch (e) {}
      bargeInRecognitionRef.current = null;
    }
  };

  const cancelAgentPlayback = () => {
    speechCancelledRef.current = true;
    isPlayingAudioRef.current = false;
    setIsPlayingAudio(false);

    if (speechKeepAliveIntervalRef.current) {
      clearInterval(speechKeepAliveIntervalRef.current);
      speechKeepAliveIntervalRef.current = null;
    }
    if (sentenceWatchdogTimerRef.current) {
      clearTimeout(sentenceWatchdogTimerRef.current);
      sentenceWatchdogTimerRef.current = null;
    }
    if (speechStartTimeoutRef.current) {
      clearTimeout(speechStartTimeoutRef.current);
      speechStartTimeoutRef.current = null;
    }
    if (bargeInArmTimeoutRef.current) {
      clearTimeout(bargeInArmTimeoutRef.current);
      bargeInArmTimeoutRef.current = null;
    }
    currentUtteranceRef.current = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const finishBargeIn = (transcript = '') => {
    stopBargeInMonitoring();
    cancelAgentPlayback();

    isVoiceModeActiveRef.current = true;
    const trimmed = normalizeInterruptTranscript(transcript);

    if (shouldProcessBargeInTranscript(trimmed)) {
      handleProcessQuery(trimmed, true);
      return;
    }

    if (trimmed) {
      setTranscriptHistory(prev => [...prev, { role: 'user', text: trimmed }]);
    }
    startListeningInternal();
  };

  const handleVadSpeechStart = () => {
    if (!isPlayingAudioRef.current) return;
    // Energy alone must NOT cancel TTS — wait for a confirmed transcript (BUG 053).
    bargeInPendingRef.current = true;
  };

  const startBargeInMonitoring = async () => {
    stopBargeInMonitoring();

    if (!micStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn('Mic access for VAD failed:', err);
      }
    }

    try {
      const detector = await createVoiceActivityDetector({
        existingStream: micStreamRef.current || undefined,
        onSpeechStart: handleVadSpeechStart,
      });
      vadDetectorRef.current = detector;
      const stream = await detector.start();
      if (!micStreamRef.current) {
        micStreamRef.current = stream;
      }
    } catch (err) {
      console.warn('VAD start failed:', err);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onresult = (event) => {
        if (!isPlayingAudioRef.current && !bargeInPendingRef.current) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0]?.transcript;
          if (chunk) transcript = chunk;
        }

        if (!shouldTriggerBargeIn(transcript)) return;

        if (isPlayingAudioRef.current) {
          cancelAgentPlayback();
        }
        bargeInPendingRef.current = false;
        finishBargeIn(transcript);
      };

      rec.onerror = (e) => {
        if (e.error !== 'aborted') {
          console.warn('Barge-in recognition error:', e.error);
        }
      };

      bargeInRecognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn('Barge-in recognition start failed:', err);
    }
  };

  const stopVoice = () => {
    speechCancelledRef.current = true;
    isVoiceModeActiveRef.current = false;
    isPlayingAudioRef.current = false;

    stopBargeInMonitoring();

    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
    if (speechStartTimeoutRef.current) {
      clearTimeout(speechStartTimeoutRef.current);
      speechStartTimeoutRef.current = null;
    }
    if (bargeInArmTimeoutRef.current) {
      clearTimeout(bargeInArmTimeoutRef.current);
      bargeInArmTimeoutRef.current = null;
    }
    if (speechKeepAliveIntervalRef.current) {
      clearInterval(speechKeepAliveIntervalRef.current);
      speechKeepAliveIntervalRef.current = null;
    }
    if (sentenceWatchdogTimerRef.current) {
      clearTimeout(sentenceWatchdogTimerRef.current);
      sentenceWatchdogTimerRef.current = null;
    }
    currentUtteranceRef.current = null;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeRecognitionRef.current) {
      try { activeRecognitionRef.current.abort(); } catch (e) {}
      activeRecognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setIsListening(false);
    setIsPlayingAudio(false);
  };

  const startListening = async (speakGreetingIfFirst = false, resumeForSiteVisit = false, voiceBookingOnly = false) => {
    stopVoice();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn("Microphone access denied or blocked:", err);
        alert("Microphone permission is required to use Voice AI. Please allow microphone access in your browser address bar.");
        setIsListening(false);
        return;
      }
    }

    if (voiceBookingOnly) {
      startListeningInternal();
      return;
    }

    if (speakGreetingIfFirst && transcriptHistory.length === 0) {
      const greeting = "Welcome to Property Scout — your AI rental assistant for Bengaluru! Tell me what you're looking for and let's find your perfect home together.";
      setTranscriptHistory([{ role: 'assistant', text: greeting }]);
      speakText(greeting, true);
      return;
    }

    if (resumeForSiteVisit && !bookingCompletedRef.current) {
      const list = shortlistRef.current || shortlist;
      const picked = userAlreadyPickedShortlistProperty(transcriptHistory, list);
      if (picked) {
        startVoiceSiteVisitBooking(picked, true);
        return;
      }
      const resumeMsg = list.length === 1
        ? `Ready when you are! Say "${list[0]?.society_name || 'the property name'}" or "book a site visit" and I'll get your visit scheduled in no time.`
        : "You've got some great options on screen! Tell me which property you'd like to visit — say the name or ask me to book a site visit.";
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: resumeMsg }]);
      speakText(resumeMsg, true);
      return;
    }

    startListeningInternal();
  };

  const startListeningInternal = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please type your query in the text box below.");
      return;
    }

    try {
      if (activeRecognitionRef.current) {
        try { activeRecognitionRef.current.abort(); } catch (e) {}
      }

      isVoiceModeActiveRef.current = true;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => {
        setIsListening(false);
        if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current) {
          if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
          listenTimeoutRef.current = setTimeout(() => {
            if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current) {
              startListeningInternal();
            }
          }, 400);
        }
      };
      rec.onresult = (event) => {
        const speechText = event.results[0][0]?.transcript;
        if (speechText && speechText.trim()) {
          isVoiceModeActiveRef.current = false;
          if (listenTimeoutRef.current) {
            clearTimeout(listenTimeoutRef.current);
            listenTimeoutRef.current = null;
          }
          if (activeRecognitionRef.current) {
            try { activeRecognitionRef.current.abort(); } catch (e) {}
          }
          handleProcessQuery(speechText.trim(), true);
        }
      };
      
      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
        if (e.error === 'aborted') return;
        if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current && e.error === 'no-speech') {
          if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
          listenTimeoutRef.current = setTimeout(() => {
            if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current) {
              startListeningInternal();
            }
          }, 400);
        }
      };

      activeRecognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn("Speech recognition start error:", e);
      setIsListening(false);
    }
  };

  const speakText = (text, autoListenAfter = false) => {
    if (!('speechSynthesis' in window) || !text) return;

    try {
      speechCancelledRef.current = false;
      window.speechSynthesis.cancel();
      if (listenTimeoutRef.current) {
        clearTimeout(listenTimeoutRef.current);
        listenTimeoutRef.current = null;
      }
      if (speechKeepAliveIntervalRef.current) {
        clearInterval(speechKeepAliveIntervalRef.current);
      }
      if (sentenceWatchdogTimerRef.current) {
        clearTimeout(sentenceWatchdogTimerRef.current);
      }

      if (activeRecognitionRef.current) {
        try { activeRecognitionRef.current.abort(); } catch (e) {}
        setIsListening(false);
      }

      // Sanitize special currency symbols (₹ -> Rupees) and number commas so Web Speech API never errors or truncates on price strings
      const cleanText = text.trim().replace(/₹/g, 'Rupees ').replace(/(\d+),(\d+)/g, '$1$2');
      const rawSentences = cleanText.split(/(?<=[.!?])\s+/);
      const sentences = rawSentences.map(s => s.trim()).filter(Boolean);
      if (sentences.length === 0) sentences.push(cleanText);

      let currentIndex = 0;
      setIsPlayingAudio(true);
      isPlayingAudioRef.current = true;
      if (autoListenAfter) {
        isVoiceModeActiveRef.current = true;
      }

      // Defer barge-in until TTS is underway — prevents laptop speaker bleed from cutting speech
      if (bargeInArmTimeoutRef.current) {
        clearTimeout(bargeInArmTimeoutRef.current);
      }
      bargeInArmTimeoutRef.current = setTimeout(() => {
        bargeInArmTimeoutRef.current = null;
        if (!speechCancelledRef.current && isPlayingAudioRef.current) {
          startBargeInMonitoring();
        }
      }, 1600);

      const speakNextSentence = () => {
        if (speechCancelledRef.current) {
          setIsPlayingAudio(false);
          isPlayingAudioRef.current = false;
          stopBargeInMonitoring();
          return;
        }

        if (sentenceWatchdogTimerRef.current) {
          clearTimeout(sentenceWatchdogTimerRef.current);
        }

        if (currentIndex >= sentences.length) {
          setIsPlayingAudio(false);
          isPlayingAudioRef.current = false;
          stopBargeInMonitoring();
          if (speechKeepAliveIntervalRef.current) {
            clearInterval(speechKeepAliveIntervalRef.current);
            speechKeepAliveIntervalRef.current = null;
          }
          currentUtteranceRef.current = null;
          if (autoListenAfter && !speechCancelledRef.current) {
            setTimeout(() => {
              if (!speechCancelledRef.current) {
                startListeningInternal();
              }
            }, 500);
          }
          return;
        }

        const sentenceText = sentences[currentIndex];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        currentUtteranceRef.current = utterance;

        const voices = window.speechSynthesis.getVoices();
        const sweetVoice = voices.find(v => 
          v.name.includes("Google UK English Female") ||
          v.name.includes("Google US English") ||
          v.name.includes("Samantha") ||
          v.name.includes("Karen") ||
          v.name.includes("Victoria") ||
          (v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        ) || voices.find(v => v.lang.startsWith("en"));

        if (sweetVoice) utterance.voice = sweetVoice;
        utterance.pitch = 1.05;
        utterance.rate = 0.95;

        let sentenceDone = false;
        const advanceToNext = () => {
          if (speechCancelledRef.current) return;
          if (sentenceDone) return;
          sentenceDone = true;
          if (sentenceWatchdogTimerRef.current) {
            clearTimeout(sentenceWatchdogTimerRef.current);
          }
          currentIndex++;
          speakNextSentence();
        };

        utterance.onend = advanceToNext;
        utterance.onerror = (e) => {
          console.warn("Speech synthesis sentence error:", e);
          advanceToNext();
        };

        // Safety Watchdog: If browser drops onend event, automatically advance after estimated sentence duration
        const maxDurationMs = Math.max(3500, sentenceText.length * 110);
        sentenceWatchdogTimerRef.current = setTimeout(() => {
          console.warn("Speech synthesis watchdog advance triggered for sentence:", sentenceText);
          advanceToNext();
        }, maxDurationMs);

        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      };

      speechKeepAliveIntervalRef.current = setInterval(() => {
        if (speechCancelledRef.current) return;
        if (window.speechSynthesis?.paused) {
          window.speechSynthesis.resume();
        }
      }, 1000);

      if (speechStartTimeoutRef.current) {
        clearTimeout(speechStartTimeoutRef.current);
      }
      speechStartTimeoutRef.current = setTimeout(() => {
        if (speechCancelledRef.current) return;
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Chrome/Safari on fresh devices may not have voices until onvoiceschanged
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            if (!speechCancelledRef.current) speakNextSentence();
          };
          return;
        }
        speakNextSentence();
      }, 120);

    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsPlayingAudio(false);
    }
  };

  const handleSpeakWelcome = () => {
    startListening(true);
  };

  const handleSelectRole = (role) => {
    stopVoice();
    const targetRole = role === 'Buyer' ? 'Renter' : role;
    setActivePersona(targetRole);
    setActiveView('command');
    setBuyerFilterType('rent');
    // Voice starts only when user clicks Speak — never auto-start here
  };

  const handlePersonaChange = (newPersona) => {
    handleSelectRole(newPersona);
  };

  const publishSellerListing = (data) => {
    if (!data.price) return;

    const finalType = data.listingType || (data.price >= 5000000 ? 'sale' : 'rent');

    const createdItem = {
      listing_id: `prop_seller_${Date.now()}`,
      society_name: data.title || "Prestige Residence",
      locality: data.locality || "Koramangala",
      city: 'Bengaluru',
      listing_type: finalType,
      rent_inr: finalType === 'rent' ? data.price : null,
      sale_price_inr: finalType === 'sale' ? data.price : null,
      bedrooms: data.bedrooms || 2,
      sqft: data.sqft || 1250,
      furnishing: data.furnishing || 'Fully Furnished',
      images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"],
      description: data.notes || 'Listed via AI Voice Scout'
    };

    setShortlist(prev => [createdItem, ...prev]);
    setSellerListings(prev => [createdItem, ...prev]);
    setSellerStep(0);

    const formattedPriceStr = formatIndianCurrencyDisplay(data.price, finalType);
    const successMessage = `Congratulations! Your ${createdItem.bedrooms} BHK flat at ${createdItem.society_name} in ${createdItem.locality} has been published for ${finalType === 'sale' ? 'Sale' : 'Rent'} at ${formattedPriceStr}! It is now live on the website.`;
    
    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: successMessage }]);
    speakText(successMessage);
  };

  const completeSiteVisitBooking = (details = {}, triggerAudio = true) => {
    setVoiceBookingStep(null);
    setVoiceBookingDraft({ visitDate: '', timeSlot: '', name: '', email: '', phone: '' });
    setBookingCompleted(true);
    setBuyerStep(BUYER_STEP_BOOKING_COMPLETED);
    const msg = buildBookingCompletedMessage(details);
    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
    if (triggerAudio) speakText(msg, false);
  };

  const cancelVoiceSiteVisitBooking = (triggerAudio = true) => {
    setVoiceBookingStep(null);
    setVoiceBookingDraft({ visitDate: '', timeSlot: '', name: '', email: '', phone: '' });
    setBookingProperty(null);
    const msg = 'No worries — booking cancelled. Just say another property name whenever you\'re ready to try again!';
    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
    if (triggerAudio) speakText(msg, true);
  };

  const startVoiceSiteVisitBooking = (property, triggerAudio = true) => {
    if (!property) return;
    if (bookingCompletedRef.current || isBookingCompletedStep(buyerStepRef.current)) {
      const msg = BOOKING_COMPLETED_THANK_YOU;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
      if (triggerAudio) speakText(msg, false);
      return;
    }
    setVoiceBookingStep(null);
    setVoiceBookingDraft({ visitDate: '', timeSlot: '', name: '', email: '', phone: '' });
    setBookingProperty(property);
    const msg = `Excellent choice! I've opened the site visit booking for ${property.society_name} — pick your date, time slot, and email, and I'll send your confirmation right away.`;
    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
    if (triggerAudio) speakText(msg, true);
  };

  const formatAvailableSlotsForSpeech = (statusMap) => {
    const free = SITE_VISIT_TIME_SLOTS.filter((slot) => statusMap[slot]?.is_available);
    return free.length > 0 ? free.join(', ') : 'no broker slots available';
  };

  const handleVoiceBookingTurn = async (userQuery, triggerAudio = true) => {
    const step = voiceBookingStepRef.current;
    const property = bookingPropertyRef.current;
    const draft = { ...voiceBookingDraftRef.current };
    const q = userQuery.toLowerCase().trim();

    if (!step || !property) {
      setVoiceBookingStep(null);
      return;
    }

    if (q.includes('cancel') || q.includes('stop booking') || q.includes('not now')) {
      cancelVoiceSiteVisitBooking(triggerAudio);
      return;
    }

    const speakAssistant = (msg) => {
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
      if (triggerAudio) speakText(msg, true);
    };

    if (step === 'date') {
      const visitDate = parseVisitDateFromText(userQuery);
      if (!visitDate) {
        speakAssistant('I did not catch the date. Please say tomorrow or a date like 15 August.');
        return;
      }
      draft.visitDate = visitDate;
      setVoiceBookingDraft(draft);

      const statusMap = await fetchBrokerSlotAvailability(visitDate);
      const freeSlots = formatAvailableSlotsForSpeech(statusMap);
      setVoiceBookingStep('time');
      speakAssistant(
        `For ${formatVisitDateForSpeech(visitDate)}, available broker slots are: ${freeSlots}. Which time slot would you like?`
      );
      return;
    }

    if (step === 'time') {
      const slot = parseTimeSlotFromText(userQuery);
      if (!slot) {
        const statusMap = await fetchBrokerSlotAvailability(draft.visitDate);
        speakAssistant(
          `Please pick a time slot. Available slots are: ${formatAvailableSlotsForSpeech(statusMap)}.`
        );
        return;
      }

      let slotAvailable = true;
      try {
        const res = await fetch(
          apiUrl(`/api/brokers/availability?visit_date=${draft.visitDate}&time_slot=${encodeURIComponent(slot)}`)
        );
        const data = await res.json();
        slotAvailable = data.is_available;
      } catch {
        slotAvailable = true;
      }

      if (!slotAvailable) {
        const statusMap = await fetchBrokerSlotAvailability(draft.visitDate);
        speakAssistant(
          `Sorry, ${slot} is fully booked. Available slots are: ${formatAvailableSlotsForSpeech(statusMap)}.`
        );
        return;
      }

      draft.timeSlot = slot;
      setVoiceBookingDraft(draft);
      setVoiceBookingStep('name');
      speakAssistant('What is your full name for the booking?');
      return;
    }

    if (step === 'name') {
      const name = userQuery.replace(/^(my name is|i am|this is)\s+/i, '').trim();
      if (!name || name.length < 2) {
        speakAssistant('Please tell me your full name for the site visit booking.');
        return;
      }
      draft.name = name;
      setVoiceBookingDraft(draft);
      setVoiceBookingStep('phone');
      speakAssistant('What is your phone number with country code?');
      return;
    }

    if (step === 'phone') {
      const phone = extractPhoneFromText(userQuery) || userQuery.replace(/[^\d+\-\s]/g, '').trim();
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        speakAssistant('Please provide a valid phone number, for example plus 91 9876543210.');
        return;
      }
      draft.phone = phone;
      setVoiceBookingDraft(draft);
      setVoiceBookingStep('email');
      speakAssistant('What is your email address? We will send the confirmation email and calendar invite there.');
      return;
    }

    if (step === 'email') {
      const email = extractEmailFromText(userQuery) || (userQuery.includes('@') ? userQuery.trim() : null);
      if (!email || !email.includes('@')) {
        speakAssistant('Please provide a valid email address for your confirmation email.');
        return;
      }
      draft.email = email;
      setVoiceBookingDraft(draft);

      try {
        const data = await submitSiteVisitRequest(property, draft);

        if (!data.success) {
          const busyMsg = data.message || `All brokers are busy for ${draft.timeSlot}. Please choose another time slot.`;
          setVoiceBookingStep('time');
          const statusMap = await fetchBrokerSlotAvailability(draft.visitDate);
          speakAssistant(
            `${busyMsg} Available slots are: ${formatAvailableSlotsForSpeech(statusMap)}.`
          );
          return;
        }

        const brokerName = data.broker?.name || 'your assigned broker';
        completeSiteVisitBooking({
          propertyName: property.society_name,
          visitDate: formatVisitDateForSpeech(draft.visitDate),
          timeSlot: draft.timeSlot,
          email: draft.email,
          brokerName,
        }, triggerAudio);
      } catch (err) {
        console.warn('Voice site visit submit failed:', err);
        speakAssistant(
          'I could not complete the booking right now. Please use the Schedule Visit button on the property card, or try again in a moment.'
        );
        setBookingProperty(property);
      }
    }
  };

  const executeBuyerFilter = (data) => {
    try {
    const allProperties = [
      ...normalizeListings(shortlist.length > 0 ? shortlist : initialListings),
      ...normalizeListings(sellerListings)
    ];
    let filtered = [...allProperties];

    // Determine target localities array
    let targetLocalities = [];
    if (data.localities && Array.isArray(data.localities) && data.localities.length > 0) {
      targetLocalities = data.localities.map(resolveListingLocality);
    } else if (data.locality && data.locality !== 'All Bengaluru') {
      targetLocalities = data.locality.split(' & ').map(resolveListingLocality);
    } else if (selectedLocality !== 'All Bengaluru' && selectedLocality !== 'Koramangala & Indiranagar') {
      targetLocalities = [resolveListingLocality(selectedLocality)];
    }

    // 1. Locality Filter (Multi-Locality Matching — strict, no silent skip)
    if (targetLocalities.length > 0 && !targetLocalities.includes('All Bengaluru')) {
      const locMatches = filtered.filter((item) =>
        targetLocalities.some((loc) => propertyMatchesLocality(item, loc))
      );
      filtered = locMatches;
    }

    const localityDisplay = targetLocalities.length > 1 
      ? targetLocalities.join(' & ') 
      : (targetLocalities[0] || 'Koramangala');

    // 2. Listing Type Filter (Hard Constraint: rent vs sale)
    const listingType = data.listingType || 'rent';
    if (listingType) {
      filtered = filtered.filter(item => item.listing_type === listingType);
    }

    // 3. Bedrooms / BHK / Penthouse Filter (Strict Hard Constraint — NO 2BHK leak when 3BHK requested!)
    if (data.isPenthouse || data.bedrooms === 'penthouse') {
      filtered = filtered.filter(item => 
        (item.society_name && item.society_name.toLowerCase().includes('penthouse')) ||
        (item.description && item.description.toLowerCase().includes('penthouse')) ||
        (item.property_type && item.property_type.toLowerCase().includes('penthouse')) ||
        (item.bedrooms && item.bedrooms >= 4)
      );
    } else if (data.bedrooms !== null && data.bedrooms !== undefined) {
      if (Array.isArray(data.bedrooms) && data.bedrooms.length > 0) {
        const targetBhks = data.bedrooms.map(b => Number(b)).filter(b => !isNaN(b));
        if (targetBhks.length > 0) {
          filtered = filtered.filter(item => targetBhks.includes(item.bedrooms));
        }
      } else {
        const targetBhk = Number(data.bedrooms);
        if (!isNaN(targetBhk)) {
          filtered = filtered.filter(item => item.bedrooms === targetBhk);
        }
      }
    }

    // 4. Zero Match Fallback — Retrieve & suggest required size properties in nearby localities!
    if (filtered.length === 0) {
      let nearbyAlternatives = allProperties.filter(item => item.listing_type === listingType);
      if (data.bedrooms) {
        if (Array.isArray(data.bedrooms) && data.bedrooms.length > 0) {
          const targetBhks = data.bedrooms.map(Number);
          const bhkMatches = nearbyAlternatives.filter(item => targetBhks.includes(item.bedrooms));
          if (bhkMatches.length > 0) nearbyAlternatives = bhkMatches;
        } else if (data.bedrooms !== 'penthouse') {
          const bhkMatches = nearbyAlternatives.filter(item => item.bedrooms === Number(data.bedrooms));
          if (bhkMatches.length > 0) nearbyAlternatives = bhkMatches;
        }
      }
      nearbyAlternatives = nearbyAlternatives.slice(0, 3);
      setShortlist(nearbyAlternatives);
      setSelectedLocality(localityDisplay);
      setBuyerFilterType(listingType);
      setHasSearched(true);
      setBuyerStep(5); // Transition to Post-Discovery Completed Mode!

      const noMatchMsg = nearbyAlternatives.length > 0
        ? `No exact match in that area, but don't worry — I've lined up ${nearbyAlternatives.length} nearby alternatives that might surprise you! ${getPostDiscoveryBrowsePrompt(nearbyAlternatives)}`
        : `Hmm, nothing came up this time — try tweaking your budget or neighborhood and we'll find something great together!`;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: noMatchMsg }]);
      speakText(noMatchMsg, false);
      setUnrecognizedRepeatCount(0);
      return;
    }

    // 5. Budget Filter (Hard Constraint with Smart Fallback)
    let budgetConstraintMet = true;
    if (data.maxBudget) {
      const priceMatch = filtered.filter(item => {
        const price = item.listing_type === 'rent' ? item.rent_inr : item.sale_price_inr;
        return price && price <= data.maxBudget;
      });
      if (priceMatch.length > 0) {
        filtered = priceMatch;
      } else {
        budgetConstraintMet = false;
        // Sort ascending by rent/price so closest affordable options appear
        filtered.sort((a, b) => (a.rent_inr || a.sale_price_inr || 0) - (b.rent_inr || b.sale_price_inr || 0));
      }
    }

    // 6. Furnishing Filter (Fully Furnished / Semi-Furnished matching)
    const softPreferences = data.softPreferences || [];
    const furnishedPref = softPreferences.find((pref) => pref.id === 'furnished');
    const preferenceText = (data.familyPreferences || '').toLowerCase();
    if (furnishedPref || preferenceText.includes('furnished')) {
      const isFully = preferenceText.includes('fully');
      const furnishedMatch = filtered.filter(item => {
        if (!item.furnishing) return true;
        if (isFully) return item.furnishing.toLowerCase().includes('fully');
        return item.furnishing.toLowerCase().includes('furnished');
      });
      if (furnishedMatch.length > 0) {
        filtered = furnishedMatch;
      }
    }

    if (softPreferences.length > 0) {
      filtered = [...filtered].sort(
        (a, b) => scorePropertyForPreferences(b, softPreferences) - scorePropertyForPreferences(a, softPreferences)
      );
    }

    // Update buyer state so UI remains strictly in sync
    setBuyerData(prev => ({
      ...prev,
      locality: localityDisplay,
      localities: targetLocalities,
      bedrooms: data.bedrooms,
      isPenthouse: data.isPenthouse || false,
      maxBudget: data.maxBudget,
      softPreferences: data.softPreferences || prev.softPreferences || [],
      requirementsAsked: true,
    }));

    // Always update UI state & reset interview step to finish voice flow
    setShortlist(filtered);
    setSelectedLocality(localityDisplay);
    setBuyerFilterType(listingType);
    setHasSearched(true);
    setBuyerStep(5); // Transition to Post-Discovery Completed Mode!

    // 7. Generate & Speak Final Verdict with explicit property recommendations covering all requested BHKs
    let selectedProps = [];
    if (Array.isArray(data.bedrooms) && data.bedrooms.length > 1) {
      const bhkList = data.bedrooms.map(Number);
      bhkList.forEach(bhk => {
        const found = filtered.find(p => p.bedrooms === bhk && !selectedProps.includes(p));
        if (found) selectedProps.push(found);
      });
      filtered.forEach(p => {
        if (selectedProps.length < 3 && !selectedProps.includes(p)) {
          selectedProps.push(p);
        }
      });
    } else {
      selectedProps = filtered.slice(0, 3);
    }

    const verdictMsg = buildShortlistVerdict({
      properties: selectedProps,
      preferences: softPreferences,
      locality: localityDisplay,
      budget: data.maxBudget,
      bedrooms: data.bedrooms,
    });

    if (!budgetConstraintMet && data.maxBudget) {
      const budgetMsg = `I couldn't find exact matches within your budget, but these are the closest great options in ${localityDisplay}! ${verdictMsg}`;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: budgetMsg }]);
      speakText(budgetMsg, false);
    } else {
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: verdictMsg }]);
      speakText(verdictMsg, false);
    }
    setUnrecognizedRepeatCount(0);
    } catch (err) {
      console.error('Property search failed:', err);
      const errMsg = 'Oops — no properties matched that search. Try adjusting your budget or neighborhood and we\'ll hunt down something perfect for you!';
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: errMsg }]);
      speakText(errMsg, false);
    }
  };

  // Reset Session — clears state; user must click Speak to begin (same entry greeting on first Speak)
  const handleResetSession = () => {
    stopVoice();
    setBuyerStep(0);
    setSellerStep(0);
    setBuyerData({
      listingType: 'rent',
      locality: '',
      localities: [],
      maxBudget: null,
      bedrooms: null,
      isPenthouse: false,
      familyPreferences: '',
      softPreferences: [],
      requirementsAsked: false
    });
    setShortlist(initialListings);
    setSelectedLocality('All Bengaluru');
    setBuyerFilterType('rent');
    setHasSearched(false);
    setShowFavoritesOnly(false);
    setUnrecognizedRepeatCount(0);
    setVoiceBookingStep(null);
    setVoiceBookingDraft({ visitDate: '', timeSlot: '', name: '', email: '', phone: '' });
    setBookingProperty(null);
    setBookingCompleted(false);
    setPendingLocalityConfirm(null);
    setAwaitingScopeContinue(false);
    setTranscriptHistory([]);
  };

  // Process User Query
  const handleProcessQuery = (userQuery, triggerAudio = true) => {
    stopVoice();
    setTranscriptHistory(prev => [...prev, { role: 'user', text: userQuery }]);

    const q = userQuery.toLowerCase();
    const parsedPrice = parseIndianCurrencyStrict(userQuery);
    let extractedLocalities = extractLocalitiesFromText(userQuery);
    const fuzzyLocality = extractedLocalities.length === 0 ? fuzzyResolveLocality(userQuery) : null;
    if (extractedLocalities.length === 0 && fuzzyLocality?.locality && !fuzzyLocality.needsConfirmation) {
      extractedLocalities = [fuzzyLocality.locality];
    }
    const extractedLocality = extractedLocalities.length > 0 ? extractedLocalities[0] : null;
    const currentStep = buyerStepRef.current;
    const currentData = buyerDataRef.current;
    const pendingLoc = pendingLocalityConfirmRef.current;

    // Voice site-visit interview (date → time → name → phone → email → confirm)
    if (voiceBookingStepRef.current) {
      handleVoiceBookingTurn(userQuery, triggerAudio);
      return;
    }

    // After successful booking — stay completed; never restart visit flow
    if (bookingCompletedRef.current || isBookingCompletedStep(currentStep)) {
      const wantsNewSearch = isRentalIntent(userQuery) || extractedLocalities.length > 0;
      if (wantsNewSearch) {
        bookingCompletedRef.current = false;
        setBookingCompleted(false);
        setBuyerStep(0);
      } else {
        const msg = BOOKING_COMPLETED_THANK_YOU;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: msg }]);
        if (triggerAudio) speakText(msg, false);
        return;
      }
    }

    // Purchase intent — rental-only platform; never advance scripted interview
    if (isPurchaseIntent(userQuery)) {
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: PURCHASE_DECLINE_MSG }]);
      if (triggerAudio) speakText(PURCHASE_DECLINE_MSG, true);
      return;
    }

    if (q.includes('seller mode') || q.includes('landlord mode') || q.includes('bechna hai')) {
      handlePersonaChange('Seller');
      return;
    }

    // Reset / Fresh session command
    if (q.includes('fresh session') || q.includes('new session') || q.includes('start fresh') || q.includes('reset session') || q.includes('start over') || q.includes('clear chat') || (q.includes('cancel') && !voiceBookingStepRef.current) || q.includes('reset')) {
      handleResetSession();
      return;
    }



    // Helper for handling unrecognized speech input: asks to repeat twice, then prompts user to type in chat window
    const triggerRepeatOrFallback = (promptMsg) => {
      setUnrecognizedRepeatCount(prev => {
        const nextCount = prev + 1;
        if (nextCount >= 2) {
          const chatFallbackMsg = `I'm having trouble understanding your speech clearly. Please type your requirement directly into the chat window below, and I will continue helping you!`;
          setTranscriptHistory(hist => [...hist, { role: 'assistant', text: chatFallbackMsg }]);
          if (triggerAudio) speakText(chatFallbackMsg, false);
        } else {
          setTranscriptHistory(hist => [...hist, { role: 'assistant', text: promptMsg }]);
          if (triggerAudio) speakText(promptMsg, true);
        }
        return nextCount;
      });
    };

    // BUYER & RENTER INTERACTIVE DISCOVERY
    if (activePersona === 'Buyer' || activePersona === 'Renter') {
      if (currentStep !== 3) {
        setUnrecognizedRepeatCount(0);
      }

      const extractedBhksEarly = extractBhksFromText(userQuery);
      const isPenthouseEarly = q.includes('penthouse');
      const specifiedBhkEarly = extractedBhksEarly.length > 0
        ? (extractedBhksEarly.length === 1 ? extractedBhksEarly[0] : extractedBhksEarly)
        : (isPenthouseEarly ? 'penthouse' : null);
      const hasRentalContext =
        isRentalIntent(userQuery) ||
        hasRentalSearchCriteria({
          localities: extractedLocalities,
          budget: parsedPrice,
          bhk: specifiedBhkEarly,
          isPenthouse: isPenthouseEarly,
        }) ||
        hasPreferenceInput(userQuery) ||
        isSiteVisitBookingIntent(userQuery, findShortlistPropertyFromQuery(userQuery, shortlistRef.current || shortlist));

      if (awaitingScopeContinueRef.current) {
        if (isAffirmativeResponse(userQuery)) {
          setAwaitingScopeContinue(false);
          const resumeMsg = getScopeContinueResumePrompt(currentData, {
            buyerStep: currentStep,
            hasSearched: hasSearchedRef.current || hasSearched,
          });
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: resumeMsg }]);
          if (triggerAudio) speakText(resumeMsg, true);
          return;
        }
        if (isNegativeResponse(userQuery)) {
          setAwaitingScopeContinue(false);
          handleResetSession();
          const byeMsg = 'All cleared! Tap Speak whenever you\'re ready to start a fresh rental search — I\'m here to help!';
          setTranscriptHistory([{ role: 'assistant', text: byeMsg }]);
          if (triggerAudio) speakText(byeMsg, false);
          return;
        }
        const retryMsg = OUT_OF_SCOPE_CONTINUE_PROMPT;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: retryMsg }]);
        if (triggerAudio) speakText(retryMsg, true);
        return;
      }

      if (isOutOfScopeQuery(userQuery, { hasRentalContext })) {
        setAwaitingScopeContinue(true);
        const scopeMsg = getOutOfScopeResponse();
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: scopeMsg }]);
        if (triggerAudio) speakText(scopeMsg, true);
        return;
      }

      // Confirm fuzzy locality once, then persist and continue
      if (pendingLoc?.locality) {
        const isYes = /^(yes|yeah|yep|yup|correct|that's it|thats it|right|ok|okay|sure|confirm)\b/i.test(q.trim()) || q.includes('yes');
        const isNo = /^(no|nope|not that|wrong)\b/i.test(q.trim());
        if (isYes && !isNo) {
          extractedLocalities = [pendingLoc.locality];
          setPendingLocalityConfirm(null);
          setBuyerData((prev) => ({
            ...prev,
            locality: pendingLoc.locality,
            localities: [pendingLoc.locality],
          }));
        } else if (isNo) {
          setPendingLocalityConfirm(null);
          const promptLocality = 'No problem! Which Bengaluru neighborhood would you like me to search instead?';
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptLocality }]);
          if (triggerAudio) speakText(promptLocality, true);
          return;
        } else if (extractedLocalities.length > 0) {
          setPendingLocalityConfirm(null);
        } else {
          const confirmAgain = buildLocalityConfirmationPrompt(pendingLoc);
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: confirmAgain }]);
          if (triggerAudio) speakText(confirmAgain, true);
          return;
        }
      } else if (extractedLocalities.length === 0 && shouldConfirmFuzzyLocality(fuzzyLocality)) {
        setPendingLocalityConfirm(fuzzyLocality);
        const confirmMsg = buildLocalityConfirmationPrompt(fuzzyLocality);
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: confirmMsg }]);
        if (triggerAudio) speakText(confirmMsg, true);
        return;
      }

      // 0. Graceful Closing Intent (Thank you / Bye / Done)
      const isClosingIntent = q.includes('thank') || q.includes('thanks') || q.includes('bye') || q.includes('that is all') || q.includes("that's all") || q.includes('nothing else') || q.includes('no thanks') || q.includes('done');
      if (isClosingIntent) {
        const closingMsg = bookingCompletedRef.current
          ? BOOKING_COMPLETED_THANK_YOU
          : `You're very welcome — it's been a pleasure helping you! I'm here anytime you want to explore rentals, check commutes, or book site visits in Bengaluru. Have an amazing day!`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: closingMsg }]);
        if (triggerAudio) speakText(closingMsg, false);
        return;
      }

      // 1. Property pick & site visit booking (after results are shown)
      const activeShortlist = shortlistRef.current || shortlist;
      const matchedProperty = findShortlistPropertyFromQuery(userQuery, activeShortlist);
      const bookingIntent = isSiteVisitBookingIntent(userQuery, matchedProperty);

      if (canTriggerSiteVisitBooking({
        bookingIntent,
        matchedProperty,
        shortlistLength: activeShortlist.length,
      })) {
        startVoiceSiteVisitBooking(matchedProperty || activeShortlist[0], triggerAudio);
        return;
      }

      const isPropertyInterest = q.includes('like') || q.includes('love') || q.includes('interested') || q.includes('want this') || q.includes('want that') || q.includes('this one') || q.includes('that one') || q.includes('go with') || q.includes('pick this') || q.includes('choose');
      const isSimpleYes = (q.trim() === 'yes' || q.includes('yes please') || q.includes('sure') || q.includes('go ahead') || q.includes('sounds good'));
      const browseActive = hasSearchedRef.current || hasSearched || currentStep >= 5;
      const readyToBook = browseActive && activeShortlist.length > 0 && (
        (isSimpleYes && matchedProperty) ||
        (isPropertyInterest && matchedProperty) ||
        isConfidentPropertyNamePick(userQuery, matchedProperty)
      );

      if (readyToBook) {
        startVoiceSiteVisitBooking(matchedProperty, triggerAudio);
        return;
      }

      // Step 4: user answered requirements question — store prefs and search (not after results shown)
      if (currentStep === 4 && hasPreferenceInput(userQuery) && !bookingIntent) {
        const mergedSoftPreferences = mergeSoftPreferences(currentData.softPreferences, userQuery);
        const searchPayload = {
          localities: currentData.localities?.length ? currentData.localities : (currentData.locality ? [currentData.locality] : []),
          locality: currentData.locality,
          listingType: 'rent',
          maxBudget: currentData.maxBudget,
          bedrooms: currentData.bedrooms,
          isPenthouse: currentData.isPenthouse || false,
          familyPreferences: userQuery,
          softPreferences: mergedSoftPreferences,
        };
        setBuyerData((prev) => ({
          ...prev,
          softPreferences: mergedSoftPreferences,
          familyPreferences: userQuery,
          requirementsAsked: true,
        }));
        executeBuyerFilter(searchPayload);
        return;
      }

      // Parse parameters from latest user input — always evaluate fresh intent
      const extractedBhks = extractBhksFromText(userQuery);
      const isPenthouse = q.includes('penthouse');
      let specifiedBhk = extractedBhks.length > 0
        ? (extractedBhks.length === 1 ? extractedBhks[0] : extractedBhks)
        : (isPenthouse ? 'penthouse' : null);

      const hasSearchCriteria = hasRentalSearchCriteria({
        localities: extractedLocalities,
        budget: parsedPrice,
        bhk: specifiedBhk,
        isPenthouse,
      });

      // Intent-first rental flow — skip when user is trying to book a shortlisted property
      if ((isRentalIntent(userQuery) || hasSearchCriteria) && !bookingIntent) {
        const slotMerge = mergePersistedInterviewSlots(currentData, {
          localities: extractedLocalities,
          locality: extractedLocalities.length > 0 ? extractedLocalities.join(' & ') : '',
          maxBudget: parsedPrice,
          bedrooms: specifiedBhk,
          isPenthouse,
        });
        const mergedLocalities = slotMerge.localities;
        const mergedLocality = slotMerge.locality;
        const mergedBudget = slotMerge.maxBudget;
        const mergedBhk = slotMerge.bedrooms;
        const mergedPenthouse = slotMerge.isPenthouse;

        const mergedSoftPreferences = mergeSoftPreferences(currentData.softPreferences, userQuery);
        const prefsInUtterance = hasPreferenceInput(userQuery);

        const mergedData = {
          localities: mergedLocalities,
          locality: mergedLocality,
          maxBudget: mergedBudget,
          bedrooms: mergedBhk,
          isPenthouse: mergedPenthouse,
          familyPreferences: userQuery,
          listingType: 'rent',
          softPreferences: mergedSoftPreferences,
        };

        if (isRentalIntent(userQuery) && !hasSearchCriteria && mergedLocalities.length === 0) {
          setBuyerData(prev => ({ ...prev, listingType: 'rent' }));
          setBuyerStep(1);
          const rentalMsg = getMissingRentalPrompt(mergedData);
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: rentalMsg }]);
          if (triggerAudio) speakText(rentalMsg, true);
          return;
        }

        const readyToSearch = mergedLocalities.length > 0 && (mergedBudget || mergedBhk || mergedPenthouse);
        const shouldAskRequirements =
          !prefsInUtterance &&
          !(hasSearchedRef.current || hasSearched) &&
          (!currentData.requirementsAsked || currentStep === 4);
        if (readyToSearch) {
          if (shouldAskRequirements) {
            setBuyerData(prev => ({
              ...prev,
              listingType: 'rent',
              locality: mergedLocality,
              localities: mergedLocalities,
              maxBudget: mergedBudget,
              bedrooms: mergedBhk,
              isPenthouse: mergedPenthouse,
              familyPreferences: userQuery,
              requirementsAsked: true,
            }));
            if (mergedLocalities.length > 0) setSelectedLocality(mergedLocality);
            setBuyerStep(4);
            const requirementsMsg = getRequirementsPrompt(mergedLocality);
            setTranscriptHistory(prev => [...prev, { role: 'assistant', text: requirementsMsg }]);
            if (triggerAudio) speakText(requirementsMsg, true);
            return;
          }

          setBuyerData(prev => ({
            ...prev,
            listingType: 'rent',
            locality: mergedLocality,
            localities: mergedLocalities,
            maxBudget: mergedBudget,
            bedrooms: mergedBhk,
            isPenthouse: mergedPenthouse,
            familyPreferences: userQuery,
            softPreferences: mergedSoftPreferences,
            requirementsAsked: true,
          }));
          if (mergedLocalities.length > 0) setSelectedLocality(mergedLocality);
          executeBuyerFilter(mergedData);
          return;
        }

        if (currentStep < 5 && currentData.requirementsAsked && mergedLocalities.length > 0 && prefsInUtterance) {
          const requirementSearchData = {
            ...mergedData,
            maxBudget: mergedBudget ?? currentData.maxBudget ?? null,
            bedrooms: mergedBhk ?? currentData.bedrooms ?? null,
            isPenthouse: mergedPenthouse || currentData.isPenthouse || false,
          };
          if (requirementSearchData.maxBudget || requirementSearchData.bedrooms || requirementSearchData.isPenthouse) {
            setBuyerData(prev => ({
              ...prev,
              softPreferences: mergedSoftPreferences,
              familyPreferences: userQuery,
            }));
            executeBuyerFilter(requirementSearchData);
            return;
          }
        }

        const missingPrompt = getMissingRentalPrompt(mergedData);
        if (missingPrompt) {
          setBuyerData(prev => ({
            ...prev,
            listingType: 'rent',
            locality: mergedLocality || prev.locality,
            localities: mergedLocalities.length > 0 ? mergedLocalities : prev.localities,
            maxBudget: mergedBudget,
            bedrooms: mergedBhk,
            isPenthouse: mergedPenthouse,
          }));
          if (mergedLocalities.length > 0) {
            setSelectedLocality(mergedLocality);
            setBuyerStep(2);
          } else {
            setBuyerStep(1);
          }
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: missingPrompt }]);
          if (triggerAudio) speakText(missingPrompt, true);
          return;
        }
      }

      // Spatial / Transit — only for standalone queries, not active rental searches
      const isStandaloneMetroQuery = !hasSearchCriteria && !isRentalIntent(userQuery) && (
        (q.includes('how far') || q.includes('where is') || q.includes('nearest metro') || q.includes('which metro') || q.includes('distance to metro')) || currentStep === 5
      );
      if (isStandaloneMetroQuery && (q.includes('metro') || q.includes('distance') || q.includes('station'))) {
        const targetLoc = (extractedLocalities.length > 0 ? extractedLocalities[0] : null)
          || (currentData.localities && currentData.localities.length > 0 ? currentData.localities[0] : null)
          || (currentData.locality && currentData.locality !== 'All Bengaluru' ? currentData.locality : null)
          || (selectedLocality !== 'All Bengaluru' ? selectedLocality : 'Indiranagar');

        const metroInfo = getMetroInfoForLocality(targetLoc);
        const metroMsg = `Great question! The nearest Namma Metro to ${targetLoc} is ${metroInfo.station} on the ${metroInfo.line}, about ${metroInfo.distance} away — super convenient for daily commutes! Want to keep exploring properties or book a site visit?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: metroMsg }]);
        if (triggerAudio) speakText(metroMsg, true);
        return;
      }

      // Crime & Safety — skip when user is actively searching for rentals
      if (!hasSearchCriteria && !isRentalIntent(userQuery) && (q.includes('safe') || q.includes('safety') || q.includes('crime') || q.includes('police'))) {
        const targetLoc = (extractedLocalities.length > 0 ? extractedLocalities[0] : null)
          || (currentData.localities && currentData.localities.length > 0 ? currentData.localities[0] : null)
          || (currentData.locality && currentData.locality !== 'All Bengaluru' ? currentData.locality : null)
          || (selectedLocality !== 'All Bengaluru' ? selectedLocality : 'Indiranagar');

        const safetyMsg = `${targetLoc} is well covered with CCTV and 24/7 Karnataka Police patrols, with low night-time crime based on 2025 records — a solid choice for peace of mind! Shall we keep exploring properties or book a site visit?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: safetyMsg }]);
        if (triggerAudio) speakText(safetyMsg, true);
        return;
      }

      // Fallback: no clear intent yet — ask for locality once (never re-ask if already persisted)
      const alreadyHasLocality = Boolean(
        currentData.locality || (currentData.localities && currentData.localities.length > 0)
      );
      if (currentStep <= 1 && !hasSearchCriteria && !isRentalIntent(userQuery) && !alreadyHasLocality) {
        setBuyerStep(1);
        const promptLocality = "Let's find the perfect spot! Which Bengaluru neighborhood are you most interested in renting in?";
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptLocality }]);
        if (triggerAudio) speakText(promptLocality, true);
        return;
      }

      // Persist slots: if locality already known, ask only for what's still missing
      if (alreadyHasLocality && currentStep < 5 && !bookingIntent && !hasSearchCriteria && !isRentalIntent(userQuery)) {
        const persisted = mergePersistedInterviewSlots(currentData, {
          localities: extractedLocalities,
          locality: extractedLocalities[0] || '',
          maxBudget: parsedPrice,
          bedrooms: specifiedBhk,
          isPenthouse,
        });
        const missingPrompt = getMissingRentalPrompt(persisted);
        if (missingPrompt && !(persisted.maxBudget || persisted.bedrooms || persisted.isPenthouse)) {
          setBuyerData((prev) => ({
            ...prev,
            locality: persisted.locality,
            localities: persisted.localities,
          }));
          setBuyerStep(2);
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: missingPrompt }]);
          if (triggerAudio) speakText(missingPrompt, true);
          return;
        }
      }

      // STEP 5: Post-discovery follow-up — skip after booking completed
      if (currentStep >= 5 && currentStep < BUYER_STEP_BOOKING_COMPLETED) {
        const postShortlist = shortlistRef.current || shortlist;
        const postMatchProperty = findShortlistPropertyFromQuery(userQuery, postShortlist);
        const localityRefine = extractedLocalities.length > 0 || parsedPrice || specifiedBhk || isPenthouse;

        if (
          postMatchProperty &&
          isConfidentPropertyNamePick(userQuery, postMatchProperty) &&
          !localityRefine
        ) {
          startVoiceSiteVisitBooking(postMatchProperty, triggerAudio);
          return;
        }

        if (isSiteVisitBookingIntent(userQuery, postMatchProperty)) {
          startVoiceSiteVisitBooking(postMatchProperty || postShortlist[0], triggerAudio);
          return;
        }

        if (postShortlist.length === 1 && isAmbiguousPostDiscoveryUtterance(userQuery)) {
          startVoiceSiteVisitBooking(postShortlist[0], triggerAudio);
          return;
        }

        const isSearchRefine = extractedLocalities.length > 0 || parsedPrice || specifiedBhk || isPenthouse ||
          isRentalIntent(userQuery) ||
          q.includes('show me') || q.includes('find ') || q.includes('search') || q.includes('another') || q.includes('different');

        if (!isSearchRefine) {
          const remindMsg = getPostDiscoveryBrowsePrompt(postShortlist);
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: remindMsg }]);
          if (triggerAudio) speakText(remindMsg, false);
          return;
        }

        const targetBhk = (specifiedBhk && (Array.isArray(specifiedBhk) ? specifiedBhk.length > 0 : true))
          ? specifiedBhk
          : currentData.bedrooms;
        const targetPenthouse = isPenthouse || currentData.isPenthouse || false;

        const targetLocs = extractedLocalities.length > 0
          ? extractedLocalities
          : (currentData.localities && currentData.localities.length > 0
            ? currentData.localities
            : (currentData.locality && currentData.locality !== 'All Bengaluru'
              ? [currentData.locality]
              : (selectedLocality !== 'All Bengaluru' ? [selectedLocality] : ['Koramangala'])));

        executeBuyerFilter({
          localities: targetLocs,
          locality: targetLocs.join(' & '),
          listingType: 'rent',
          maxBudget: parsedPrice || currentData.maxBudget,
          bedrooms: targetBhk,
          isPenthouse: targetPenthouse,
          familyPreferences: currentData.familyPreferences || userQuery,
          softPreferences: mergeSoftPreferences(currentData.softPreferences, userQuery),
        });
        return;
      }
    }

    // SELLER LISTING INTERVIEW
    if (activePersona === 'Seller') {
      if (sellerStep === 0) {
        setSellerStep(1);
        const prompt1 = "I would love to help you list your property! Are you listing this property for Rent or for Sale?";
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: prompt1 }]);
        if (triggerAudio) speakText(prompt1);
        return;
      }

      if (sellerStep === 1) {
        const isSale = q.includes('sell') || q.includes('sale') || q.includes('bechna') || !q.includes('rent');
        const type = isSale ? 'sale' : 'rent';

        setSellerData(prev => ({ ...prev, listingType: type }));
        setSellerStep(2);
        const prompt2 = `Got it, listing for ${type === 'sale' ? 'Sale' : 'Rent'}! Which locality in Bengaluru is your property located in?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: prompt2 }]);
        if (triggerAudio) speakText(prompt2);
        return;
      }

      if (sellerStep === 2) {
        const targetLoc = extractedLocality || 'Koramangala';

        setSellerData(prev => ({ ...prev, locality: targetLoc }));
        setSellerStep(3);
        const prompt3 = `Great, ${targetLoc}! What is the apartment complex name and how many bedrooms (BHK) does it have?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: prompt3 }]);
        if (triggerAudio) speakText(prompt3);
        return;
      }

      if (sellerStep === 3) {
        let bhk = 2;
        if (q.includes('1bhk') || q.includes('1 bhk')) bhk = 1;
        else if (q.includes('3bhk') || q.includes('3 bhk')) bhk = 3;

        setSellerData(prev => ({ ...prev, title: userQuery, bedrooms: bhk }));
        setSellerStep(4);
        const prompt4 = `Understood, ${bhk} BHK at ${userQuery}! What is your expected ${sellerData.listingType === 'sale' ? 'selling price' : 'monthly rent'}?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: prompt4 }]);
        if (triggerAudio) speakText(prompt4);
        return;
      }

      if (sellerStep === 4) {
        const finalPrice = parsedPrice || 12500000;

        publishSellerListing({
          title: sellerData.title,
          locality: sellerData.locality,
          listingType: sellerData.listingType,
          price: finalPrice,
          bedrooms: sellerData.bedrooms,
          sqft: 1250,
          notes: userQuery
        });
        return;
      }
    }

    const defaultMsg = shortlist.length > 0
      ? getPostDiscoveryBrowsePrompt(shortlist)
      : `Nothing matched just yet — tweak your budget or neighborhood and let's find something you'll love!`;

    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: defaultMsg }]);
    if (triggerAudio) speakText(defaultMsg, false);
  };

  const handleSellerIntakeSubmit = (newProperty) => {
    publishSellerListing({
      title: newProperty.property_title,
      locality: newProperty.locality,
      listingType: activePersona === 'Buyer' ? 'sale' : 'rent',
      price: newProperty.price_inr,
      bedrooms: newProperty.bedrooms,
      sqft: newProperty.sqft,
      notes: newProperty.seller_review_notes
    });
  };

  const handleApplyDiscount = (property) => {
    const discountPrice = property.rent_inr ? Math.round(property.rent_inr * 0.95) : Math.round(property.sale_price_inr * 0.95);
    alert(`5% Early Signing Discount applied to ${property.society_name}! Updated price: ₹${discountPrice.toLocaleString('en-IN')}`);
  };

  const handleToggleCompare = (property) => {
    if (comparedListings.some(item => item.listing_id === property.listing_id)) {
      setComparedListings(prev => prev.filter(item => item.listing_id !== property.listing_id));
    } else {
      if (comparedListings.length >= 3) {
        alert("You can compare up to 3 properties at a time.");
        return;
      }
      setComparedListings(prev => [...prev, property]);
    }
  };

  const handleInspectCitations = (sourceId) => {
    setSelectedSourceId(sourceId);
    setSourcesDrawerOpen(true);
  };

  const getRecommendationReason = (property, history) => {
    if (!property) return "";
    const activePrefs = buyerData.softPreferences?.length
      ? buyerData.softPreferences
      : extractSoftPreferences(history.map((t) => t.text).join(' '));
    const prefReason = getPropertyPreferenceReason(property, activePrefs);
    if (prefReason) return prefReason;

    const queryText = history.map(t => t.text.toLowerCase()).join(' ');

    const hasMall = queryText.includes('mall') || queryText.includes('shopping') || queryText.includes('store') || queryText.includes('market') || queryText.includes('shop');
    const hasMetro = queryText.includes('metro') || queryText.includes('train') || queryText.includes('transit') || queryText.includes('station') || queryText.includes('namma');
    const hasConstruction = queryText.includes('construction') || queryText.includes('new') || queryText.includes('modern') || queryText.includes('rera') || queryText.includes('possession');
    const hasHospital = queryText.includes('hospital') || queryText.includes('doctor') || queryText.includes('medical') || queryText.includes('clinic');
    const hasPark = queryText.includes('park') || queryText.includes('lake') || queryText.includes('nature') || queryText.includes('quiet') || queryText.includes('peaceful') || queryText.includes('green');
    const hasSchool = queryText.includes('school') || queryText.includes('kids') || queryText.includes('education') || queryText.includes('college');
    const hasBudget = queryText.includes('budget') || queryText.includes('cheap') || queryText.includes('affordable') || queryText.includes('low price') || queryText.includes('price');

    const loc = property.locality.toLowerCase();
    const name = property.society_name.toLowerCase();

    // 1. Hospital Proximity (TOP PRIORITY when user asks for healthcare / doctor / clinic)
    if (hasHospital) {
      if (loc.includes('koramangala')) {
        return "Recommended because St. John's Medical College & Hospital is under 1.2 km away.";
      }
      if (loc.includes('indiranagar')) {
        return "Recommended because Manipal Hospital Indiranagar is under 0.8 km away.";
      }
      if (loc.includes('hsr')) {
        return "Recommended because Narayana Multispeciality Hospital HSR is under 1.1 km away.";
      }
      if (loc.includes('whitefield')) {
        return "Recommended because Manipal Hospital Whitefield is under 0.9 km away.";
      }
      return "Recommended because 24/7 top emergency hospitals and medical facilities are under 1.2 km away.";
    }

    // 2. Mall/Shopping
    if (hasMall) {
      if (loc.includes('indiranagar')) {
        return "Recommended because it is close to 100 Feet Road retail hub & premium shopping malls.";
      }
      if (loc.includes('whitefield') || name.includes('shantiniketan')) {
        return "Recommended because it is right next to Forum Shantiniketan Mall.";
      }
      if (loc.includes('hsr')) {
        return "Recommended because Sector 1 supermarkets and retail complexes are within walking distance.";
      }
      if (loc.includes('koramangala')) {
        return "Recommended because it is minutes away from Nexus Mall Koramangala.";
      }
    }

    // 3. Metro/Transit
    if (hasMetro) {
      if (loc.includes('indiranagar')) {
        return "Recommended because Indiranagar Metro Station is within walking distance.";
      }
      if (loc.includes('whitefield') || name.includes('shantiniketan')) {
        return "Recommended because Whitefield Metro Station is under 1.2 km.";
      }
      if (loc.includes('mahadevapura') || name.includes('metropolis')) {
        return "Recommended because of excellent feeder bus access and nearby metro stations.";
      }
    }

    // 4. New Construction
    if (hasConstruction) {
      if (name.includes('leela') || name.includes('marq') || name.includes('shantiniketan')) {
        return "Recommended because it is a new luxury construction with high-end modern layout designs.";
      }
      return "Recommended because it is a modern, newly constructed, RERA-approved property.";
    }

    // 5. Parks & Lakes
    if (hasPark) {
      if (name.includes('acropolis')) {
        return "Recommended because it features a scenic balcony overlooking Koramangala 4th Block park.";
      }
      if (name.includes('fairmont') || loc.includes('hsr')) {
        return "Recommended because it is located near Agara Lake with clean air and scenic walking tracks.";
      }
    }

    // 6. Schools
    if (hasSchool) {
      if (loc.includes('indiranagar')) {
        return "Recommended because National Public School (NPS) Indiranagar is nearby.";
      }
      if (loc.includes('whitefield')) {
        return "Recommended because Greenwood High & international schools are easily accessible.";
      }
    }

    // 7. Budget matching
    if (hasBudget) {
      const rent = property.rent_inr || 0;
      if (rent > 0) {
        return `Recommended because it fits your rental budget perfectly at ₹${rent.toLocaleString('en-IN')}/mo.`;
      }
    }

    // Fallback defaults per property
    if (name.includes('acropolis')) {
      return "Recommended because it features high-end marble flooring, modular kitchen, and beautiful park views.";
    }
    if (name.includes('residency')) {
      return "Recommended because it is move-in ready and walking distance to Koramangala commercial cafes.";
    }
    if (name.includes('rhythm')) {
      return "Recommended because it offers premium 100ft road connectivity and pet-friendly terms.";
    }
    if (name.includes('elegance')) {
      return "Recommended because it has family-friendly amenities, clubhouse, and park access.";
    }
    if (name.includes('fairmont')) {
      return "Recommended because it features low security deposit, verified owner agreement, and immediate availability.";
    }
    if (name.includes('shantiniketan')) {
      return "Recommended because it is right next to ITPL, perfect for working IT professionals.";
    }
    if (name.includes('metropolis')) {
      return "Recommended because of Outer Ring Road connectivity and ready-to-move-in possession.";
    }
    if (name.includes('grandeur')) {
      return "Recommended because of excellent natural ventilation and close proximity to the metro.";
    }

    return "Recommended because it is verified, RERA-approved, and offers premium security & connectivity.";
  };

  const displayedListings = useMemo(() => {
    let filtered = shortlist.filter(item => {
      const matchesLocality = selectedLocality === 'All Bengaluru' ||
        (buyerData && buyerData.localities && buyerData.localities.length > 0
          ? buyerData.localities.some(loc => item.locality.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase().includes(item.locality.toLowerCase()))
          : (selectedLocality.toLowerCase().includes(item.locality.toLowerCase()) || item.locality.toLowerCase().includes(selectedLocality.toLowerCase())));
      
      const matchesType = item.listing_type === 'rent';

      let matchesBedrooms = true;
      if (buyerData && buyerData.bedrooms !== null && buyerData.bedrooms !== undefined) {
        if (buyerData.isPenthouse || buyerData.bedrooms === 'penthouse') {
          matchesBedrooms = item.bedrooms >= 4 || (item.society_name && item.society_name.toLowerCase().includes('penthouse'));
        } else if (Array.isArray(buyerData.bedrooms) && buyerData.bedrooms.length > 0) {
          const targetBhks = buyerData.bedrooms.map(b => Number(b)).filter(b => !isNaN(b));
          matchesBedrooms = targetBhks.includes(item.bedrooms);
        } else {
          const targetBhk = Number(buyerData.bedrooms);
          if (!isNaN(targetBhk)) {
            matchesBedrooms = item.bedrooms === targetBhk;
          }
        }
      }

      return matchesLocality && matchesType && matchesBedrooms;
    });

    if (showFavoritesOnly) {
      filtered = filtered.filter(item => favorites.includes(item.listing_id));
    }
    return filtered;
  }, [shortlist, selectedLocality, buyerFilterType, showFavoritesOnly, favorites, buyerData]);

  // Sync selectedSpotlightProperty when displayedListings change
  useEffect(() => {
    if (displayedListings.length > 0) {
      const exists = displayedListings.some(item => item.listing_id === selectedSpotlightProperty?.listing_id);
      if (!exists) {
        setSelectedSpotlightProperty(displayedListings[0]);
      }
    } else {
      setSelectedSpotlightProperty(null);
    }
  }, [displayedListings, selectedSpotlightProperty]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navigation */}
      <HeaderNav
        activePersona={activePersona}
        setActivePersona={handlePersonaChange}
        activeView={activeView}
        setActiveView={setActiveView}
        selectedLocality={selectedLocality}
        setSelectedLocality={setSelectedLocality}
        onOpenModal={(modalName) => setActiveModal(modalName)}
        onGoHome={() => {
          stopVoice();
          setActiveView('landing');
        }}
        onResetSession={handleResetSession}
        favoriteCount={favorites.length}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
      />

      {/* Main Viewport Content */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: activeView === 'landing' ? '0' : '24px' }}>
        
        {/* MODE 0: LANDING HOME PAGE */}
        {activeView === 'landing' && (
          <LandingHeroPage
            onSelectRole={handleSelectRole}
            onOpenModal={(modalName) => setActiveModal(modalName)}
            allProperties={shortlist}
            onBookVisit={(p) => setBookingProperty(p)}
          />
        )}

        {/* MODE A: COMMAND VIEW */}
        {activeView === 'command' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: '24px' }}>
            {/* Left Column: Voice Agent HUD & Spatial Telemetry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <VoiceHUD
                activePersona={activePersona}
                onProcessQuery={handleProcessQuery}
                transcriptHistory={transcriptHistory}
                isListening={isListening}
                setIsListening={setIsListening}
                isPlayingAudio={isPlayingAudio}
                onStopVoice={stopVoice}
                onStartListening={startListening}
                onSpeakGreeting={handleSpeakWelcome}
                onResetSession={handleResetSession}
                postDiscoveryResume={shouldOfferSiteVisitResume({
                  hasSearched,
                  buyerStep,
                  bookingCompleted,
                })}
                voiceBookingActive={voiceBookingStep !== null}
              />

              {activePersona === 'Buyer' || activePersona === 'Renter' ? (
                <SpotlightPropertyPanel
                  property={selectedSpotlightProperty}
                  scoutReason={selectedSpotlightProperty ? getRecommendationReason(selectedSpotlightProperty, transcriptHistory) : ""}
                  onBookVisit={(p) => setBookingProperty(p)}
                />
              ) : (
                <NeighborhoodTelemetry
                  selectedLocality={selectedLocality === 'All Bengaluru' ? 'Indiranagar' : selectedLocality}
                  onInspectCitations={handleInspectCitations}
                />
              )}

              {activePersona === 'Seller' && (
                <SellerIntakePanel
                  onSubmitIntake={handleSellerIntakeSubmit}
                  sellerListings={sellerListings}
                />
              )}
            </div>

            {/* Right Column: Buyer Property Cards OR Seller Earnings Hub */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activePersona === 'Seller' ? (
                <SellerListingsWorkspace
                  sellerListings={sellerListings}
                  onApplyDiscount={handleApplyDiscount}
                  onOpenListForm={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
                />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {showFavoritesOnly 
                          ? `Saved Favorites` 
                          : hasSearched 
                            ? `Shortlisted Properties` 
                            : `Verified Rental Listings`}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Filtered for <strong>{selectedLocality}</strong> in <strong>{activePersona} Mode</strong>
                      </p>
                    </div>
                    {comparedListings.length > 0 && (
                      <button onClick={() => setActiveView('compare')} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                        View Comparison ({comparedListings.length})
                      </button>
                    )}
                  </div>



                  {displayedListings.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {showFavoritesOnly ? 'No saved favorite properties found. Click the heart icon on any card to save it!' : 'No matching properties found. Speak a voice command to update your search limits.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {displayedListings.map(property => (
                        <PropertyCard
                          key={property.listing_id}
                          property={property}
                          activePersona={activePersona}
                          onBookVisit={(p) => setBookingProperty(p)}
                          onToggleCompare={handleToggleCompare}
                          isCompared={comparedListings.some(item => item.listing_id === property.listing_id)}
                          onInspectCitations={handleInspectCitations}
                          isFavorite={favorites.includes(property.listing_id)}
                          onToggleFavorite={toggleFavorite}
                          onOpenEmiCalculator={(price) => {
                            if (price) setEmiModalPrice(price);
                            setEmiModalOpen(true);
                          }}
                          scoutReason={getRecommendationReason(property, transcriptHistory)}
                          isSpotlighted={selectedSpotlightProperty?.listing_id === property.listing_id}
                          onSelectSpotlight={() => setSelectedSpotlightProperty(property)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* MODE B: SPATIAL GIS RADAR MAP */}
        {activeView === 'spatial' && (
          <SpatialRadarMap
            listings={shortlist}
            onBookVisit={(p) => setBookingProperty(p)}
            onInspectCitations={handleInspectCitations}
          />
        )}

        {/* MODE C: PROPERTY COMPARISON MATRIX */}
        {activeView === 'compare' && (
          <PropertyComparisonMatrix
            comparedListings={comparedListings}
            onBookVisit={(p) => setBookingProperty(p)}
            onRemoveCompare={(id) => setComparedListings(prev => prev.filter(x => x.listing_id !== id))}
          />
        )}

        {/* MODE D: DESIGN SYSTEM SHOWCASE */}
        {activeView === 'design_spec' && (
          <DesignSystemShowcase />
        )}
      </main>

      {/* Drawers & Modals */}
      <SourcesDrawer
        isOpen={sourcesDrawerOpen}
        onClose={() => setSourcesDrawerOpen(false)}
        selectedSourceId={selectedSourceId}
      />

      <BookingModal
        isOpen={!!bookingProperty}
        onClose={() => setBookingProperty(null)}
        property={bookingProperty}
        onBookingComplete={(result) => {
          completeSiteVisitBooking({
            propertyName: bookingProperty?.society_name,
            visitDate: result?.visit_date,
            timeSlot: result?.time_slot,
            email: result?.email_dispatch?.to_email,
            brokerName: result?.broker?.name,
          }, true);
        }}
      />

      <InfoModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
