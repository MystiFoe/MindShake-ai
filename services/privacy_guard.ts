
export const maskPII = (text: string): string => {
  let masked = text;

  // Mask Emails
  masked = masked.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // Mask Phone Numbers (International and domestic formats)
  masked = masked.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE_REDACTED]');

  // Mask SSNs
  masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');

  // Mask Credit Cards (Basic check for 13-16 digit patterns)
  masked = masked.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[CREDIT_CARD_REDACTED]');

  return masked;
};
