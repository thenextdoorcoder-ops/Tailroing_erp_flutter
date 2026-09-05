import PDFDocument from 'pdfkit';
import prisma from '../../../lib/prisma';

export const ecomInvoiceService = {
    async generateInvoice(orderId: string): Promise<Buffer> {
        // Fetch the order with all details
        const order = await prisma.ecomOrder.findFirst({
            where: { OR: [{ id: orderId }, { orderNumber: orderId }], deletedAt: null },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, slug: true } },
                        variant: { select: { color: true, size: true, sku: true } },
                    },
                },
            },
        });

        if (!order) throw new Error('Order not found');

        // Fetch shop branding from SUPER_ADMIN
        const shopAdmin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            select: {
                shopName: true,
                invoiceSettings: true,
            },
        });

        const settings = (shopAdmin?.invoiceSettings as any) || {};
        const shopName = shopAdmin?.shopName || settings.shopName || 'KTown Aari Works';
        const shopAddress = settings.address || '';
        const shopPhone = settings.phone || '';
        const gstNumber = settings.gstNumber || '';
        const udyamNumber = settings.udyamNumber || '';

        // Customer info
        const customerName = order.guestPhone || order.guestEmail || 'Customer';
        const customerEmail = order.guestEmail || '';
        const customerPhone = order.guestPhone || '';

        return new Promise((resolve, reject) => {
            const buffers: Buffer[] = [];
            const doc = new PDFDocument({ size: 'A4', margin: 50 });

            doc.on('data', (chunk: Buffer) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // ── HEADER BAND ──────────────────────────────────────────────────
            doc.rect(0, 0, doc.page.width, 90).fill('#be123c'); // rose-700

            doc.fillColor('#ffffff')
                .fontSize(22)
                .font('Helvetica-Bold')
                .text(shopName, 50, 28, { align: 'left' });

            doc.fontSize(10)
                .font('Helvetica')
                .text('TAX INVOICE', 50, 55, { align: 'left' });

            doc.fillColor('#ffffff')
                .fontSize(9)
                .text(`Order: ${order.orderNumber}`, doc.page.width - 220, 28, { align: 'right' })
                .text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, doc.page.width - 220, 44, { align: 'right' })
                .text(`Status: ${order.status.replace(/_/g, ' ')}`, doc.page.width - 220, 60, { align: 'right' });

            doc.fillColor('#000000');

            // ── SHOP AND CUSTOMER INFO ────────────────────────────────────────
            let y = 110;

            // Shop details box
            doc.rect(50, y, 230, 100).stroke('#e5e7eb');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('FROM', 60, y + 8);
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(shopName, 60, y + 22);
            doc.fontSize(9).font('Helvetica').fillColor('#374151');
            if (shopAddress) doc.text(shopAddress, 60, y + 38, { width: 210 });
            if (shopPhone) doc.text(`Phone: ${shopPhone}`, 60, y + 54);
            if (gstNumber) doc.text(`GST: ${gstNumber}`, 60, y + 66);
            if (udyamNumber) doc.text(`UDYAM: ${udyamNumber}`, 60, y + 78);

            // Customer details box
            doc.rect(300, y, 245, 100).stroke('#e5e7eb');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text('BILLED TO', 312, y + 8);
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(customerName, 312, y + 22);
            doc.fontSize(9).font('Helvetica').fillColor('#374151');
            if (customerEmail) doc.text(`Email: ${customerEmail}`, 312, y + 38);
            if (customerPhone) doc.text(`Phone: ${customerPhone}`, 312, y + 52);
            if (order.shippingAddress) {
                const addr = order.shippingAddress as any;
                const addrStr = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
                if (addrStr) doc.text(addrStr, 312, y + 66, { width: 225 });
            }

            // ── BARCODE-LIKE VISUAL (Order Number) ───────────────────────────
            y += 120;

            // Draw a simple barcode effect using rectangles
            doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text(`Order ID barcode: ${order.orderNumber}`, 50, y, { align: 'center', width: doc.page.width - 100 });
            y += 14;

            // Draw striped barcode visual
            const barcodeX = (doc.page.width - 200) / 2;
            const barcodeWidth = 200;
            const barcodeHeight = 28;
            const barWidths = [1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2, 3, 1, 2, 1];
            let bx = barcodeX;
            let filled = true;
            for (const w of barWidths) {
                const barW = (barcodeWidth / barWidths.reduce((a, b) => a + b, 0)) * w;
                if (filled) doc.rect(bx, y, barW, barcodeHeight).fill('#111827');
                bx += barW;
                filled = !filled;
            }
            doc.rect(barcodeX, y, barcodeWidth, barcodeHeight).stroke('#d1d5db');
            doc.fillColor('#111827').fontSize(8).font('Helvetica').text(order.orderNumber, barcodeX, y + barcodeHeight + 3, { width: barcodeWidth, align: 'center' });

            // ── ITEMS TABLE ───────────────────────────────────────────────────
            y += barcodeHeight + 22;

            const tableLeft = 50;
            const colWidths = [220, 60, 85, 80];
            const headers = ['Product', 'Qty', 'Unit Price', 'Total'];
            const rowHeight = 28;

            // Table header
            doc.rect(tableLeft, y, doc.page.width - 100, rowHeight).fill('#fdf2f8');
            doc.fillColor('#be123c').fontSize(9).font('Helvetica-Bold');
            let cx = tableLeft + 8;
            headers.forEach((h, i) => {
                doc.text(h, cx, y + 9, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'right' });
                cx += colWidths[i];
            });

            y += rowHeight;

            // Table rows
            order.items.forEach((item, idx) => {
                const rowY = y;
                if (idx % 2 === 0) doc.rect(tableLeft, rowY, doc.page.width - 100, rowHeight).fill('#fafafa');
                else doc.rect(tableLeft, rowY, doc.page.width - 100, rowHeight).fill('#ffffff');

                const variantLabel = [item.variant?.color, item.variant?.size].filter(Boolean).join(' / ');
                const productLabel = item.product?.name + (variantLabel ? ` (${variantLabel})` : '');

                doc.fillColor('#111827').fontSize(9).font('Helvetica');
                cx = tableLeft + 8;
                doc.text(productLabel, cx, rowY + 9, { width: colWidths[0] - 16, ellipsis: true });
                cx += colWidths[0];
                doc.text(String(item.quantity), cx, rowY + 9, { width: colWidths[1] - 8, align: 'right' });
                cx += colWidths[1];
                doc.text(`₹${Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, cx, rowY + 9, { width: colWidths[2] - 8, align: 'right' });
                cx += colWidths[2];
                doc.text(`₹${Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, cx, rowY + 9, { width: colWidths[3] - 16, align: 'right' });

                doc.rect(tableLeft, rowY, doc.page.width - 100, rowHeight).stroke('#f3f4f6');
                y += rowHeight;
            });

            // ── TOTALS ────────────────────────────────────────────────────────
            y += 8;
            const totalsLeft = doc.page.width - 250;
            const totalsWidth = 200;

            const drawTotalRow = (label: string, value: string, bold = false, color = '#111827') => {
                doc.fillColor('#6b7280').fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(label, totalsLeft, y, { width: totalsWidth - 90 });
                doc.fillColor(color).fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, totalsLeft + totalsWidth - 90, y, { width: 90, align: 'right' });
                y += 16;
            };

            drawTotalRow('Subtotal', `₹${Number(order.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
            if (Number(order.discount) > 0) drawTotalRow('Discount', `-₹${Number(order.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, '#16a34a');

            doc.moveTo(totalsLeft, y).lineTo(doc.page.width - 50, y).stroke('#e5e7eb');
            y += 4;

            drawTotalRow('Grand Total', `₹${Number(order.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, true, '#be123c');

            // ── FOOTER ────────────────────────────────────────────────────────
            y = doc.page.height - 80;
            doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#e5e7eb');
            doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
                .text(`Thank you for your purchase! | ${shopName}`, 50, y + 10, { align: 'center', width: doc.page.width - 100 });
            if (gstNumber) {
                doc.text(`GST Registration: ${gstNumber}`, 50, y + 22, { align: 'center', width: doc.page.width - 100 });
            }
            doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 50, y + 34, { align: 'center', width: doc.page.width - 100 });

            doc.end();
        });
    },
};
