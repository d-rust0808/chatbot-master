/**
 * Payment Service - Sepay Integration
 * 
 * WHY: Business logic cho payment operations
 * - Tạo payment order với mã giao dịch unique
 * - Generate QR Code từ Sepay
 * - Xử lý webhook từ Sepay
 * - Tự động expire payments quá hạn
 * - Tích hợp với CreditWallet để cộng tiền
 */

import { prisma } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { config } from '../../infrastructure/config';
import { vndWalletService } from '../wallet/vnd-wallet.service';

// Constants
const MIN_AMOUNT = 10000; // 10,000 VNĐ tối thiểu
const PAYMENT_EXPIRY_MINUTES = 5; // 5 phút
const CODE_LENGTH = 8; // Mã giao dịch 8 ký tự

/**
 * Generate unique payment code (8 characters: A-Z0-9)
 */
function generatePaymentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate QR Code URL từ Sepay
 * WHY: Sử dụng Sepay QR Code API để tạo QR Code thanh toán tự động
 * Format: https://qr.sepay.vn/img?acc={account}&bank={bank}&amount={amount}&des={code}&template={template}
 */
async function generateQRCode(amount: number, code: string): Promise<{ qrCode: string; qrCodeData: string }> {
  const account = config.sepay.account;
  const bank = config.sepay.bank;
  const template = config.sepay.template;

  if (!account || !bank) {
    throw new Error('Sepay account và bank chưa được cấu hình. Vui lòng cấu hình SEPAY_ACCOUNT và SEPAY_BANK trong file .env');
  }

  // Generate QR Code URL theo format Sepay
  const qrCodeUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(account)}&bank=${encodeURIComponent(bank)}&amount=${amount}&des=${encodeURIComponent(code)}&template=${template}`;

  // QR Code data để lưu vào DB (JSON format)
  const qrCodeData = JSON.stringify({
    account,
    bank,
    amount,
    content: code,
    template,
    qrCodeUrl,
  });

  return {
    qrCode: qrCodeUrl,
    qrCodeData,
  };
}

/**
 * Create payment order
 */
export async function createPayment(
  tenantId: string,
  userId: string,
  amount: number
): Promise<{
  id: string;
  code: string;
  amount: number;
  qrCode: string;
  qrCodeData: string;
  expiresAt: Date;
}> {
  // Validate amount
  if (amount < MIN_AMOUNT) {
    throw new Error(`Số tiền tối thiểu là ${MIN_AMOUNT.toLocaleString('vi-VN')} VNĐ`);
  }

  // Anti-spam: Check if user has active payment (pending or expired but not completed/cancelled)
  // WHY: Chỉ cho phép tạo lệnh mới khi payment trước đó đã completed hoặc cancelled
  // - Tránh spam tạo nhiều lệnh thanh toán
  // - User phải hoàn thành hoặc hủy đơn trước đó mới tạo được đơn mới
  // - Rule: Chỉ cho phép 1 payment pending/active tại 1 thời điểm
  
  // Check 1: Tìm payment đang pending (chưa hết hạn)
  const activePending = await (prisma as any).payment.findFirst({
    where: {
      userId,
      tenantId, // Security: Filter by tenant
      status: 'pending',
      expiresAt: { gt: new Date() }, // Chưa hết hạn
    },
  });

  if (activePending) {
    throw new Error('Bạn đang có giao dịch đang chờ thanh toán. Vui lòng hoàn thành hoặc hủy giao dịch trước đó.');
  }

  // Check 2: Tìm payment gần nhất của user để kiểm tra trạng thái
  // Rule: Chỉ cho phép tạo mới khi payment cuối cùng là completed hoặc cancelled
  // - Nếu payment cuối cùng là pending (kể cả đã hết hạn) -> không cho tạo mới
  // - Nếu payment cuối cùng là expired -> không cho tạo mới (phải hủy thủ công)
  // - Nếu payment cuối cùng là completed/cancelled -> cho phép tạo mới
  const lastPayment = await (prisma as any).payment.findFirst({
    where: {
      userId,
      tenantId, // Security: Filter by tenant
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lastPayment) {
    // Chỉ cho phép tạo mới khi payment cuối cùng là completed hoặc cancelled
    // Các status khác (pending, expired, processing, ...) đều không cho tạo mới
    if (lastPayment.status !== 'completed' && lastPayment.status !== 'cancelled') {
      // Nếu payment đã hết hạn nhưng status vẫn là pending, tự động expire
      if (lastPayment.status === 'pending' && new Date(lastPayment.expiresAt) < new Date()) {
        await (prisma as any).payment.update({
          where: { id: lastPayment.id },
          data: { status: 'expired' },
        });
        logger.info('Auto-expired payment during create check', { paymentId: lastPayment.id });
        
        // Sau khi expire, vẫn không cho tạo mới (phải hủy thủ công)
        throw new Error(
          'Bạn có giao dịch đã hết hạn. Vui lòng hủy giao dịch đó trước khi tạo lệnh nạp mới.'
        );
      }
      
      // Payment có status khác completed/cancelled -> không cho tạo mới
      throw new Error(
        `Bạn đang có giao dịch với trạng thái "${lastPayment.status}". ` +
        `Vui lòng hoàn thành hoặc hủy giao dịch trước đó trước khi tạo lệnh nạp mới.`
      );
    }
  }

  // Generate unique code
  let code: string;
  let codeExists = true;
  while (codeExists) {
    code = generatePaymentCode();
    const existing = await (prisma as any).payment.findUnique({
      where: { code },
    });
    codeExists = !!existing;
  }

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PAYMENT_EXPIRY_MINUTES);

  // Generate QR Code
  const { qrCode, qrCodeData } = await generateQRCode(amount, code!);

  // Create payment
  const payment = await (prisma as any).payment.create({
    data: {
      tenantId,
      userId,
      code: code!,
      amount,
      qrCode,
      qrCodeData,
      expiresAt,
      status: 'pending',
    },
  });

  logger.info('Payment created', {
    paymentId: payment.id,
    code: payment.code,
    amount: payment.amount,
    userId,
    tenantId,
  });

  return {
    id: payment.id,
    code: payment.code,
    amount: payment.amount,
    qrCode: payment.qrCode!,
    qrCodeData: payment.qrCodeData!,
    expiresAt: payment.expiresAt,
  };
}

/**
 * Find payment by code (for webhook matching)
 */
export async function findPaymentByCode(code: string): Promise<{
  id: string;
  tenantId: string;
  userId: string;
  amount: number;
  status: string;
  code: string;
} | null> {
  const payment = await (prisma as any).payment.findUnique({
    where: { code },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      amount: true,
      status: true,
      code: true,
    },
  });

  return payment;
}

/**
 * Find payment by amount (fallback strategy for webhook)
 */
export async function findPaymentByAmount(
  amount: number,
  excludeStatuses: string[] = ['completed', 'cancelled']
): Promise<{
  id: string;
  tenantId: string;
  userId: string;
  code: string;
  status: string;
  amount: number;
} | null> {
  const payment = await (prisma as any).payment.findFirst({
    where: {
      amount,
      status: { notIn: excludeStatuses },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      code: true,
      status: true,
      amount: true,
    },
  });

  return payment;
}

/**
 * Extract payment code from content (webhook strategy 2)
 */
export function extractCodeFromContent(content: string): string | null {
  // Tìm mã 8 ký tự chữ-số viết hoa trong content
  const codePattern = /[A-Z0-9]{8}/;
  const match = content.match(codePattern);
  return match ? match[0] : null;
}

/**
 * Complete payment và cộng credit vào wallet
 */
export async function completePayment(
  paymentId: string,
  webhookData?: any
): Promise<void> {
  // Get payment data first (outside transaction)
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      tenantId: true,
      code: true,
      amount: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'pending') {
    logger.warn('Payment already processed', {
      paymentId,
      currentStatus: payment.status,
    });
    return;
  }

  // Check if expired
  if (payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'expired' },
    });
    throw new Error('Payment expired');
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      webhookData: webhookData || null,
    },
  });

  // Add VNĐ to wallet (not credit - user needs to buy credits separately)
  await vndWalletService.addVND(
    payment.tenantId,
    payment.amount,
    `Nạp tiền qua Sepay - Mã GD: ${payment.code}`,
    paymentId,
    {
      paymentCode: payment.code,
      paymentAmount: payment.amount,
      webhookData,
    }
  );

  logger.info('Payment completed and VND added to wallet', {
    paymentId,
    paymentCode: payment.code,
    amount: payment.amount,
    tenantId: payment.tenantId,
  });
}

/**
 * Expire pending payments that are past expiry time
 */
export async function expirePendingPayments(): Promise<number> {
  const now = new Date();
  
  const result = await (prisma as any).payment.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: now },
    },
    data: {
      status: 'expired',
    },
  });

  if (result.count > 0) {
    logger.info('Expired pending payments', { count: result.count });
  }

  return result.count;
}

/**
 * Cancel pending payment
 * WHY: Hủy giao dịch thanh toán đang pending
 * - Chỉ hủy được payment có status 'pending'
 * - Kiểm tra tenantId để đảm bảo security (multi-tenant)
 */
export async function cancelPayment(
  paymentId: string,
  userId: string,
  tenantId?: string
): Promise<void> {
  const payment = await (prisma as any).payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Security: Verify user owns the payment
  if (payment.userId !== userId) {
    throw new Error('Unauthorized: Payment does not belong to user');
  }

  // Security: Verify tenant matches (multi-tenant isolation)
  if (tenantId && payment.tenantId !== tenantId) {
    throw new Error('Unauthorized: Payment does not belong to tenant');
  }

  // Business rule: Only cancel pending payments
  if (payment.status !== 'pending') {
    throw new Error(`Cannot cancel payment with status: ${payment.status}`);
  }

  // Update payment status to cancelled
  await (prisma as any).payment.update({
    where: { id: paymentId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });

  logger.info('Payment cancelled', { paymentId, userId, tenantId });
}

