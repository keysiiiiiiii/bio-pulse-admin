/**
 * Smart name parser for Philippine naming conventions
 * Handles multi-word first names, middle names/initials, and surnames
 * 
 * Examples:
 * "John Kenneth V. Santos" -> { first: "John Kenneth", middle: "V.", last: "Santos" }
 * "Maria De la Cruz" -> { first: "Maria", middle: "", last: "De la Cruz" }
 * "Jose Rizal" -> { first: "Jose", middle: "", last: "Rizal" }
 */

interface ParsedName {
  first: string;
  middle: string;
  last: string;
}

export function parseFullName(fullName: string): ParsedName {
  if (!fullName || typeof fullName !== 'string') {
    return { first: '', middle: '', last: '' };
  }

  // Clean and split the name
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');

  if (parts.length === 0) {
    return { first: '', middle: '', last: '' };
  }

  // Single name
  if (parts.length === 1) {
    return { first: parts[0], middle: '', last: '' };
  }

  // Two names: First Last
  if (parts.length === 2) {
    return { first: parts[0], middle: '', last: parts[1] };
  }

  // Three or more names
  // Last name is always the last part
  const lastName = parts[parts.length - 1];

  // Check if second-to-last is a middle initial (single letter with or without period)
  const secondToLast = parts[parts.length - 2];
  const isMiddleInitial = /^[A-Z]\.?$/.test(secondToLast);

  if (isMiddleInitial) {
    // Format: "First Name M. Last" or "First Name M Last"
    const middleName = secondToLast.endsWith('.') ? secondToLast : `${secondToLast}.`;
    const firstName = parts.slice(0, parts.length - 2).join(' ');
    return { first: firstName, middle: middleName, last: lastName };
  }

  // Check for multi-word middle names (like "De la Cruz", "Del Rosario")
  // Common Filipino middle name prefixes
  const middlePrefixes = ['de', 'del', 'dela', 'delos', 'delas', 'san', 'santa'];
  
  // Look for middle name patterns from the end
  let middleStartIndex = parts.length - 2;
  for (let i = parts.length - 2; i >= 1; i--) {
    const part = parts[i].toLowerCase();
    if (middlePrefixes.includes(part)) {
      middleStartIndex = i;
    } else {
      break;
    }
  }

  // If we found a middle name pattern
  if (middleStartIndex < parts.length - 1) {
    const firstName = parts.slice(0, middleStartIndex).join(' ');
    const middleName = parts.slice(middleStartIndex, parts.length - 1).join(' ');
    return { first: firstName, middle: middleName, last: lastName };
  }

  // Default: treat second-to-last as middle name
  // Format: "First Middle Last"
  const firstName = parts.slice(0, parts.length - 2).join(' ');
  const middleName = parts[parts.length - 2];
  
  return { first: firstName, middle: middleName, last: lastName };
}
