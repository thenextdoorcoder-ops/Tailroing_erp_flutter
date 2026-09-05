import PDFDocument from "pdfkit";
import fs from 'fs';
import path from 'path';
import { generateBarcode } from "../../tailoring/product/barcode.service";

// Constants for layout
const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 width in points
const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN);

const COLORS = {
  PRIMARY: "#db2777", // Pink-600
  SECONDARY: "#475569", // Slate-600
  TEXT: "#1e293b", // Slate-800
  LIGHT_BG: "#fdf2f8", // Pink-50
  BORDER: "#e2e8f0", // Slate-200
  WHITE: "#ffffff",
};

export const generateInvoicePDF = async (order: any): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Helpers
    const formatCurrency = (value: any) => `₹${Number(value || 0).toFixed(2)}`;
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "N/A";
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const drawHr = (y: number) => {
      doc
        .strokeColor(COLORS.BORDER)
        .lineWidth(1)
        .moveTo(MARGIN, y)
        .lineTo(PAGE_WIDTH - MARGIN, y)
        .stroke();
    };

    // --- Branding Data ---
    const user = order.user || {};
    const invoiceSettings = user.invoiceSettings || {};
    const shopName = user.shopName || "TAILORING SHOP";
    const shopPhone = invoiceSettings.phone || user.phoneNumber || "";
    const shopAddress = invoiceSettings.address || "";
    const gstNumber = invoiceSettings.gstNumber;
    const udyamNumber = invoiceSettings.udyamNumber;
    const terms = invoiceSettings.terms || "";

    // --- Page Border (All Pages) ---
    const drawPageBorder = () => {
      doc
        .rect(20, 20, PAGE_WIDTH - 40, 841.89 - 40) // A4 Height is 841.89
        .strokeColor(COLORS.PRIMARY)
        .lineWidth(2)
        .stroke();
    };
    drawPageBorder();
    doc.on('pageAdded', drawPageBorder);


    /* =====================================================
       PAGE 1: INVOICE
    ===================================================== */

    // --- Header ---
    const headerTop = 45;
    let logoOffset = 0;

    // Logo
    if (user.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), user.logoUrl); // Assuming local file path
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, MARGIN, headerTop, { width: 60 });
          logoOffset = 70;
        }
      } catch (e) {
        console.error("Failed to load logo", e);
      }
    }

    // Company Name (Left)
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(COLORS.PRIMARY)
      .text(shopName.toUpperCase(), MARGIN + logoOffset, headerTop)
      .fontSize(10)
      .font("Helvetica")
      .fillColor(COLORS.SECONDARY)
      .text(shopAddress, MARGIN + logoOffset, headerTop + 30, { width: 250 });

    if (shopPhone) {
      doc.text(`Phone: ${shopPhone}`, MARGIN + logoOffset, doc.y);
    }
    if (gstNumber) {
      doc.text(`GST: ${gstNumber}`, MARGIN + logoOffset, doc.y);
    }
    if (udyamNumber) {
      doc.text(`UDYAM: ${udyamNumber}`, MARGIN + logoOffset, doc.y);
    }

    // Invoice Label (Right)
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor(COLORS.SECONDARY)
      .text("INVOICE", 0, headerTop, { align: "right", width: PAGE_WIDTH - MARGIN });

    // Barcode (Right, below label)
    try {
      const barcodeBuffer = await generateBarcode(order.orderId);
      // Position below "INVOICE" label but above date/ID
      doc.image(barcodeBuffer, PAGE_WIDTH - MARGIN - 120, headerTop + 35, { width: 120 });
    } catch (e) {
      console.error("Failed to generate barcode for invoice", e);
    }

    // Invoice # and Date (Right, below barcode)
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(COLORS.TEXT)
      .text(`Invoice #: ${order.orderId}`, 0, headerTop + 75, { align: "right", width: PAGE_WIDTH - MARGIN })
      .text(`Date: ${formatDate(order.orderDate)}`, 0, headerTop + 90, { align: "right", width: PAGE_WIDTH - MARGIN });

    drawHr(155);

    // --- Customer & Order Info Section ---
    const infoTop = 185;

    // Left Column: Bill To
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(COLORS.TEXT)
      .text("Bill To:", MARGIN, infoTop);

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(COLORS.SECONDARY)
      .text(order.customer?.name || "N/A", MARGIN, infoTop + 20)
      .text(order.customer?.mobile || "", MARGIN, infoTop + 35)
      .text(order.customer?.address || "", MARGIN, infoTop + 50, { width: 220 });

    if (order.orderingFor) {
      doc
        .moveDown(1)
        .font("Helvetica-Bold")
        .fillColor(COLORS.PRIMARY)
        .text(`Ordering For: ${order.orderingFor}`);
    }

    // Right Column: Order Details Box
    const rightColX = 350;
    const boxPadding = 10;
    const boxHeight = 65;

    doc
      .rect(rightColX - boxPadding, infoTop - boxPadding, 200, boxHeight)
      .fill(COLORS.LIGHT_BG);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(COLORS.PRIMARY)
      .text("Order Details", rightColX, infoTop);

    doc.fontSize(10).font("Helvetica").fillColor(COLORS.SECONDARY);

    const details = [
      { label: "Order Date", value: formatDate(order.orderDate) },
      { label: "Due Date", value: formatDate(order.dueDate) },
    ];

    let detailY = infoTop + 22;
    details.forEach((item) => {
      doc.text(item.label, rightColX, detailY);
      doc.text(item.value, rightColX + 90, detailY, { align: "right", width: 90 });
      detailY += 15;
    });

    // --- Items Table ---
    const tableTop = 280;
    const colX = { item: MARGIN + 10, qty: 320, rate: 390, total: 480 };

    // Table Header Background
    doc
      .rect(MARGIN, tableTop, CONTENT_WIDTH, 25)
      .fill(COLORS.SECONDARY);

    // Table Headers
    doc.fillColor(COLORS.WHITE).fontSize(10).font("Helvetica-Bold");
    doc.text("Item Description", colX.item, tableTop + 8);
    doc.text("Qty", colX.qty, tableTop + 8, { width: 50, align: "center" });
    doc.text("Rate", colX.rate, tableTop + 8, { width: 70, align: "right" });
    doc.text("Total", colX.total, tableTop + 8, { width: 65, align: "right" });

    // Rows
    let y = tableTop + 35;
    doc.font("Helvetica").fillColor(COLORS.TEXT);

    order.orderItems?.forEach((item: any, index: number) => {
      // Alternating row background
      if (index % 2 === 1) {
        doc
          .rect(MARGIN, y - 5, CONTENT_WIDTH, 20)
          .fill("#f1f5f9"); // Slate-100
        doc.fillColor(COLORS.TEXT);
      }

      doc.text(item.product?.name || "Item", colX.item, y);
      doc.text(String(item.quantity), colX.qty, y, { width: 50, align: "center" });
      doc.text(formatCurrency(item.rate), colX.rate, y, { width: 70, align: "right" });
      doc.text(formatCurrency(item.total), colX.total, y, { width: 65, align: "right" });

      y += 25;
    });

    // Border Lines for Table
    doc
      .rect(MARGIN, tableTop, CONTENT_WIDTH, y - tableTop) // Outer border
      .strokeColor(COLORS.BORDER)
      .stroke();

    // --- Totals Section ---
    y += 20;
    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    const totalLabelX = 350;
    const totalValueX = 450;
    const totalWidth = 95;

    const drawTotalRow = (label: string, value: any, isBold = false, color = COLORS.TEXT, fontSize = 10) => {
      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fontSize)
        .fillColor(color)
        .text(label, totalLabelX, y)
        .text(formatCurrency(value), totalValueX, y, { width: totalWidth, align: "right" });
      y += 20;
    };

    drawTotalRow("Product Total:", order.productTotal);

    if (Number(order.deliveryCharges) > 0) {
      drawTotalRow("Delivery Charges:", order.deliveryCharges);
    }

    if (Number(order.gstAmount) > 0) {
      drawTotalRow("GST:", order.gstAmount);
    }

    if (Number(order.discount) > 0) {
      drawTotalRow("Discount:", order.discount);
    }

    // Divider
    doc
      .moveTo(totalLabelX, y - 5)
      .lineTo(totalValueX + totalWidth, y - 5)
      .strokeColor(COLORS.BORDER)
      .stroke();

    drawTotalRow("Grand Total:", order.grandTotal, true, COLORS.PRIMARY, 12);

    y += 5;
    drawTotalRow("Advance Paid:", order.advancePaid, false, "green");
    drawTotalRow("Balance Due:", order.balanceDue, true, "red");

    // --- Signature & Footer ---
    const footerY = 700;

    // Digital Signature
    if (user.signatureUrl) {
      try {
        const sigPath = path.join(process.cwd(), user.signatureUrl);
        if (fs.existsSync(sigPath)) {
          doc.image(sigPath, PAGE_WIDTH - MARGIN - 100, footerY - 60, { width: 80 });
        }
      } catch (e) {
        console.error("Failed to load signature", e);
      }
    }

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(COLORS.TEXT)
      .text("Authorized Signature", 0, footerY, { align: "right", width: PAGE_WIDTH - MARGIN });

    if (terms) {
      doc
        .moveDown(2)
        .fontSize(8)
        .font("Helvetica")
        .fillColor(COLORS.SECONDARY)
        .text("Terms & Conditions:", MARGIN, doc.y)
        .text(terms, MARGIN, doc.y + 5, { width: CONTENT_WIDTH });
    }

    const bottomY = 780;
    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .fillColor(COLORS.SECONDARY)
      .text("Thank you for your business!", MARGIN, bottomY, { align: "center", width: CONTENT_WIDTH });


    /* =====================================================
       PAGE 2: MEASUREMENTS
    ===================================================== */

    if (order.measurements && order.measurements.length > 0) {
      doc.addPage();
      const page2Top = 50;

      // Header
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .fillColor(COLORS.PRIMARY)
        .text("MEASUREMENT DETAILS", MARGIN, page2Top, { align: "center" });

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(COLORS.SECONDARY)
        .text(`Order #${order.orderId} - ${order.customer?.name}`, MARGIN, page2Top + 25, { align: "center" });

      let layoutY = page2Top + 60;

      // Group measurements by type
      const grouped: Record<string, any[]> = {};
      order.measurements.forEach((m: any) => {
        const type = m.type || "OTHER";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(m);
      });

      // Render Groups
      Object.entries(grouped).forEach(([type, measurements]) => {
        if (layoutY > 700) {
          doc.addPage();
          layoutY = 50;
        }

        const startY = layoutY;

        // Section Header Bar
        doc
          .rect(MARGIN, layoutY, CONTENT_WIDTH, 25)
          .fill(COLORS.LIGHT_BG);

        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor(COLORS.PRIMARY)
          .text(type.replace(/_/g, " "), MARGIN + 10, layoutY + 7);

        layoutY += 35;

        // Content Loop
        measurements.forEach((m: any, idx: number) => {
          // Parse Data
          const rawData = m.data || {};
          const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

          // Spacer
          if (idx > 0) {
            doc.moveTo(MARGIN + 10, layoutY).lineTo(PAGE_WIDTH - MARGIN - 10, layoutY).strokeColor(COLORS.BORDER).stroke();
            layoutY += 10;
          }

          if (measurements.length > 1) {
            doc
              .fontSize(10)
              .font("Helvetica-Bold")
              .fillColor(COLORS.SECONDARY)
              .text(`Set ${idx + 1}`, MARGIN + 10, layoutY);
            layoutY += 15;
          }

          // Grid Layout for Key-Value pairs
          const keys = Object.keys(data);
          let colIndex = 0;

          keys.forEach((key) => {
            const label = key.replace(/_/g, " ").replace(/([A-Z])/g, ' $1').trim(); // Format camelCase
            const value = data[key];
            const xPos = colIndex % 2 === 0 ? MARGIN + 10 : MARGIN + 260; // 2 Columns

            doc
              .fontSize(10)
              .font("Helvetica")
              .fillColor(COLORS.SECONDARY)
              .text(label + ":", xPos, layoutY, { width: 140 })
              .font("Helvetica-Bold")
              .fillColor(COLORS.TEXT)
              .text(String(value), xPos + 110, layoutY); // Value alignment

            if (colIndex % 2 === 1) layoutY += 18; // New line after 2 items
            colIndex++;
          });

          if (keys.length % 2 !== 0) layoutY += 18; // Finish last row if odd

          // Notes
          if (m.notes) {
            layoutY += 5;
            doc
              .fontSize(10)
              .font("Helvetica-Oblique")
              .fillColor(COLORS.SECONDARY)
              .text("Notes:", MARGIN + 10, layoutY)
              .fillColor(COLORS.TEXT)
              .text(m.notes, MARGIN + 50, layoutY, { width: CONTENT_WIDTH - 60 });

            const notesHeight = doc.heightOfString(m.notes, { width: CONTENT_WIDTH - 60 });
            layoutY += notesHeight + 10;
          } else {
            layoutY += 10;
          }
        });

        // Draw Border around the section
        doc
          .rect(MARGIN, startY, CONTENT_WIDTH, layoutY - startY)
          .strokeColor(COLORS.BORDER)
          .stroke();

        layoutY += 20; // Margin between sections
      });
    }

    doc.end();
  });
};

export const generateBarcodeLabelPDF = async (order: any): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    // Label size: 4x2 inches (288x144 points)
    const doc = new PDFDocument({
      size: [288, 144],
      margin: 10
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      const { orderId, customer, orderItems } = order;
      const customerName = customer?.name || "N/A";
      const customerPhone = customer?.mobile || "N/A";

      // Get the first product name as product type, or "Multiple" if many
      let productType = "N/A";
      if (orderItems && orderItems.length > 0) {
        productType = orderItems[0].product?.name || "Item";
        if (orderItems.length > 1) {
          productType += " (+)";
        }
      }

      // 1. Draw Shop Header
      const shopName = order.user?.shopName || "Tailoring Shop";
      doc.fontSize(11).font("Helvetica-Bold").fillColor(COLORS.PRIMARY).text(shopName.toUpperCase(), { align: "center" });

      doc.moveDown(0.2);

      // 2. Barcode
      const barcodeBuffer = await generateBarcode(orderId);
      const barcodeWidth = 180;
      const barcodeX = (288 - barcodeWidth) / 2;
      const barcodeY = doc.y;

      doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeWidth });

      // Advance doc.y manually beyond the barcode image height to avoid overlap
      // The barcode image + text usually takes around 60-70 points at this scale
      doc.y = barcodeY + 65;

      // 3. Details Grid (Strictly Below Barcode)
      const detailY = doc.y;
      doc.fontSize(9).font("Helvetica").fillColor(COLORS.TEXT);

      // Left Column
      doc.text(`ID:`, 25, detailY);
      doc.font("Helvetica-Bold").text(orderId, 60, detailY);

      doc.font("Helvetica").text(`Name:`, 25, detailY + 15);
      doc.font("Helvetica-Bold").text(customerName, 60, detailY + 15, { width: 100 });

      // Right Column
      doc.font("Helvetica").text(`Phone:`, 160, detailY);
      doc.font("Helvetica-Bold").text(customerPhone, 200, detailY);

      doc.font("Helvetica").text(`Type:`, 160, detailY + 15);
      doc.font("Helvetica-Bold").text(productType, 200, detailY + 15, { width: 75 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
