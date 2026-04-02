const express = require('express');
const twilio = require('twilio');
const app = express();

// Parse URL-encoded bodies (Twilio sends data this way)
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('TusPresupuestos Bot está activo 🟢');
});

// WhatsApp webhook - receives incoming messages
app.post('/webhook', (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  const incomingMsg = (req.body.Body || '').trim().toLowerCase();
  const from = req.body.From;
  const numMedia = parseInt(req.body.NumMedia) || 0;

  console.log(`📩 Mensaje de ${from}: "${req.body.Body}" | Media: ${numMedia}`);

  // If user sends a photo
  if (numMedia > 0) {
    const mediaUrl = req.body.MediaUrl0;
    const mediaType = req.body.MediaContentType0;
    console.log(`📷 Imagen recibida: ${mediaUrl} (${mediaType})`);

    twiml.message(
      '✅ ¡Foto recibida! Estamos procesando tu presupuesto.\n\n' +
      '📋 En breve recibirás tu PDF profesional.\n\n' +
      '⏱️ Tiempo estimado: menos de 2 horas.\n\n' +
      '¿Quieres añadir algún dato? (nombre de empresa, CIF, teléfono...)'
    );
  }
  // Greeting messages
  else if (
    incomingMsg.includes('hola') ||
    incomingMsg.includes('buenas') ||
    incomingMsg.includes('buenos') ||
    incomingMsg.includes('hey') ||
    incomingMsg.includes('presupuesto')
  ) {
    twiml.message(
      '¡Hola! 👋 Soy el asistente de *TusPresupuestos.com*\n\n' +
      'Envíame una *foto* de tu presupuesto escrito a mano y lo transformo en un PDF profesional.\n\n' +
      '📸 Solo tienes que mandar la foto y listo.\n\n' +
      '💰 *Gratis* — tu PDF llevará nuestra marca de agua.\n' +
      '⚡ *Premium* — sin marca de agua, entrega instantánea.\n\n' +
      '¿Empezamos? Manda tu foto 👇'
    );
  }
  // Pricing questions
  else if (
    incomingMsg.includes('precio') ||
    incomingMsg.includes('cuanto') ||
    incomingMsg.includes('cuánto') ||
    incomingMsg.includes('tarifa') ||
    incomingMsg.includes('plan') ||
    incomingMsg.includes('premium')
  ) {
    twiml.message(
      '💰 *Nuestros planes:*\n\n' +
      '🆓 *Gratis* — PDF con marca de agua, entrega en ~10 min\n\n' +
      '⚡ *Puntual (4,99€)* — Sin marca de agua, entrega instantánea\n\n' +
      '📦 *Mensual (29€/mes)* — Presupuestos ilimitados, sin marca de agua, entrega instantánea, soporte prioritario\n\n' +
      '¿Quieres probar gratis? Manda tu foto 📸'
    );
  }
  // Help
  else if (
    incomingMsg.includes('ayuda') ||
    incomingMsg.includes('help') ||
    incomingMsg.includes('como funciona') ||
    incomingMsg.includes('cómo funciona')
  ) {
    twiml.message(
      '📖 *¿Cómo funciona?*\n\n' +
      '1️⃣ Mándame una foto de tu presupuesto a mano\n' +
      '2️⃣ Nosotros lo transformamos en un PDF profesional\n' +
      '3️⃣ Te lo enviamos aquí mismo por WhatsApp\n\n' +
      '✅ Con tu logo, datos fiscales y aspecto profesional.\n\n' +
      '¿Empezamos? Manda tu foto 👇'
    );
  }
  // Default response
  else {
    twiml.message(
      'Gracias por tu mensaje. 😊\n\n' +
      'Para transformar tu presupuesto, solo tienes que *enviar una foto* 📸\n\n' +
      'Escribe *"ayuda"* si necesitas más información.'
    );
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TusPresupuestos Bot corriendo en puerto ${PORT}`);
});
