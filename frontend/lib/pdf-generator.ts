// frontend/lib/pdf-generator.ts
// PDF Order Download - A4 Portrait, Print-Ready

import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface OrderData {
    orderId: string;
    orderDate: string;
    dueDate: string;
    status: string;
    customer: {
        name: string;
        mobile: string;
        email?: string;
        address?: string;
        city?: string;
    };
    orderItems: Array<{
        product: { name: string };
        quantity: number;
        rate: number;
        total: number;
    }>;
    measurements?: Array<{
        type: string;
        data: any;
        notes?: string;
    }>;
    productTotal: number;
    deliveryCharges: number;
    gstAmount: number;
    discount: number;
    grandTotal: number;
    advancePaid: number;
    balanceDue: number;
    notes?: string;
}

export const generateOrderPDF = (order: OrderData) => {
    // A4 Portrait: 210mm x 297mm = 595.28pt x 841.89pt
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let yPos = margin;

    // ═══════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, pageWidth, 80, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER DETAILS', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order ID: ${order.orderId}`, pageWidth / 2, 55, {
        align: 'center',
    });

    yPos = 100;

    // ═══════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION (HIGHLIGHTED)
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(254, 243, 199); // Yellow-100
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 110, 5, 5, 'F');

    doc.setDrawColor(251, 191, 36); // Yellow-500
    doc.setLineWidth(2);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 110, 5, 5, 'S');

    yPos += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', margin + 10, yPos);

    yPos += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', margin + 10, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer.name, margin + 80, yPos);

    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Mobile:', margin + 10, yPos);
    doc.setFont('helvetica', 'normal');
    // Highlighted phone number
    doc.setFillColor(239, 68, 68); // Red-500
    doc.roundedRect(margin + 75, yPos - 12, 120, 18, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(order.customer.mobile, margin + 80, yPos);
    doc.setTextColor(0, 0, 0);

    if (order.customer.email) {
        yPos += 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', margin + 10, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(order.customer.email, margin + 80, yPos);
    }

    if (order.customer.address) {
        yPos += 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Address:', margin + 10, yPos);
        doc.setFont('helvetica', 'normal');
        const address = `${order.customer.address}, ${order.customer.city || ''}`;
        doc.text(address, margin + 80, yPos, {
            maxWidth: pageWidth - margin - 120,
        });
    }

    yPos += 40;

    // ═══════════════════════════════════════════════════════════
    // ORDER INFO
    // ═══════════════════════════════════════════════════════════
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(
        new Date(order.orderDate).toLocaleDateString('en-IN'),
        margin + 100,
        yPos
    );

    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', pageWidth / 2, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(
        new Date(order.dueDate).toLocaleDateString('en-IN'),
        pageWidth / 2 + 80,
        yPos
    );

    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(order.status.replace(/_/g, ' '), margin + 100, yPos);

    yPos += 30;

    // ═══════════════════════════════════════════════════════════
    // ORDER ITEMS TABLE
    // ═══════════════════════════════════════════════════════════
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER ITEMS', margin, yPos);
    yPos += 10;

    const itemsData = order.orderItems.map((item) => [
        item.product.name,
        item.quantity.toString(),
        `₹${item.rate.toFixed(2)}`,
        `₹${item.total.toFixed(2)}`,
    ]);

    (doc as any).autoTable({
        startY: yPos,
        head: [['Product', 'Qty', 'Rate', 'Total']],
        body: itemsData,
        theme: 'grid',
        headStyles: {
            fillColor: [59, 130, 246], // Blue-500
            textColor: 255,
            fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // ═══════════════════════════════════════════════════════════
    // FINANCIAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    const summaryX = pageWidth - margin - 200;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Product Total:', summaryX, yPos);
    doc.text(`₹${order.productTotal.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 18;
    doc.text('Delivery Charges:', summaryX, yPos);
    doc.text(`₹${order.deliveryCharges.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 18;
    doc.text('GST:', summaryX, yPos);
    doc.text(`₹${order.gstAmount.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 18;
    doc.text('Discount:', summaryX, yPos);
    doc.text(`-₹${order.discount.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 5;
    doc.setLineWidth(1);
    doc.line(summaryX, yPos, summaryX + 150, yPos);
    yPos += 18;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', summaryX, yPos);
    doc.text(`₹${order.grandTotal.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 18;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Advance Paid:', summaryX, yPos);
    doc.text(`₹${order.advancePaid.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });

    yPos += 5;
    doc.line(summaryX, yPos, summaryX + 150, yPos);
    yPos += 18;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12); // Orange-600
    doc.text('Balance Due:', summaryX, yPos);
    doc.text(`₹${order.balanceDue.toFixed(2)}`, summaryX + 150, yPos, {
        align: 'right',
    });
    doc.setTextColor(0, 0, 0);

    yPos += 40;

    // ═══════════════════════════════════════════════════════════
    // MEASUREMENTS (NEW PAGE IF NEEDED)
    // ═══════════════════════════════════════════════════════════
    if (order.measurements && order.measurements.length > 0) {
        if (yPos > pageHeight - 200) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MEASUREMENTS', margin, yPos);
        yPos += 15;

        order.measurements.forEach((measurement) => {
            doc.setFillColor(243, 244, 246); // Gray-100
            doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229); // Indigo-600
            doc.text(measurement.type, margin + 10, yPos + 17);
            doc.setTextColor(0, 0, 0);

            yPos += 35;

            const measurementEntries = Object.entries(measurement.data).filter(
                ([_, value]) => value !== null && value !== undefined && value !== ''
            );

            measurementEntries.forEach(([key, value], index) => {
                if (index % 3 === 0 && index > 0) yPos += 18;

                const xOffset = (index % 3) * 180;
                const fieldName = key
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .trim();

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(107, 114, 128); // Gray-500
                doc.text(fieldName, margin + 10 + xOffset, yPos);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(String(value), margin + 10 + xOffset, yPos + 12);
            });

            yPos += 25;

            if (measurement.notes) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(107, 114, 128);
                doc.text(`Notes: ${measurement.notes}`, margin + 10, yPos);
                yPos += 15;
            }

            yPos += 10;
        });
    }

    // ═══════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════
    const footerY = pageHeight - 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(
        `Generated on ${new Date().toLocaleString('en-IN')}`,
        pageWidth / 2,
        footerY,
        { align: 'center' }
    );

    // Save PDF
    doc.save(`Order_${order.orderId}.pdf`);
};
