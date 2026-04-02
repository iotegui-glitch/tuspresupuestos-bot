const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.urlencoded({ extended: false }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

app.get('/', (req, res) => {
  res.send('TusPresupuestos Bot está activo 🟢');
});

async function getImageBase64(mediaUrl) {
  const response = await fetch(mediaUrl, {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(TWILIO_ACCOUNT_SID + ':' + TWILIO_AUTH_TOKEN).toString('base64')
    }
  });
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function analyzeWithClaude(base64Image, mediaType) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `Eres un experto en presupuestos de construcción y reformas en España.

Analiza esta foto de un presupuesto escrito a mano y extrae TODA la información que puedas:

1. Tipo de trabajo (reforma baño, pintura, fontanería, etc.)
2. Lista de partidas con descripción, cantidad/medida y precio
3. Subtotal, IVA y total si aparecen
4. Cualquier nota o condición

Responde en formato estructurado y claro. Si algo no se lee bien, indícalo con [ilegible].
Si no es un presupuesto, indica amablemente que necesitas una foto de un presupuesto.

IMPORTANTE: Responde siempre en español. Sé conciso pero completo. Usa emojis para hacerlo visual. Máximo 1500 caracteres para que quepa en WhatsApp.`
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (data.content && data.content[0]) {
    return data.content[0].text;
  }
  throw new Error('No response from Claude');
}

app.post('/webhook', async (req, res) => {
  const MessagingResponse = twilio.twiml.MessagingResponse;
  const twiml = new MessagingResponse();

  const incomingMsg = (req.body.Body || '').trim().toLowerCase();
  const from = req.body.From;
  const numMedia = parseInt(req.body.NumMedia) || 0;

  console.log(`📩 Mensaje de ${from}: "${req.body.Body}" | Media: ${numMedia}`);

  if (numMedia > 0) {
    const mediaUrl = req.body.MediaUrl0;
    const mediaType = req.body.MediaContentType0;
    console.log(`📷 Imagen recibida: ${mediaUrl} (${mediaType})`);

    try {
      const base64Image = await getImageBase64(mediaUrl);
      console.log('🔄 Enviando a Claude Vision...');
      
      const analysis = await analyzeWithClaude(base64Image, mediaType);
      console.log('✅ Análisis completado');

      twiml.message(
        '✅ *¡Presupuesto analizado!*\n\n' +
        analysis + '\n\n' +
        '---\n' +
        '📄 ¿Quieres que genere el *PDF profesional*?\n' +
        'Responde *"sí"* y te lo preparo.\n\n' +
        '_TusPresupuestos.com_'
      );
    } catch (error) {
      console.error('❌ Error:', error);
      twiml.message(
        '⚠️ Hubo un problema al procesar tu imagen.\n\n' +
        'Intenta de nuevo con una foto más clara y bien iluminada 📸'
      );
    }
  }
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
      '📦 *Mensual (29€/mes)* — Presupuestos ilimitados, sin marca, soporte prioritario\n\n' +
      '¿Quieres probar gratis? Manda tu foto 📸'
    );
  }
  else if (
    incomingMsg.includes('ayuda') ||
    incomingMsg.includes('help') ||
    incomingMsg.includes('como funciona') ||
    incomingMsg.includes('cómo funciona')
  ) {
    twiml.message(
      '📖 *¿Cómo funciona?*\n\n' +
      '1️⃣ Mándame una foto de tu presupuesto a mano\n' +
      '2️⃣ La IA analiza y extrae toda la información\n' +
      '3️⃣ Te devuelvo un PDF profesional aquí mismo\n\n' +
      '✅ Con tu logo, datos fiscales y aspecto profesional.\n\n' +
      '¿Empezamos? Manda tu foto 👇'
    );
  }
  else if (
    incomingMsg === 'si' ||
    incomingMsg === 'sí' ||
    incomingMsg === 'vale' ||
    incomingMsg === 'ok' ||
    incomingMsg === 'dale'
  ) {
    twiml.message(
      '🔨 *Generando tu PDF profesional...*\n\n' +
      '⏱️ En breve lo recibirás aquí mismo.\n\n' +
      '_Próximamente: generación automática de PDF._'
    );
  }
  else {
    twiml.message(
      'Gracias por tu mensaje 😊\n\n' +
      'Para transformar tu presupuesto, envía una *foto* 📸\n\n' +
      'Escribe *"ayuda"* para más información.'
    );
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TusPresupuestos Bot corriendo en puerto ${PORT}`);
});
