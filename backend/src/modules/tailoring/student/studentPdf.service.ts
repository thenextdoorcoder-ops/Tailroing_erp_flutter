import PDFDocument from "pdfkit";
import fs from 'fs';
import path from 'path';

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

// Helpers
const formatCurrency = (value: any) => `₹${Number(value || 0).toFixed(2)}`;
const formatDate = (dateStr: any) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const generateStudentInvoicePDF = async (student: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Helpers inside function
        const drawHr = (y: number) => {
            doc
                .strokeColor(COLORS.BORDER)
                .lineWidth(1)
                .moveTo(MARGIN, y)
                .lineTo(PAGE_WIDTH - MARGIN, y)
                .stroke();
        };

        // --- Branding Data ---
        const user = student.user || {};
        const invoiceSettings = user.invoiceSettings || {};
        const shopName = user.shopName || "TAILORING SHOP";
        const shopPhone = invoiceSettings.phone || user.phoneNumber || "";
        const shopAddress = invoiceSettings.address || "";
        const gstNumber = invoiceSettings.gstNumber;
        const terms = invoiceSettings.terms || "";

        // --- Page Border ---
        const drawPageBorder = () => {
            doc
                .rect(20, 20, PAGE_WIDTH - 40, 841.89 - 40) // A4 Height is 841.89
                .strokeColor(COLORS.PRIMARY)
                .lineWidth(2)
                .stroke();
        };
        drawPageBorder();
        doc.on('pageAdded', drawPageBorder);

        // --- Header ---
        const headerTop = 45;
        let logoOffset = 0;

        // Logo
        if (user.logoUrl) {
            try {
                const logoPath = path.join(process.cwd(), user.logoUrl);
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

        // Invoice Label (Right)
        doc
            .fontSize(24)
            .font("Helvetica-Bold")
            .fillColor(COLORS.SECONDARY)
            .text("FEE RECEIPT", 0, headerTop, { align: "right", width: PAGE_WIDTH - MARGIN });

        // Receipt # and Date
        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor(COLORS.TEXT)
            .text(`Student ID: ${student.studentId}`, 0, headerTop + 35, { align: "right", width: PAGE_WIDTH - MARGIN })
            .text(`Date: ${formatDate(new Date())}`, 0, headerTop + 50, { align: "right", width: PAGE_WIDTH - MARGIN });

        drawHr(130);

        // --- Student & Course Info Section ---
        const infoTop = 150;

        // Left Column: Bill To
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(COLORS.TEXT)
            .text("Student Details:", MARGIN, infoTop);

        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor(COLORS.SECONDARY)
            .text(student.name || "N/A", MARGIN, infoTop + 20)
            .text(`Mobile: ${student.mobile || ""}`, MARGIN, infoTop + 35)
            .text(`Address: ${student.address || ""}, ${student.city || ""}`, MARGIN, infoTop + 50, { width: 220 });

        // Right Column: Course Details Box
        const rightColX = 350;
        const boxPadding = 10;

        doc
            .rect(rightColX - boxPadding, infoTop - boxPadding, 200, 80)
            .fill(COLORS.LIGHT_BG);

        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(COLORS.PRIMARY)
            .text("Course Details", rightColX, infoTop);

        doc.fontSize(10).font("Helvetica").fillColor(COLORS.SECONDARY);

        const details = [
            { label: "Course", value: student.course?.name || "N/A" },
            { label: "Joining Date", value: formatDate(student.joiningDate) },
            { label: "End Date", value: formatDate(student.endDate) },
        ];

        let detailY = infoTop + 20;
        details.forEach((item) => {
            doc.text(item.label, rightColX, detailY, { width: 80 });
            doc.text(item.value, rightColX + 80, detailY, { align: "right", width: 100 });
            detailY += 15;
        });

        // --- Fees Table ---
        const tableTop = 260;
        const colX = { desc: MARGIN + 10, total: 450 };

        // Table Header Background
        doc
            .rect(MARGIN, tableTop, CONTENT_WIDTH, 25)
            .fill(COLORS.SECONDARY);

        // Table Headers
        doc.fillColor(COLORS.WHITE).fontSize(10).font("Helvetica-Bold");
        doc.text("Description", colX.desc, tableTop + 8);
        doc.text("Amount", colX.total, tableTop + 8, { width: 95, align: "right" });

        // Rows
        let y = tableTop + 35;

        // Fee Row
        doc
            .rect(MARGIN, y - 5, CONTENT_WIDTH, 20)
            .fill("#f1f5f9"); // Slate-100
        doc.fillColor(COLORS.TEXT).font("Helvetica");

        doc.text(`Course Fee - ${student.course?.name || ""}`, colX.desc, y);
        doc.text(formatCurrency(student.totalFees), colX.total, y, { width: 95, align: "right" });

        y += 25;

        // Border Lines for Table
        doc
            .rect(MARGIN, tableTop, CONTENT_WIDTH, y - tableTop) // Outer border
            .strokeColor(COLORS.BORDER)
            .stroke();

        // --- Totals Section ---
        y += 20;

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

        drawTotalRow("Total Fees:", student.totalFees, true, COLORS.PRIMARY, 12);
        y += 5;
        drawTotalRow("Advance Paid:", student.advancePaid, false, "green");
        drawTotalRow("Balance Due:", student.balanceAmount, true, "red");

        // --- Payment History ---
        if (student.studentPayments && student.studentPayments.length > 0) {
            y += 30;
            doc
                .fontSize(12)
                .font("Helvetica-Bold")
                .fillColor(COLORS.PRIMARY)
                .text("Payment History", MARGIN, y);

            y += 20;

            doc.fontSize(10).font("Helvetica-Bold").fillColor(COLORS.SECONDARY);
            doc.text("Date", MARGIN, y, { width: 100 });
            doc.text("Method", MARGIN + 120, y, { width: 100 });
            doc.text("Amount", MARGIN + 240, y, { width: 100 });

            y += 15;
            doc.moveTo(MARGIN, y).lineTo(MARGIN + 340, y).strokeColor(COLORS.BORDER).stroke();
            y += 10;

            doc.font("Helvetica").fillColor(COLORS.TEXT);
            student.studentPayments.forEach((payment: any) => {
                doc.text(formatDate(payment.paymentDate), MARGIN, y, { width: 100 });
                doc.text(payment.paymentMethod || "CASH", MARGIN + 120, y, { width: 100 });
                doc.text(formatCurrency(payment.amount), MARGIN + 240, y, { width: 100 });
                y += 15;

                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
            });
        }

        // --- Footer ---
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

        doc.end();
    });
};

export const generateStudentCertificatePDF = async (student: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        // Landscape A4 for Certificate
        const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const A4_LANDSCAPE_WIDTH = 841.89;
        const A4_LANDSCAPE_HEIGHT = 595.28;

        // Background and Borders
        doc
            .rect(0, 0, A4_LANDSCAPE_WIDTH, A4_LANDSCAPE_HEIGHT)
            .fill("#fdfbf7"); // Off-white/cream background

        // Outer Border
        doc
            .rect(20, 20, A4_LANDSCAPE_WIDTH - 40, A4_LANDSCAPE_HEIGHT - 40)
            .strokeColor(COLORS.PRIMARY)
            .lineWidth(4)
            .stroke();

        // Inner Border
        doc
            .rect(26, 26, A4_LANDSCAPE_WIDTH - 52, A4_LANDSCAPE_HEIGHT - 52)
            .strokeColor(COLORS.PRIMARY)
            .lineWidth(1)
            .stroke();

        const user = student.user || {};
        const shopName = user.shopName || "Tailoring Institute";

        let y = 60;

        // Logo
        if (user.logoUrl) {
            try {
                const logoPath = path.join(process.cwd(), user.logoUrl);
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, A4_LANDSCAPE_WIDTH / 2 - 40, y, { width: 80 });
                    y += 90;
                }
            } catch (e) {
                console.error("Failed to load logo", e);
            }
        }

        y += 20;

        // Institute Name
        doc
            .fontSize(28)
            .font("Times-Bold")
            .fillColor(COLORS.TEXT)
            .text(shopName.toUpperCase(), 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        y += 50;

        // Title
        doc
            .fontSize(40)
            .font("Times-Italic")
            .fillColor(COLORS.PRIMARY)
            .text("Certificate of Completion", 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        y += 60;

        // Subtitle
        doc
            .fontSize(16)
            .font("Times-Roman")
            .fillColor(COLORS.SECONDARY)
            .text("This is to certify that", 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        y += 40;

        // Student Name
        doc
            .fontSize(32)
            .font("Times-BoldItalic")
            .fillColor(COLORS.TEXT)
            .text(student.name, 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        // Underline name
        const nameWidth = doc.widthOfString(student.name);
        const nameStartX = (A4_LANDSCAPE_WIDTH - nameWidth) / 2;
        doc.moveTo(nameStartX - 20, y + 35).lineTo(nameStartX + nameWidth + 20, y + 35).lineWidth(1).strokeColor(COLORS.BORDER).stroke();

        y += 60;

        // Course text
        doc
            .fontSize(16)
            .font("Times-Roman")
            .fillColor(COLORS.SECONDARY)
            .text(`has successfully completed the tailoring course`, 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        y += 35;

        // Course Name
        doc
            .fontSize(24)
            .font("Times-Bold")
            .fillColor(COLORS.PRIMARY)
            .text(student.course?.name || "Tailoring Course", 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        y += 50;

        const durationText = `from ${formatDate(student.joiningDate)} to ${formatDate(student.endDate)}`;
        doc
            .fontSize(14)
            .font("Times-Roman")
            .fillColor(COLORS.TEXT)
            .text(durationText, 0, y, { align: "center", width: A4_LANDSCAPE_WIDTH });

        // Signatures at bottom
        const signatureY = A4_LANDSCAPE_HEIGHT - 120;

        // Left Signature (Date)
        doc
            .fontSize(12)
            .font("Times-Roman")
            .fillColor(COLORS.TEXT)
            .text(formatDate(new Date()), 100, signatureY + 40, { align: "center", width: 150 });
        doc.moveTo(100, signatureY + 35).lineTo(250, signatureY + 35).stroke();
        doc.text("Date", 100, signatureY + 50, { align: "center", width: 150 });

        // Right Signature (Teacher/Authorized)
        if (user.signatureUrl) {
            try {
                const sigPath = path.join(process.cwd(), user.signatureUrl);
                if (fs.existsSync(sigPath)) {
                    doc.image(sigPath, A4_LANDSCAPE_WIDTH - 250 + 35, signatureY - 10, { width: 80 });
                }
            } catch (e) {
                console.error("Failed to load signature", e);
            }
        }
        doc.moveTo(A4_LANDSCAPE_WIDTH - 250, signatureY + 35).lineTo(A4_LANDSCAPE_WIDTH - 100, signatureY + 35).stroke();
        doc.text("Instructor Signature", A4_LANDSCAPE_WIDTH - 250, signatureY + 50, { align: "center", width: 150 });

        doc.end();
    });
};
