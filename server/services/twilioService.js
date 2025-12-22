import twilio from 'twilio';

class TwilioService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendWhatsAppMessage(to, body) {
    try {
      const message = await this.client.messages.create({
        body: body,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`
      });
      console.log(`WhatsApp notification sent to ${to}, Message SID: ${message.sid}`);
      return message.sid;
    } catch (error) {
      console.error(`Failed to send WhatsApp to ${to}:`, error.message);
      throw error;
    }
  }
}

export const twilioService = new TwilioService();
