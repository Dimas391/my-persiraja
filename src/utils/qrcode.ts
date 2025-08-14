import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export class QRCodeUtil {
  static async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M', // nilai yang valid: 'L', 'M', 'Q', 'H'
        type: 'image/png',
        margin: 1,
        width: 256,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Gagal menghasilkan QR code');
    }
  }

  static generateBookingReference(): string {
    const prefix = 'PBA';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  static generateOrderNumber(): string {
    const prefix = 'ORD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  static async generateTicketQR(ticketData: {
    bookingReference: string;
    matchId: number;
    ticketType: string;
    quantity: number;
    userEmail: string;
  }): Promise<string> {
    const qrData = JSON.stringify({
      ref: ticketData.bookingReference,
      match: ticketData.matchId,
      type: ticketData.ticketType,
      qty: ticketData.quantity,
      email: ticketData.userEmail,
      timestamp: new Date().toISOString()
    });

    return await this.generateQRCode(qrData);
  }
}
