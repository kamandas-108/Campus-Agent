"""
pdf_service.py — PDF generation for approved Campus Agent requests.

Uses ReportLab to produce a styled approval letter PDF in memory.
Returns bytes that can be streamed directly as a FastAPI Response.
"""

from datetime import datetime
from typing import Any, Dict, Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    import io
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def _format_date(value: Any) -> str:
    if not value:
        return datetime.utcnow().strftime("%d %B %Y")
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.strftime("%d %B %Y at %H:%M UTC")
    except Exception:
        return str(value)


def generate_approval_pdf(request: Dict[str, Any]) -> bytes:
    """
    Generate an approval letter PDF for the given request dict.
    Raises RuntimeError if ReportLab is not installed.
    """
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError(
            "ReportLab is not installed. Add 'reportlab>=4.0.0' to requirements.txt."
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    BRAND    = colors.HexColor("#7c3aed")   # violet-700
    BRAND_LT = colors.HexColor("#ede9fe")   # violet-100
    GREY     = colors.HexColor("#475569")
    GREEN    = colors.HexColor("#15803d")
    WHITE    = colors.white

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        textColor=WHITE, fontSize=20, spaceAfter=4, alignment=TA_CENTER,
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        textColor=colors.HexColor("#c4b5fd"), fontSize=10,
        spaceAfter=0, alignment=TA_CENTER,
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        textColor=GREY, fontSize=9, spaceAfter=2,
    )
    value_style = ParagraphStyle(
        "Value", parent=styles["Normal"],
        textColor=colors.HexColor("#0f172a"), fontSize=10, spaceAfter=0,
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        textColor=colors.HexColor("#1e293b"), fontSize=10,
        leading=16, spaceAfter=10,
    )
    notice_style = ParagraphStyle(
        "Notice", parent=styles["Normal"],
        textColor=colors.HexColor("#166534"), fontSize=9,
        leading=14, alignment=TA_CENTER,
    )

    thread_id    = request.get("thread_id") or request.get("id") or "N/A"
    student_name = request.get("student_name") or "N/A"
    student_email= request.get("student_email") or "N/A"
    roll_number  = request.get("roll_number") or "N/A"
    course       = request.get("course_program") or "N/A"
    acad_year    = request.get("academic_year") or "N/A"
    department   = request.get("student_department") or "N/A"
    operation    = request.get("operation") or request.get("query") or "Institutional Service"
    faculty_name = request.get("assigned_faculty_name") or "N/A"
    created_at   = _format_date(request.get("created_at"))
    approved_at  = _format_date(request.get("approved_at") or datetime.utcnow().isoformat())
    result       = request.get("result") or f"SUCCESS: {operation} completed."

    story = []

    # ── Header banner ──
    header_data = [[Paragraph("Campus Agent", title_style)],
                   [Paragraph("Official Approval Letter", sub_style)]]
    header_table = Table(header_data, colWidths=[170 * mm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8 * mm))

    # ── Approval status badge ──
    badge_data = [[Paragraph("✔  REQUEST APPROVED", ParagraphStyle(
        "Badge", parent=styles["Normal"],
        textColor=GREEN, fontSize=13, alignment=TA_CENTER,
    ))]]
    badge_table = Table(badge_data, colWidths=[170 * mm])
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#dcfce7")),
        ("BOX",        (0, 0), (-1, -1), 1, colors.HexColor("#86efac")),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 6 * mm))

    # ── Details table ──
    def row(label: str, value: str):
        return [
            Paragraph(label, label_style),
            Paragraph(value or "—", value_style),
        ]

    detail_rows = [
        row("Thread / Reference ID", thread_id),
        row("Student Name",          student_name),
        row("Student Email",         student_email),
        row("Roll / Registration No", roll_number),
        row("Course / Program",      course),
        row("Academic Year",         acad_year),
        row("Department",            department),
        row("Request Type",          operation),
        row("Assigned Faculty",      faculty_name),
        row("Request Submitted",     created_at),
        row("Decision Date",         approved_at),
    ]
    col_widths = [55 * mm, 115 * mm]
    detail_table = Table(detail_rows, colWidths=col_widths, repeatRows=0)
    detail_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), BRAND_LT),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 6 * mm))

    # ── Result / outcome ──
    story.append(Paragraph("Outcome", ParagraphStyle(
        "SH", parent=styles["Heading3"],
        textColor=BRAND, spaceAfter=4,
    )))
    story.append(Paragraph(result, body_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4 * mm))

    # ── Footer notice ──
    story.append(Paragraph(
        "This is an officially generated document from Campus Agent. "
        "It is issued as a digital approval record and is valid for institutional use. "
        "Please retain this document for your academic records.",
        notice_style,
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        f"Generated on {datetime.utcnow().strftime('%d %B %Y at %H:%M UTC')}",
        ParagraphStyle("Ts", parent=styles["Normal"], textColor=GREY,
                       fontSize=8, alignment=TA_CENTER),
    ))

    doc.build(story)
    return buffer.getvalue()
