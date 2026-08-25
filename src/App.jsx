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

// Helper function to extract multiple localities matching common voice variations
const extractLocalitiesFromText = (text) => {
  if (!text) return [];
  const q = text.toLowerCase();
  const matched = [];

  if (q.includes('koramangala') || q.includes('kormangala') || q.includes('kormangla') || q.includes('kora mangala') || q.includes('kora')) {
    matched.push('Koramangala');
  }
  if (q.includes('indiranagar') || q.includes('indira nagar') || q.includes('indra nagar') || q.includes('indiranagr')) {
    matched.push('Indiranagar');
  }
  if (q.includes('hsr') || q.includes('hsr layout')) {
    matched.push('HSR Layout');
  }
  if (q.includes('whitefield') || q.includes('white field')) {
    matched.push('Whitefield');
  }
  if (q.includes('bellandur') || q.includes('belandur')) {
    matched.push('Bellandur');
  }
  if (q.includes('hebbal') || q.includes('hebal')) {
    matched.push('Hebbal');
  }
  if (q.includes('mahadevapura') || q.includes('mahadev pura')) {
    matched.push('Mahadevapura');
  }
  if (q.includes('electronic city') || q.includes('ecity') || q.includes('e-city')) {
    matched.push('Electronic City');
  }
  if (q.includes('jayanagar') || q.includes('jaya nagar')) {
    matched.push('Jayanagar');
  }
  if (q.includes('jp nagar') || q.includes('jpnagar')) {
    matched.push('JP Nagar');
  }
  if (q.includes('marathahalli') || q.includes('marathalli')) {
    matched.push('Marathahalli');
  }

  return matched;
};

const extractLocalityFromText = (text) => {
  const locs = extractLocalitiesFromText(text);
  return locs.length > 0 ? locs[0] : null;
};

// Seed active property listings with real high-resolution photos matching listings.json
const initialListings = [
[
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
]
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
        const res = await fetch('http://localhost:8000/api/listings');
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
    listingType: 'sale',
    locality: 'Indiranagar',
    maxBudget: null,
    bedrooms: 2,
    familyPreferences: ''
  });

  const buyerStepRef = useRef(buyerStep);
  buyerStepRef.current = buyerStep;

  const buyerDataRef = useRef(buyerData);
  buyerDataRef.current = buyerData;

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const activeRecognitionRef = useRef(null);
  const isVoiceModeActiveRef = useRef(false);
  const isPlayingAudioRef = useRef(false);

  const stopVoice = () => {
    isVoiceModeActiveRef.current = false;
    isPlayingAudioRef.current = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeRecognitionRef.current) {
      try { activeRecognitionRef.current.abort(); } catch (e) {}
    }
    setIsListening(false);
    setIsPlayingAudio(false);
  };

  const startListening = async (speakGreetingIfFirst = false) => {
    stopVoice();

    // 1. Explicitly request Microphone Permission FIRST before greeting or recognition!
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop temporary stream tracks immediately after permission check
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Microphone access denied or blocked:", err);
        alert("Microphone permission is required to use Voice AI. Please allow microphone access in your browser address bar.");
        setIsListening(false);
        return;
      }
    }

    // 2. Microphone Permission GRANTED -> Speak welcome greeting if first interaction, otherwise start listening!
    if (speakGreetingIfFirst && transcriptHistory.length <= 1) {
      const greeting = "Welcome to Property Scout! How should I help you today?";
      setTranscriptHistory(prev => {
        if (prev.length === 0 || (prev.length === 1 && prev[0].role === 'assistant')) {
          return [{ role: 'assistant', text: greeting }];
        }
        return [...prev, { role: 'assistant', text: greeting }];
      });
      speakText(greeting, true);
    } else {
      startListeningInternal();
    }
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
          setTimeout(() => {
            if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current) {
              startListeningInternal();
            }
          }, 400);
        }
      };
      rec.onresult = (event) => {
        const speechText = event.results[0][0]?.transcript;
        if (speechText && speechText.trim()) {
          handleProcessQuery(speechText.trim(), true);
        }
      };
      
      rec.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
        if (isVoiceModeActiveRef.current && !isPlayingAudioRef.current && (e.error === 'no-speech' || e.error === 'aborted')) {
          setTimeout(() => {
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

  const currentUtteranceRef = useRef(null);
  const speechKeepAliveIntervalRef = useRef(null);
  const sentenceWatchdogTimerRef = useRef(null);

  const speakText = (text, autoListenAfter = false) => {
    if (!('speechSynthesis' in window) || !text) return;

    try {
      window.speechSynthesis.cancel();
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

      const cleanText = text.trim();
      const rawSentences = cleanText.split(/(?<=[.!?])\s+/);
      const sentences = rawSentences.map(s => s.trim()).filter(Boolean);
      if (sentences.length === 0) sentences.push(cleanText);

      let currentIndex = 0;
      setIsPlayingAudio(true);
      isPlayingAudioRef.current = true;
      if (autoListenAfter) {
        isVoiceModeActiveRef.current = true;
      }

      const speakNextSentence = () => {
        if (sentenceWatchdogTimerRef.current) {
          clearTimeout(sentenceWatchdogTimerRef.current);
        }

        if (currentIndex >= sentences.length) {
          setIsPlayingAudio(false);
          isPlayingAudioRef.current = false;
          if (speechKeepAliveIntervalRef.current) {
            clearInterval(speechKeepAliveIntervalRef.current);
          }
          currentUtteranceRef.current = null;
          if (autoListenAfter) {
            setTimeout(() => {
              startListeningInternal();
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
        if (window.speechSynthesis) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }
      }, 1000);

      setTimeout(() => {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
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
    startListening(true);
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

  const executeBuyerFilter = (data) => {
    let allProperties = [...initialListings, ...sellerListings];
    let filtered = [...allProperties];

    // Determine target localities array
    let targetLocalities = [];
    if (data.localities && Array.isArray(data.localities) && data.localities.length > 0) {
      targetLocalities = data.localities;
    } else if (data.locality && data.locality !== 'All Bengaluru') {
      targetLocalities = [data.locality];
    } else if (selectedLocality !== 'All Bengaluru' && selectedLocality !== 'Koramangala & Indiranagar') {
      targetLocalities = [selectedLocality];
    }

    // 1. Locality Filter (Multi-Locality Matching)
    if (targetLocalities.length > 0 && !targetLocalities.includes('All Bengaluru')) {
      const locMatches = filtered.filter(item => 
        targetLocalities.some(loc => item.locality.toLowerCase().includes(loc.toLowerCase()))
      );
      if (locMatches.length > 0) filtered = locMatches;
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
      const targetBhk = Number(data.bedrooms);
      if (!isNaN(targetBhk)) {
        filtered = filtered.filter(item => item.bedrooms === targetBhk);
      }
    }

    // 4. Zero Match Fallback — Retrieve & suggest nearby properties in adjacent localities!
    if (filtered.length === 0) {
      const nearbyAlternatives = allProperties.filter(item => item.listing_type === listingType).slice(0, 3);
      setShortlist(nearbyAlternatives);
      setSelectedLocality(localityDisplay);
      setBuyerFilterType(listingType);
      setHasSearched(true);
      setBuyerStep(5); // Transition to Post-Discovery Completed Mode!

      const topSuggestions = nearbyAlternatives.map(p => {
        const price = p.listing_type === 'rent' ? p.rent_inr : p.sale_price_inr;
        const priceStr = price ? formatIndianCurrencyDisplay(price, p.listing_type || 'rent') : 'Price on request';
        return `${p.society_name} in ${p.locality} (${p.bedrooms ? p.bedrooms + ' BHK' : 'Apartment'} at ${priceStr})`;
      }).join(', ');

      const noMatchMsg = `I couldn't find an exact matching property in ${localityDisplay} with those specific criteria. However, these are the suggested nearby properties for you: ${topSuggestions}. Would you like me to schedule a physical site visit for any of these properties?`;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: noMatchMsg }]);
      speakText(noMatchMsg, true);
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
    if (data.familyPreferences && data.familyPreferences.toLowerCase().includes('furnished')) {
      const isFully = data.familyPreferences.toLowerCase().includes('fully');
      const furnishedMatch = filtered.filter(item => {
        if (!item.furnishing) return true;
        if (isFully) return item.furnishing.toLowerCase().includes('fully');
        return item.furnishing.toLowerCase().includes('furnished');
      });
      if (furnishedMatch.length > 0) {
        filtered = furnishedMatch;
      }
    }

    // Update buyer state so UI remains strictly in sync
    setBuyerData(prev => ({
      ...prev,
      locality: localityDisplay,
      localities: targetLocalities,
      bedrooms: data.bedrooms,
      isPenthouse: data.isPenthouse || false,
      maxBudget: data.maxBudget
    }));

    // Always update UI state & reset interview step to finish voice flow
    setShortlist(filtered);
    setSelectedLocality(localityDisplay);
    setBuyerFilterType(listingType);
    setHasSearched(true);
    setBuyerStep(5); // Transition to Post-Discovery Completed Mode!

    // 7. Generate & Speak Final Verdict with explicit property recommendations
    const topSuggestions = filtered.slice(0, 3).map(p => {
      const price = p.listing_type === 'rent' ? p.rent_inr : p.sale_price_inr;
      const priceStr = price ? formatIndianCurrencyDisplay(price, p.listing_type || 'rent') : 'Price on request';
      return `${p.society_name} (${p.bedrooms ? p.bedrooms + ' BHK' : 'Apartment'} at ${priceStr})`;
    }).join(', ');

    if (!budgetConstraintMet && data.maxBudget) {
      const lowestAvailablePrice = filtered[0] ? (filtered[0].rent_inr || filtered[0].sale_price_inr) : 35000;
      const prefNotice = data.familyPreferences ? ` matching your preference for ${data.familyPreferences}` : '';
      const verdictMsg = `I couldn't find an available property strictly under ${formatIndianCurrencyDisplay(data.maxBudget, listingType)} in ${localityDisplay}${prefNotice}. The closest available options start at ${formatIndianCurrencyDisplay(lowestAvailablePrice, listingType)}. These are the suggested properties for you: ${topSuggestions}. You can inspect their details below or ask me to schedule a physical site visit anytime!`;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: verdictMsg }]);
      speakText(verdictMsg, true);
    } else {
      const prefNotice = data.familyPreferences ? ` matching your preference for ${data.familyPreferences}` : '';
      const verdictMsg = `Found ${filtered.length} matching propert${filtered.length === 1 ? 'y' : 'ies'} in ${localityDisplay}${prefNotice}. These are the suggested properties for you: ${topSuggestions}. Would you like me to schedule a physical site visit for any of these properties?`;
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: verdictMsg }]);
      speakText(verdictMsg, true);
    }
  };

  // Process User Query
  const handleProcessQuery = (userQuery, triggerAudio = true) => {
    stopVoice();
    setTranscriptHistory(prev => [...prev, { role: 'user', text: userQuery }]);

    const q = userQuery.toLowerCase();
    const parsedPrice = parseIndianCurrencyStrict(userQuery);
    const extractedLocalities = extractLocalitiesFromText(userQuery);
    const extractedLocality = extractedLocalities.length > 0 ? extractedLocalities[0] : null;
    const currentStep = buyerStepRef.current;
    const currentData = buyerDataRef.current;

    // Mode Switch Overrides
    if (q.includes('buyer mode') || q.includes('khareedna') || q.includes('buy karna')) {
      handlePersonaChange('Buyer');
      return;
    }
    if (q.includes('seller mode') || q.includes('landlord mode') || q.includes('bechna hai')) {
      handlePersonaChange('Seller');
      return;
    }

    // Cancel command
    if (q.includes('cancel') || q.includes('start over') || q.includes('reset') || q.includes('radd')) {
      setBuyerStep(0);
      setSellerStep(0);
      setBuyerData({ listingType: 'rent', locality: 'All Bengaluru', maxBudget: null, bedrooms: null, familyPreferences: '' });
      setShortlist([...initialListings, ...sellerListings]);
      setSelectedLocality('All Bengaluru');
      setBuyerFilterType('all');
      setHasSearched(false);
      const cancelMsg = "Search reset. Listing all available properties from multiple locations across Bengaluru.";
      setTranscriptHistory(prev => [...prev, { role: 'assistant', text: cancelMsg }]);
      if (triggerAudio) speakText(cancelMsg);
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

    // Specific amenity/POI soft preference terms (hospital, doctor, clinic, metro, school, gym, etc.)
    const isSpecificSoftPref = q.includes('hospital') || q.includes('doctor') || q.includes('clinic') || q.includes('medical') || q.includes('health') || q.includes('metro') || q.includes('school') || q.includes('gym') || q.includes('park') || q.includes('furnished') || q.includes('pet') || q.includes('pets') || q.includes('dog') || q.includes('cat') || q.includes('balcony') || q.includes('pool') || q.includes('lift') || q.includes('security');

    // BUYER & RENTER INTERACTIVE DISCOVERY
    if (activePersona === 'Buyer' || activePersona === 'Renter') {
      setUnrecognizedRepeatCount(0);

      // 0. Graceful Closing Intent (Thank you / Bye / Done)
      const isClosingIntent = q.includes('thank') || q.includes('thanks') || q.includes('bye') || q.includes('that is all') || q.includes("that's all") || q.includes('nothing else') || q.includes('no thanks') || q.includes('done');
      if (isClosingIntent) {
        const closingMsg = `You're very welcome! I'm here 24/7 whenever you need to explore properties, check commute times, or book site visits in Bengaluru. Have a wonderful day!`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: closingMsg }]);
        if (triggerAudio) speakText(closingMsg, false);
        return;
      }

      // 1. Site Visit Booking Intercept (Precise Intent Matching)
      const isBookingIntent = q.includes('book site visit') || q.includes('schedule visit') || q.includes('book visit') || q.includes('physical visit') || q.includes('book appointment') || (q.includes('book') && (q.includes('visit') || q.includes('slot') || q.includes('tour')));
      if (isBookingIntent && shortlist.length > 0) {
        const targetProp = shortlist.find(p => p.society_name && q.includes(p.society_name.toLowerCase())) || shortlist[0];
        if (targetProp) {
          setBookingProperty(targetProp);
          const bookMsg = `Great! I've opened the physical site visit booking calendar for ${targetProp.society_name} in ${targetProp.locality}. You can pick your preferred date and time slot with your assigned broker!`;
          setTranscriptHistory(prev => [...prev, { role: 'assistant', text: bookMsg }]);
          if (triggerAudio) speakText(bookMsg, false);
          return;
        }
      }

      // 2. Spatial / Transit Intercept
      if (q.includes('metro') || q.includes('distance') || q.includes('station')) {
        const targetLoc = extractedLocalities.length > 0 ? extractedLocalities[0] : (selectedLocality !== 'All Bengaluru' ? selectedLocality : 'Koramangala');
        const metroMsg = `The nearest Namma Metro station to ${targetLoc} is Indiranagar Metro Station on the Purple Line, located under 1 km away.`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: metroMsg }]);
        if (triggerAudio) speakText(metroMsg, true);
        return;
      }

      // 3. Crime & Safety Telemetry Intercept
      if (q.includes('safe') || q.includes('safety') || q.includes('crime') || q.includes('police')) {
        const targetLoc = extractedLocalities.length > 0 ? extractedLocalities[0] : (selectedLocality !== 'All Bengaluru' ? selectedLocality : 'Koramangala');
        const safetyMsg = `${targetLoc} maintains continuous CCTV coverage and 24/7 Karnataka Police patrol beats, reporting low night-time crime incidents based on official 2025 records.`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: safetyMsg }]);
        if (triggerAudio) speakText(safetyMsg, true);
        return;
      }

      // Parse parameters from query
      const isPenthouse = q.includes('penthouse');
      let specifiedBhk = null;
      if (q.includes('1bhk') || q.includes('1 bhk') || q.includes('1 bedroom')) specifiedBhk = 1;
      else if (q.includes('2bhk') || q.includes('2 bhk') || q.includes('2 bedroom')) specifiedBhk = 2;
      else if (q.includes('3bhk') || q.includes('3 bhk') || q.includes('3 bedroom')) specifiedBhk = 3;
      else if (q.includes('4bhk') || q.includes('4 bhk') || q.includes('4 bedroom')) specifiedBhk = 4;
      else if (isPenthouse) specifiedBhk = 'penthouse';

      // One-shot execution if user specifies locality AND (budget OR BHK) in ANY turn
      if (extractedLocalities.length > 0 && (parsedPrice || specifiedBhk)) {
        const locDisplay = extractedLocalities.join(' & ');
        executeBuyerFilter({
          localities: extractedLocalities,
          locality: locDisplay,
          listingType: activePersona === 'Buyer' ? 'sale' : 'rent',
          maxBudget: parsedPrice,
          bedrooms: isPenthouse ? 'penthouse' : (specifiedBhk || 2),
          isPenthouse: isPenthouse,
          familyPreferences: userQuery
        });
        return;
      }

      // STEP 0: AI asks initial neighborhood question
      if (currentStep === 0) {
        if (extractedLocalities.length > 0) {
          const locDisplay = extractedLocalities.join(' & ');
          setBuyerData({ listingType: activePersona === 'Buyer' ? 'sale' : 'rent', locality: locDisplay, localities: extractedLocalities, maxBudget: null, bedrooms: specifiedBhk, isPenthouse: isPenthouse, familyPreferences: '' });
          setSelectedLocality(locDisplay);

          if (specifiedBhk) {
            setBuyerStep(3);
            const promptBudget = isPenthouse 
              ? `Understood, a penthouse in ${locDisplay}! What is your maximum monthly rental budget in rupees?`
              : `Understood, ${specifiedBhk} BHK in ${locDisplay}! What is your maximum monthly rental budget in rupees?`;
            setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptBudget }]);
            if (triggerAudio) speakText(promptBudget, true);
            return;
          } else {
            setBuyerStep(2);
            const promptBhk = `Great! I'd be glad to help you find a property in ${locDisplay}. How many bedrooms (BHK) are you looking for — 1BHK, 2BHK, 3BHK, or a penthouse?`;
            setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptBhk }]);
            if (triggerAudio) speakText(promptBhk, true);
            return;
          }
        }

        setBuyerStep(1);
        const promptLocality = `Which neighborhood or locality in Bengaluru do you prefer? (For example, Koramangala, Indiranagar, HSR Layout, or Whitefield)`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptLocality }]);
        if (triggerAudio) speakText(promptLocality, true);
        return;
      }

      // STEP 1: User provides Locality -> AI asks Bedrooms (BHK)
      if (currentStep === 1) {
        const targetLocs = extractedLocalities.length > 0 ? extractedLocalities : (selectedLocality !== 'All Bengaluru' ? [selectedLocality] : []);
        if (targetLocs.length === 0) {
          triggerRepeatOrFallback("Which neighborhood or locality in Bengaluru do you prefer?");
          return;
        }

        const locDisplay = targetLocs.join(' & ');
        setBuyerData(prev => ({ ...prev, locality: locDisplay, localities: targetLocs }));
        setBuyerStep(2);
        setSelectedLocality(locDisplay);

        const promptBedrooms = `Got it, ${locDisplay}! How many bedrooms (BHK) are you looking for — 1BHK, 2BHK, 3BHK, or a penthouse?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptBedrooms }]);
        if (triggerAudio) speakText(promptBedrooms, true);
        return;
      }

      // STEP 2: User provides Bedrooms (BHK) -> AI asks Monthly Budget
      if (currentStep === 2) {
        const bhk = specifiedBhk;
        if (!bhk && !isPenthouse) {
          triggerRepeatOrFallback("How many bedrooms (BHK) are you looking for — 1BHK, 2BHK, or 3BHK?");
          return;
        }

        setBuyerData(prev => ({ ...prev, bedrooms: bhk, isPenthouse: isPenthouse }));
        setBuyerStep(3);

        const promptBudget = isPenthouse 
          ? `Understood, a penthouse in ${currentData.locality || 'Bengaluru'}! What is your maximum monthly budget in rupees?`
          : `Understood, ${bhk} BHK in ${currentData.locality || 'Bengaluru'}! What is your maximum monthly budget in rupees?`;

        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptBudget }]);
        if (triggerAudio) speakText(promptBudget, true);
        return;
      }

      // STEP 3: User provides Monthly Budget -> AI asks Specific Preferences
      if (currentStep === 3) {
        const finalPrice = parsedPrice;
        const validPrice = finalPrice || 45000;
        setBuyerData(prev => ({ ...prev, maxBudget: validPrice }));
        setBuyerStep(4);

        const promptPreferences = `Got it, around ${formatIndianCurrencyDisplay(validPrice, 'rent')}! Do you have any specific preferences — such as fully furnished layout, pet-friendly terms, or close to a hospital or metro station?`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: promptPreferences }]);
        if (triggerAudio) speakText(promptPreferences, true);
        return;
      }

      // STEP 4: Preferences Answered -> AI Executes Search & Speaks Ending Statement with Suggested Properties!
      if (currentStep === 4) {
        const targetLocs = currentData.localities || [currentData.locality || 'Koramangala'];
        executeBuyerFilter({
          localities: targetLocs,
          locality: targetLocs.join(' & '),
          listingType: activePersona === 'Buyer' ? 'sale' : 'rent',
          maxBudget: currentData.maxBudget,
          bedrooms: currentData.bedrooms,
          isPenthouse: currentData.isPenthouse || false,
          familyPreferences: userQuery
        });
        return;
      }

      // STEP 5: Unlimited Post-Discovery Mode
      if (currentStep === 5) {
        if (extractedLocalities.length > 0) {
          executeBuyerFilter({
            localities: extractedLocalities,
            locality: extractedLocalities.join(' & '),
            listingType: activePersona === 'Buyer' ? 'sale' : 'rent',
            maxBudget: currentData.maxBudget,
            bedrooms: currentData.bedrooms,
            isPenthouse: currentData.isPenthouse || false,
            familyPreferences: userQuery
          });
          return;
        }

        const followUpMsg = `I'm here to help! You can ask me to schedule a physical site visit, check metro station distance, compare properties, or explore another locality in Bengaluru.`;
        setTranscriptHistory(prev => [...prev, { role: 'assistant', text: followUpMsg }]);
        if (triggerAudio) speakText(followUpMsg, true);
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

    const topSuggestions = shortlist.slice(0, 3).map(p => {
      const price = p.listing_type === 'rent' ? p.rent_inr : p.sale_price_inr;
      const priceStr = price ? formatIndianCurrencyDisplay(price, p.listing_type || 'rent') : 'Price on request';
      return `${p.society_name} (${p.bedrooms ? p.bedrooms + ' BHK' : 'Apartment'} at ${priceStr})`;
    }).join(', ');

    const defaultMsg = shortlist.length > 0
      ? `Found ${shortlist.length} verified propert${shortlist.length === 1 ? 'y' : 'ies'} in ${selectedLocality}. These are the suggested properties for you: ${topSuggestions}. Would you like me to schedule a physical site visit for any of these properties?`
      : `We don't have any verified properties matching your current requirements in ${selectedLocality}. Feel free to adjust your budget or locality preferences!`;

    setTranscriptHistory(prev => [...prev, { role: 'assistant', text: defaultMsg }]);
    if (triggerAudio) speakText(defaultMsg);
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
        selectedLocality.toLowerCase().includes(item.locality.toLowerCase()) ||
        item.locality.toLowerCase().includes(selectedLocality.toLowerCase());
      
      const matchesType = item.listing_type === 'rent';

      let matchesBedrooms = true;
      if (buyerData && buyerData.bedrooms !== null && buyerData.bedrooms !== undefined) {
        if (buyerData.isPenthouse || buyerData.bedrooms === 'penthouse') {
          matchesBedrooms = item.bedrooms >= 4 || (item.society_name && item.society_name.toLowerCase().includes('penthouse'));
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
      />

      <InfoModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
