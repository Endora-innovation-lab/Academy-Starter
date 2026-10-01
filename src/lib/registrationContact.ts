// Temporary: public registration is handled manually via WhatsApp.
// The /register page still exists for manual use by the admin.
export const ADMIN_WHATSAPP_NUMBER = '919498090637'; // digits only, with country code

export const REGISTRATION_WHATSAPP_MESSAGE =
  'Hi, I would like to register my institute with Academy Starter. Please share the registration process.';

export const registrationWhatsAppUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  REGISTRATION_WHATSAPP_MESSAGE,
)}`;
