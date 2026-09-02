"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEPARTMENTS = [
  { code: "cse-aiml", label: "B.Tech CSE (AI/ML)", icon: "🤖" },
  { code: "cse-core", label: "B.Tech CSE (Core)", icon: "💻" },
  { code: "ece", label: "B.Tech ECE", icon: "📡" },
  { code: "mech", label: "B.Tech Mechanical", icon: "⚙️" },
  { code: "civil", label: "B.Tech Civil", icon: "🏗️" },
  { code: "eee", label: "B.Tech EEE", icon: "⚡" },
];

const FACULTY_DIRECTORY: Record<string, Array<{ id: string; name: string; email: string; phone: string }>> = {
  "cse-aiml": [
    { id: "fac_001", name: "Dr. Rajesh Kumar", email: "rajesh@college.edu", phone: "+91-9876543210" },
    { id: "fac_002", name: "Prof. Sneha Sharma", email: "sneha@college.edu", phone: "+91-9876543211" },
    { id: "fac_003", name: "Dr. Amit Verma", email: "amit@college.edu", phone: "+91-9876543212" },
  ],
  "cse-core": [
    { id: "fac_004", name: "Dr. Priya Singh", email: "priya@college.edu", phone: "+91-9876543213" },
    { id: "fac_005", name: "Prof. Vikram Patel", email: "vikram@college.edu", phone: "+91-9876543214" },
    { id: "fac_006", name: "Dr. Neha Gupta", email: "neha@college.edu", phone: "+91-9876543215" },
  ],
  "ece": [
    { id: "fac_007", name: "Dr. Suresh Desai", email: "suresh@college.edu", phone: "+91-9876543216" },
    { id: "fac_008", name: "Prof. Anjali Iyer", email: "anjali@college.edu", phone: "+91-9876543217" },
  ],
  "mech": [
    { id: "fac_009", name: "Dr. Arjun Rao", email: "arjun@college.edu", phone: "+91-9876543218" },
    { id: "fac_010", name: "Prof. Meera Reddy", email: "meera@college.edu", phone: "+91-9876543219" },
  ],
  "civil": [
    { id: "fac_011", name: "Dr. Rohan Kapoor", email: "rohan@college.edu", phone: "+91-9876543220" },
  ],
  "eee": [
    { id: "fac_012", name: "Dr. Pooja Nair", email: "pooja@college.edu", phone: "+91-9876543221" },
  ],
};

const LANGS = [
  { code: "en", native: "English", flag: "🇬🇧" },
  { code: "hi", native: "हिंदी", flag: "🇮🇳" },
  { code: "bn", native: "বাংলা", flag: "🇧🇩" },
  { code: "te", native: "తెలుగు", flag: "🟢" },
  { code: "ta", native: "தமிழ்", flag: "🟡" },
  { code: "ur", native: "اردو", flag: "🇵🇰" },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    appTitle: "Campus Agent",
    studentLogin: "Student Login",
    facultyLogin: "Faculty Login",
    email: "Email",
    phone: "Phone Number",
    whatsapp: "WhatsApp Number",
    password: "Password",
    login: "Login",
    register: "Register",
    studentDashboard: "Student Dashboard",
    facultyDashboard: "Faculty Dashboard",
    newRequest: "New Request",
    myRequests: "My Requests",
    approvalQueue: "Approval Queue",
    submitRequest: "Submit Request",
    viewAuditLog: "View Audit Log",
    approve: "Approve",
    reject: "Reject",
    language: "Language",
    logout: "Logout",
    enterQuery: "Enter your request (lab booking, leave, NOC, etc.)",
    submitted: "Request submitted successfully!",
    approved: "Request approved!",
    rejected: "Request rejected.",
    notifications: "Notifications",
    settings: "Settings",
    status: "Status",
    pending: "Pending",
    approvedStatus: "Approved",
    rejectedStatus: "Rejected",
    viewDetails: "View Details",
    name: "Full Name",
    department: "Department",
    selectDepartment: "Select Your Department",
    assignedFaculty: "Assigned Faculty",
    changeFaculty: "Change Faculty",
    facultyName: "Faculty Name",
    selectFaculty: "Select Faculty",
    noDept: "Please select a department",
    deptInfo: "Your assigned faculty for",
  },
  hi: {
    appTitle: "कैम्पस एजेंट",
    studentLogin: "छात्र लॉगिन",
    facultyLogin: "संकाय लॉगिन",
    email: "ईमेल",
    phone: "फोन नंबर",
    whatsapp: "व्हाट्सअप नंबर",
    password: "पासवर्ड",
    login: "लॉगिन करें",
    register: "पंजीकरण करें",
    studentDashboard: "छात्र डैशबोर्ड",
    facultyDashboard: "संकाय डैशबोर्ड",
    newRequest: "नया अनुरोध",
    myRequests: "मेरे अनुरोध",
    approvalQueue: "अनुमोदन कतार",
    submitRequest: "अनुरोध सबमिट करें",
    viewAuditLog: "ऑडिट लॉग देखें",
    approve: "अनुमोदित करें",
    reject: "अस्वीकार करें",
    language: "भाषा",
    logout: "लॉग आउट करें",
    enterQuery: "अपना अनुरोध दर्ज करें",
    submitted: "अनुरोध सफलतापूर्वक सबमिट हो गया!",
    approved: "अनुरोध अनुमोदित!",
    rejected: "अनुरोध अस्वीकृत।",
    notifications: "सूचनाएं",
    settings: "सेटिंग्स",
    status: "स्थिति",
    pending: "लंबित",
    approvedStatus: "अनुमोदित",
    rejectedStatus: "अस्वीकृत",
    viewDetails: "विवरण देखें",
    name: "पूरा नाम",
    department: "विभाग",
    selectDepartment: "अपना विभाग चुनें",
    assignedFaculty: "नियुक्त संकाय",
    changeFaculty: "संकाय बदलें",
    facultyName: "संकाय नाम",
    selectFaculty: "संकाय चुनें",
    noDept: "कृपया एक विभाग चुनें",
    deptInfo: "आपका नियुक्त संकाय",
  },
  bn: {
    appTitle: "ক্যাম্পাস এজেন্ট",
    studentLogin: "ছাত্র লগইন",
    facultyLogin: "ফ্যাকাল্টি লগইন",
    email: "ইমেল",
    phone: "ফোন নম্বর",
    whatsapp: "হোয়াটসঅ্যাপ নম্বর",
    password: "পাসওয়ার্ড",
    login: "লগইন করুন",
    register: "নিবন্ধন করুন",
    studentDashboard: "ছাত্র ড্যাশবোর্ড",
    facultyDashboard: "ফ্যাকাল্টি ড্যাশবোর্ড",
    newRequest: "নতুন অনুরোধ",
    myRequests: "আমার অনুরোধ",
    approvalQueue: "অনুমোদন সারি",
    submitRequest: "অনুরোধ জমা দিন",
    viewAuditLog: "অডিট লগ দেখুন",
    approve: "অনুমোদন করুন",
    reject: "প্রত্যাখ্যান করুন",
    language: "ভাষা",
    logout: "লগ আউট করুন",
    enterQuery: "আপনার অনুরোধ প্রবেশ করুন",
    submitted: "অনুরোধ সফলভাবে জমা দেওয়া হয়েছে!",
    approved: "অনুরোধ অনুমোদিত!",
    rejected: "অনুরোধ প্রত্যাখ্যান করা হয়েছে।",
    notifications: "বিজ্ঞপ্তি",
    settings: "সেটিংস",
    status: "অবস্থা",
    pending: "মুলতুবি",
    approvedStatus: "অনুমোদিত",
    rejectedStatus: "প্রত্যাখ্যান করা হয়েছে",
    viewDetails: "বিবরণ দেখুন",
    name: "সম্পূর্ণ নাম",
    department: "বিভাগ",
    selectDepartment: "আপনার বিভাগ নির্বাচন করুন",
    assignedFaculty: "নিযুক্ত অনুষদ",
    changeFaculty: "অনুষদ পরিবর্তন করুন",
    facultyName: "অনুষদের নাম",
    selectFaculty: "অনুষদ নির্বাচন করুন",
    noDept: "দয়া করে একটি বিভাগ নির্বাচন করুন",
    deptInfo: "আপনার নিযুক্ত অনুষদ",
  },
  te: {
    appTitle: "క్యాంపస్ ఏజెంట్",
    studentLogin: "విద్యార్థి లాగిన్",
    facultyLogin: "సంకాయ లాగిన్",
    email: "ఇమెయిల్",
    phone: "ఫోన్ నంబర్",
    whatsapp: "వాట్సాప్ నంబర్",
    password: "పాస్‌వర్డ్",
    login: "లాగిన్ చేయండి",
    register: "నమోదు చేయండి",
    studentDashboard: "విద్యార్థి డ్యాష్‌బోర్డ్",
    facultyDashboard: "సంకాయ డ్యాష్‌బోర్డ్",
    newRequest: "కొత్త అభ్యర్థన",
    myRequests: "నా అభ్యర్థనలు",
    approvalQueue: "ఆమోదన ఖాళీ",
    submitRequest: "అభ్యర్థన సమర్పించండి",
    viewAuditLog: "ఆడిట్ లాగ్ చూడండి",
    approve: "ఆమోదించండి",
    reject: "తిరస్కరించండి",
    language: "భాష",
    logout: "లాగ్ అవుట్",
    enterQuery: "మీ అభ్యర్థన నమోదు చేయండి",
    submitted: "అభ్యర్థన విజయవంతంగా సమర్పించబడింది!",
    approved: "అభ్యర్థన ఆమోదించబడింది!",
    rejected: "అభ్యర్థన తిరస్కరించబడింది।",
    notifications: "నోటిఫికేషన్‌లు",
    settings: "సెట్టింగ్‌లు",
    status: "స్థితి",
    pending: "పెండింగ్",
    approvedStatus: "ఆమోదించబడింది",
    rejectedStatus: "తిరస్కరించబడింది",
    viewDetails: "వివరాలు చూడండి",
    name: "పూర్తి పేరు",
  },
  ta: {
    appTitle: "வளாக முகவர்",
    studentLogin: "மாணவ உள்நுழைவு",
    facultyLogin: "ஆசிரியர் உள்நுழைவு",
    email: "மின்னஞ்சல்",
    phone: "ஃபோன் எண்",
    whatsapp: "WhatsApp எண்",
    password: "கடவுச்சொல்",
    login: "உள்நுழைக",
    register: "பதிவு செய்க",
    studentDashboard: "மாணவ டேஷ்போர்டு",
    facultyDashboard: "ஆசிரியர் டேஷ்போர்டு",
    newRequest: "புதிய கோரிக்கை",
    myRequests: "எனது கோரிக்கைகள்",
    approvalQueue: "ஒப்புதல் வரிசை",
    submitRequest: "கோரிக்கையை சமர்ப்பிக்க",
    viewAuditLog: "ஆடிட் பதிவைக் காண்க",
    approve: "ஒப்புக்கொள்ள",
    reject: "நிராகரிக்க",
    language: "மொழி",
    logout: "வெளியேறு",
    enterQuery: "உங்கள் கோரிக்கையை உள்ளிடவும்",
    submitted: "கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!",
    approved: "கோரிக்கை ஒப்புக்கொள்ளப்பட்டது!",
    rejected: "கோரிக்கை நிராகரிக்கப்பட்டது।",
    notifications: "அறிவிப்புகள்",
    settings: "அமைப்புகள்",
    status: "நிலை",
    pending: "நிலுவரு",
    approvedStatus: "ஒப்புக்கொள்ளப்பட்டது",
    rejectedStatus: "நிராகரிக்கப்பட்டது",
    viewDetails: "விபரங்களைக் கண்டறிக",
    name: "முழு பெயர்",
  },
  ur: {
    appTitle: "کیمپس ایجنٹ",
    studentLogin: "طالب علم لاگ ان",
    facultyLogin: "فیکلٹی لاگ ان",
    email: "ای میل",
    phone: "فون نمبر",
    whatsapp: "واٹس ایپ نمبر",
    password: "پاس ورڈ",
    login: "لاگ ان کریں",
    register: "رجسٹر کریں",
    studentDashboard: "طالب علم ڈیش بورڈ",
    facultyDashboard: "فیکلٹی ڈیش بورڈ",
    newRequest: "نئی درخواست",
    myRequests: "میری درخواستیں",
    approvalQueue: "منظوری کی قطار",
    submitRequest: "درخواست جمع کریں",
    viewAuditLog: "آڈٹ لاگ دیکھیں",
    approve: "منظور کریں",
    reject: "مسترد کریں",
    language: "زبان",
    logout: "لاگ آؤٹ",
    enterQuery: "اپنی درخواست درج کریں",
    submitted: "درخواست کامیابی سے جمع ہو گئی!",
    approved: "درخواست منظور ہو گئی!",
    rejected: "درخواست مسترد کر دی گئی۔",
    notifications: "اطلاعات",
    settings: "ترتیبات",
    status: "حالت",
    pending: "زیرالتوا",
    approvedStatus: "منظور",
    rejectedStatus: "مسترد",
    viewDetails: "تفصیلات دیکھیں",
    name: "مکمل نام",
  },
};

interface User {
  id: string;
  role: "student" | "faculty" | "hod" | "admin";
  email: string;
  phone: string;
  whatsapp: string;
  name: string;
  department?: string;
  courseProgram?: string;
  academicYear?: string;
  rollNumber?: string;
  assignedFacultyId?: string;
  assignedFacultyName?: string;
}

interface DocumentItem {
  id: string;
  filename: string;
  uploadedBy: "student" | "faculty";
  downloadUrl: string;
  createdAt: Date;
}

interface Request {
  id: string;
  userId: string;
  query: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  threadId: string;
  details?: string;
  studentName?: string;
  studentEmail?: string;
  studentWhatsapp?: string;
  studentDepartment?: string;
  assignedFacultyId?: string;
  assignedFacultyName?: string;
  studentProgram?: string;
  studentYear?: string;
  studentRollNo?: string;
  documents: DocumentItem[];
}

interface ComplaintTicket {
  id: string;
  ticketId: string;
  subject: string;
  description: string;
  raisedBy: "student" | "faculty";
  raisedByName?: string;
  raisedByEmail?: string;
  threadId?: string;
  status: string;
  createdAt: Date;
  downloadUrl: string;
}

type ToastType = "success" | "error" | "warn" | "info";
interface ToastItem {
  id: string;
  msg: string;
  type: ToastType;
}

interface PolicyEntry {
  id: string;
  title: string;
  category: string;
  summary: string;
  highlights: string[];
  sections: { heading: string; body: string }[];
}

interface AuditEntry {
  thread_id?: string;
  action_type?: string;
  decision?: string;
  created_at?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: "email" | "whatsapp" | "system";
  time: string;
}

const POLICY_CORPUS: PolicyEntry[] = [
  {
    id: "discipline",
    title: "Student Discipline & Conduct Policy",
    category: "Governance",
    summary: "This policy defines expected student conduct, ethics, and institutional responsibility in academic and campus spaces.",
    highlights: [
      "Campus punctuality and attendance",
      "Respectful conduct and safety",
      "Academic honesty and anti-ragging standards",
    ],
    sections: [
      {
        heading: "Purpose",
        body: "The college expects every enrolled student to uphold academic integrity, maintain respectful conduct, and follow campus safety rules during classes, hostels, and institutional events.",
      },
      {
        heading: "Standards",
        body: "Students must maintain a disciplined approach to coursework, attendance, communication, and campus activities. Any conduct that threatens safety, dignity, or institutional order may be formally reviewed.",
      },
      {
        heading: "Procedures",
        body: "Issues are reviewed by the student affairs office or the designated faculty committee, with recorded communication, supporting evidence, and a fair hearing where required.",
      },
    ],
  },
  {
    id: "noc",
    title: "No Objection Certificate (NOC)",
    category: "Administrative",
    summary: "The NOC policy explains how students can request official institutional clearance for internships, transfers, scholarships, and external official purposes.",
    highlights: [
      "Submission of valid request reasons",
      "Clearance from finance and academic office",
      "Approval timeline within institutional process",
    ],
    sections: [
      {
        heading: "Eligibility",
        body: "Students with active enrollment status and no outstanding institutional or academic clearance issue may request an NOC for recognized official requirements.",
      },
      {
        heading: "Required review",
        body: "The dean or authorized faculty checks the request against academic standing, procedural compliance, and any external agency requirements before signing the NOC.",
      },
      {
        heading: "Outcome",
        body: "Approved NOC requests are issued as an official document and may be emailed or shared electronically to the student as a signed notice.",
      },
    ],
  },
  {
    id: "lab",
    title: "Laboratory & Hall Booking Policy",
    category: "Facilities",
    summary: "This policy enables students and departments to request access to labs, halls, and equipment for academic, project, and event usage.",
    highlights: [
      "Timely booking and responsible use",
      "Safety compliance and lab supervision",
      "Recovery of equipment or damaged facility cost",
    ],
    sections: [
      {
        heading: "Booking process",
        body: "Requests must describe the purpose, date, time, and responsible staff or student contact. Labs and halls are assigned based on schedule availability and institutional priority.",
      },
      {
        heading: "Use conditions",
        body: "All bookings require compliance with the lab safety code, respect for the assigned equipment, and immediate reporting of any issue concerning equipment or facility condition.",
      },
      {
        heading: "Approval",
        body: "Faculty authorization and lab in-charge verification are required before facilities are released to the applicant.",
      },
    ],
  },
  {
    id: "leave",
    title: "Leave Certificate & Leave Request Policy",
    category: "Academic",
    summary: "The leave policy supports eligible student absences with document-backed approval for academic and personal reasons requiring institutional notice.",
    highlights: [
      "Approved leave is evidence-based",
      "Academic continuity support",
      "Official certificate issuance after approval",
    ],
    sections: [
      {
        heading: "Eligibility",
        body: "Students may request leave for medical, family, emergencies, or approved academic obligations. Supporting information may be required depending on the reason and duration.",
      },
      {
        heading: "Approval",
        body: "Faculty review considers attendance records, request reason, and academic impact. The institution may request proof before issuing the final certificate.",
      },
      {
        heading: "Certificate",
        body: "Once approved, the college issues the leave certificate or notice as an official soft copy to the student through the designated email or WhatsApp channel.",
      },
    ],
  },
  {
    id: "conduct",
    title: "Conduct Certificate & Character Verification",
    category: "Student Services",
    summary: "This policy governs the issuance of conduct certificates and character verification for internships, placements, scholarship support, and external institutions.",
    highlights: [
      "Good standing requirement",
      "Recommendation from faculty or office",
      "Digital issuance supported after approval",
    ],
    sections: [
      {
        heading: "Conditions",
        body: "A conduct certificate is issued only when the student has maintained satisfactory discipline and academic progress in line with college standards.",
      },
      {
        heading: "Documentation",
        body: "The request should include purpose, sponsoring institution, and the official format if any. Faculty and student affairs teams may cross-check information before approval.",
      },
      {
        heading: "Issuance",
        body: "Approved conduct certificates are forwarded as an official soft copy to the applicant, with relevant institutional details and registrar signoff included where needed.",
      },
    ],
  },
  {
    id: "refund",
    title: "Fee Refund Procedure",
    category: "Finance",
    summary: "This policy defines the steps for refund requests, review schedules, and institutional documentation for any fee-related adjustment or withdrawal request.",
    highlights: [
      "Eligibility based on formal withdrawal",
      "Approval from accounts and dean",
      "Official refund intimation to student",
    ],
    sections: [
      {
        heading: "Eligibility",
        body: "Students may request a refund when a fee has been charged in error, when a withdrawal is approved, or when the institution has a formal policy basis to reimburse the amount.",
      },
      {
        heading: "Verification",
        body: "The finance office checks the student account, supporting documents, and the withdrawal or cancellation record before processing any refund request.",
      },
      {
        heading: "Outcome",
        body: "Approved refund claims are processed to the student's official account and documented through a formal acknowledgment or email confirmation.",
      },
    ],
  },
  {
    id: "event",
    title: "Event & Venue Guidelines",
    category: "Campus Life",
    summary: "This policy lays down rules for event permissions, room allocation, safety protocols, and venue usage so that every student activity remains organized and compliant.",
    highlights: [
      "Pre-approval and venue reservation",
      "Safety and supervision standards",
      "Responsible use of campus facilities",
    ],
    sections: [
      {
        heading: "Requesting a venue",
        body: "Any event or gathering must be applied for with a statement of purpose, date, expected attendance, and the facilities or technical support that will be required.",
      },
      {
        heading: "Operational rules",
        body: "All events require faculty consent, compliance with timing restrictions, and clear coordination with the assigned venue manager or campus coordinator.",
      },
      {
        heading: "Closure and review",
        body: "At the end of the event, the organizer must confirm completion, ensure venue restoration, and report incidents or damages before the next booking request is accepted.",
      },
    ],
  },
  {
    id: "equipment",
    title: "Equipment Custody Rules",
    category: "Infrastructure",
    summary: "The custody policy governs borrowing, return, and maintenance of institutional equipment used for academic, lab, and project activities.",
    highlights: [
      "Issued only with authorized approval",
      "Breakage and default reporting",
      "Tracking and return compliance",
    ],
    sections: [
      {
        heading: "Borrowing protocol",
        body: "Students and departments may borrow institutional equipment only after a valid request is approved by the responsible faculty member and the lab or equipment coordinator.",
      },
      {
        heading: "Safety and accountability",
        body: "Borrowers are responsible for maintaining the equipment in good condition, reporting defects immediately, and returning it on time for inspection.",
      },
      {
        heading: "Consequences",
        body: "Failure to return equipment, negligence, or damage beyond normal wear may lead to disciplinary review or recovery of replacement or repair costs.",
      },
    ],
  },
];

const DEFAULT_AUDIT_LOGS: AuditEntry[] = [
  { thread_id: "REQ-1001", action_type: "HUMAN_GATE", decision: "APPROVED", created_at: "2026-08-16T11:20:00Z" },
  { thread_id: "REQ-1002", action_type: "POLICY_CHECK", decision: "VERIFIED", created_at: "2026-08-16T10:48:00Z" },
  { thread_id: "REQ-1003", action_type: "SERVICE_REQUEST", decision: "PENDING", created_at: "2026-08-16T09:40:00Z" },
  { thread_id: "REQ-1004", action_type: "APPROVAL_NOTICE", decision: "DISPATCHED", created_at: "2026-08-16T08:00:00Z" },
];

function Btn({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "danger" | "ghost" | "violet";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base font-semibold",
  };
  const vars: Record<string, string> = {
    default: "bg-slate-800/90 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700",
    primary: "bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400/40 text-white hover:from-cyan-400",
    success: "bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-400/40 text-white hover:from-emerald-400",
    danger: "bg-gradient-to-r from-rose-500 to-red-600 border-rose-400/40 text-white hover:from-rose-400",
    ghost: "bg-transparent border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800/40",
    violet: "bg-gradient-to-r from-violet-600 to-purple-700 border-violet-500/40 text-white hover:from-violet-500",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg border cursor-pointer transition-all duration-200 ${sizes[size]} ${vars[variant]} ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {loading && <span className="animate-spin">⟳</span>}
      {children}
    </button>
  );
}

function Toast({ t, onClose }: { t: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(id);
  }, [onClose]);

  const st: Record<ToastType, string> = {
    success: "bg-emerald-950/95 border-emerald-600/40 text-emerald-200",
    error: "bg-rose-950/95 border-rose-600/40 text-rose-200",
    warn: "bg-amber-950/95 border-amber-600/40 text-amber-200",
    info: "bg-slate-900/95 border-slate-600/40 text-slate-200",
  };
  const ic: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    warn: "⚠️",
    info: "ℹ️",
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl shadow-lg text-sm ${st[t.type]}`}>
      <span>{ic[t.type]}</span>
      <span className="flex-1">{t.msg}</span>
      <button onClick={onClose} className="text-lg opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

const USER_STORAGE_KEY = "campus_agent_user";

function DocumentPanel({
  documents,
  threadId,
  viewerRole,
  pendingFile,
  onFileChange,
  onUpload,
  uploading,
  deferUpload = false,
}: {
  documents: DocumentItem[];
  threadId: string;
  viewerRole: "student" | "faculty";
  pendingFile: File | null | undefined;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  uploading: boolean;
  deferUpload?: boolean;
}) {
  const labelFor = (doc: DocumentItem) => {
    if (doc.uploadedBy === viewerRole) return "Uploaded by You";
    return doc.uploadedBy === "student" ? "Uploaded by Student" : "Uploaded by Faculty";
  };

  // deferUpload: there's no thread_id yet (a brand-new request being
  // composed), so there's nothing to upload to yet. Just let the student
  // pick a file — handleSubmitRequest uploads it right after the request
  // is created and gets a real thread_id.
  if (deferUpload) {
    return (
      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
        <p className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-400">📎 Supporting Document</p>
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="max-w-[240px] text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-200"
        />
        {pendingFile ? (
          <p className="mt-2 text-xs text-emerald-300">Selected: {pendingFile.name}</p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Optional — attach a supporting document with this request.</p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">The document will be uploaded when you submit the request.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <p className="mb-2 text-xs uppercase tracking-[0.15em] text-slate-400">Documents</p>
      {documents.length === 0 ? (
        <p className="mb-2 text-xs text-slate-500">No documents yet.</p>
      ) : (
        <div className="mb-3 space-y-1.5">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs">
              <span className="truncate text-slate-200">📄 {doc.filename} <span className="text-slate-500">— {labelFor(doc)}</span></span>
              <a href={doc.downloadUrl} target="_blank" rel="noreferrer" className="shrink-0 text-cyan-300 hover:underline">Download</a>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="max-w-[220px] text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-2 file:py-1 file:text-xs file:text-slate-200"
        />
        <Btn variant="default" size="sm" onClick={onUpload} loading={uploading} disabled={!pendingFile}>
          {viewerRole === "student" ? "Upload Document" : "Upload for Student"}
        </Btn>
      </div>
    </div>
  );
}

function ComplaintPanel({
  viewerRole,
  complaints,
  subject,
  description,
  onSubjectChange,
  onDescriptionChange,
  onSubmit,
  submitting,
  onDownload,
}: {
  viewerRole: "student" | "faculty";
  complaints: ComplaintTicket[];
  subject: string;
  description: string;
  onSubjectChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  onDownload: (ticketId: string) => void;
}) {
  return (
    <div className="bg-gradient-to-br from-rose-900/30 via-red-900/20 to-orange-900/30 border border-rose-500/30 rounded-2xl p-8 shadow-lg shadow-rose-500/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-300 to-orange-300 bg-clip-text text-transparent">🎫 Complaint Tickets</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-rose-300/80 bg-rose-500/10 px-3 py-1 rounded-full">{viewerRole === "student" ? "Your tickets" : "All tickets"}</span>
      </div>

      <div className="mb-6 space-y-3">
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Complaint subject"
          className="w-full bg-gradient-to-r from-rose-900/30 to-orange-900/30 border border-rose-500/30 rounded-lg px-4 py-2 text-white placeholder-rose-300/50 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20"
        />
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the issue in detail..."
          rows={3}
          className="w-full bg-gradient-to-r from-rose-900/30 to-orange-900/30 border border-rose-500/30 rounded-lg px-4 py-2 text-white placeholder-rose-300/50 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 resize-none"
        />
        <Btn variant="danger" onClick={onSubmit} loading={submitting}>Raise Complaint</Btn>
      </div>

      <div className="space-y-3">
        {complaints.length === 0 ? (
          <p className="text-rose-300/60">No complaint tickets yet.</p>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-900/20 to-orange-900/10 p-4 hover:border-rose-500/40 transition-all">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="font-semibold text-white">{c.subject}</h3>
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-rose-500/20 text-rose-200 border border-rose-500/30">{c.status}</span>
              </div>
              <p className="text-sm text-slate-300 mb-2">{c.description}</p>
              <p className="text-xs text-rose-300/70 mb-3">
                Raised by {c.raisedByName || "Unknown"} ({c.raisedBy}) · {c.createdAt.toLocaleString()}
              </p>
              <Btn variant="default" size="sm" onClick={() => onDownload(c.ticketId)}>📥 Download Ticket</Btn>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


function mapBackendDocument(d: any): DocumentItem {
  return {
    id: d.id,
    filename: d.filename || "document",
    uploadedBy: d.uploaded_by === "faculty" ? "faculty" : "student",
    downloadUrl: d.download_url || "",
    createdAt: d.created_at ? new Date(d.created_at) : new Date(),
  };
}

function mapBackendRequest(r: any): Request {
  return {
    id: r.id || r.thread_id,
    userId: r.student_email || "",
    query: r.query || "",
    status: (r.status || "pending").toLowerCase() as Request["status"],
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
    threadId: r.thread_id || r.id,
    details: r.result || r.operation || "Processing...",
    studentName: r.student_name,
    studentEmail: r.student_email,
    studentWhatsapp: r.student_whatsapp,
    studentDepartment: r.student_department,
    assignedFacultyId: r.assigned_faculty_id,
    assignedFacultyName: r.assigned_faculty_name,
    studentProgram: r.course_program,
    studentYear: r.academic_year,
    studentRollNo: r.roll_number,
    documents: Array.isArray(r.documents) ? r.documents.map(mapBackendDocument) : [],
  };
}

function mapBackendComplaint(c: any): ComplaintTicket {
  return {
    id: c.ticket_id || c.id,
    ticketId: c.ticket_id || c.id,
    subject: c.subject || "",
    description: c.description || "",
    raisedBy: c.raised_by === "faculty" ? "faculty" : "student",
    raisedByName: c.raised_by_name,
    raisedByEmail: c.raised_by_email,
    threadId: c.thread_id,
    status: c.status || "OPEN",
    createdAt: c.created_at ? new Date(c.created_at) : new Date(),
    downloadUrl: c.download_url || "",
  };
}

export default function CampusAgentApp() {
  const [view, setView] = useState<"login" | "student" | "faculty" | "hod" | "admin">("login");
  const [loginRole, setLoginRole] = useState<"student" | "faculty" | "hod" | "admin" | null>(null);
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyEntry | null>(POLICY_CORPUS[0]);
  const [auditRecords, setAuditRecords] = useState<AuditEntry[]>(DEFAULT_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "demo-1", title: "Approval alert", message: "Faculty review has been queued for your latest request.", channel: "system", time: "Just now" },
  ]);
  const [followUpText, setFollowUpText] = useState("");
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
  const [uploadingThread, setUploadingThread] = useState<string | null>(null);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [courseProgram, setCourseProgram] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  // All faculty who have logged in via the Faculty Login page — stored as an
  // array so multiple faculty can be online at once. The student picks one
  // from a dropdown to route their request to that faculty.
  // Faculty online list is now fetched from the backend so it works across
  // different browsers / devices. localStorage is no longer used for this.
  const [allFacultiesOnline, setAllFacultiesOnline] = useState<{ name: string; email: string }[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<{ name: string; email: string } | null>(null);
  const [facultyDropdownOpen, setFacultyDropdownOpen] = useState(false);

  // ─── Complaint tickets (raised by either student or faculty) ───
  const [complaints, setComplaints] = useState<ComplaintTicket[]>([]);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const addToast = useCallback((msg: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p.slice(-2), { id, msg, type }]);
  }, []);

  const addNotification = useCallback((title: string, message: string, channel: NotificationItem["channel"] = "system") => {
    setNotifications((prev) => [{ id: Math.random().toString(36).slice(2), title, message, channel, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
  }, []);

  const rmToast = useCallback((id: string) => setToasts((p) => p.filter((x) => x.id !== id)), []);

  // ─── Restore session from localStorage on first load ───
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(USER_STORAGE_KEY);
      if (saved) {
        const parsed: User = JSON.parse(saved);
        if (parsed && parsed.role) {
          setUser(parsed);
          setView(parsed.role === "student" ? "student" : parsed.role === "faculty" ? "faculty" : parsed.role === "hod" ? "hod" : "admin");
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Close faculty dropdown when clicking outside
  useEffect(() => {
    if (!facultyDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-faculty-dropdown]")) setFacultyDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [facultyDropdownOpen]);

  // ─── Fetch requests from the backend (source of truth) ───
  const fetchRequests = useCallback(async (activeUser: User | null) => {
    if (!activeUser) return;
    try {
      const url =
        activeUser.role === "student"
          ? `${API}/api/requests?student_email=${encodeURIComponent(activeUser.email)}`
          : `${API}/api/requests`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.requests)) {
        setRequests(data.requests.map(mapBackendRequest));
      }
    } catch {
      // network hiccup — keep the last known list, next poll will retry
    }
  }, []);

  // ─── Fetch complaint tickets from the backend ───
  // Students see only tickets they raised; faculty see every ticket (from
  // either side) since faculty may need to review/download any of them.
  const fetchComplaints = useCallback(async (activeUser: User | null) => {
    if (!activeUser) return;
    try {
      const url =
        activeUser.role === "student"
          ? `${API}/api/complaints?raised_by_email=${encodeURIComponent(activeUser.email)}`
          : `${API}/api/complaints`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.complaints)) {
        setComplaints(data.complaints.map(mapBackendComplaint));
      }
    } catch {
      // network hiccup — keep the last known list, next poll will retry
    }
  }, []);

  // ─── Poll the backend so student and faculty dashboards always agree ───
  useEffect(() => {
    if ((view !== "student" && view !== "faculty") || !user) return;

    void fetchRequests(user);
    const interval = window.setInterval(() => {
      void fetchRequests(user);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [view, user, fetchRequests]);

  // ─── Poll complaint tickets alongside requests ───
  useEffect(() => {
    if ((view !== "student" && view !== "faculty") || !user) return;

    void fetchComplaints(user);
    const interval = window.setInterval(() => {
      void fetchComplaints(user);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [view, user, fetchComplaints]);

  // ─── Faculty heartbeat: keep this faculty marked online every 30 s ───
  useEffect(() => {
    if (view !== "faculty" || !user) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`${API}/api/faculty/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: user.name, email: user.email }),
        });
      } catch { /* network hiccup — next interval will retry */ }
    };

    void sendHeartbeat(); // immediate ping on mount
    const hb = window.setInterval(sendHeartbeat, 30_000);
    return () => window.clearInterval(hb);
  }, [view, user]);

  // ─── Student dashboard: poll for online faculty list every 10 s ───
  useEffect(() => {
    if (view !== "student") return;

    const fetchOnlineFaculty = async () => {
      try {
        const res = await fetch(`${API}/api/faculty/online`);
        if (!res.ok) return;
        const data = await res.json();
        const list: { name: string; email: string }[] = data.faculty || [];
        setAllFacultiesOnline(list);
        // Auto-select first faculty if none selected or previously selected one went offline
        setSelectedFaculty(prev => {
          if (prev && list.some(f => f.email === prev.email)) return prev;
          return list[0] || null;
        });
      } catch { /* ignore */ }
    };

    void fetchOnlineFaculty(); // immediate fetch
    const interval = window.setInterval(fetchOnlineFaculty, 10_000);
    return () => window.clearInterval(interval);
  }, [view]);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      addToast("Voice input is not supported in this browser", "warn");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setQuery((prev) => `${prev ? `${prev} ` : ""}${transcript}`);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      addToast("Voice input closed unexpectedly", "warn");
    };

    setIsListening(true);
    recognition.start();
  }, [addToast, lang]);

  const handleLogin = useCallback(async () => {
    if (!email || !phone || !whatsapp || !password) {
      addToast("Please fill in all fields", "warn");
      return;
    }

    if (loginRole === "student" && (!courseProgram || !academicYear || !rollNumber || !department)) {
      addToast("Please add course, year, roll/registration number, and department", "warn");
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).slice(2),
      role: loginRole as "student" | "faculty",
      email,
      phone,
      whatsapp,
      name: name || email.split("@")[0],
      department: loginRole === "student" ? department : undefined,
      courseProgram: loginRole === "student" ? courseProgram : undefined,
      academicYear: loginRole === "student" ? academicYear : undefined,
      rollNumber: loginRole === "student" ? rollNumber : undefined,
    };

    setUser(newUser);
    setView(loginRole === "student" ? "student" : loginRole === "faculty" ? "faculty" : loginRole === "hod" ? "hod" : "admin");
    try {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // storage may be unavailable (private mode) — session just won't persist
    }
    // When a faculty logs in, register them as online on the backend so all
    // student dashboards (any browser/device) can see them in the dropdown.
    if (loginRole === "faculty") {
      try {
        await fetch(`${API}/api/faculty/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newUser.name, email: newUser.email }),
        });
      } catch { /* ignore — heartbeat loop will retry */ }
    }
    addToast(`${t.login} successful!`, "success");

    setEmail("");
    setPhone("");
    setWhatsapp("");
    setPassword("");
    setName("");
    setCourseProgram("");
    setAcademicYear("");
    setRollNumber("");
    setDepartment("");
    setSelectedFacultyId("");
    setLoginRole(null);
  }, [addToast, academicYear, courseProgram, email, loginRole, name, password, phone, rollNumber, t, whatsapp, department, selectedFacultyId]);


  const handleSubmitRequest = useCallback(async () => {
    if (!query.trim()) {
      addToast("Please enter a request", "warn");
      return;
    }

    if (!user || user.role !== "student") {
      addToast("Only student accounts can submit requests", "warn");
      return;
    }

    setSubmitting(true);
    const threadId = "REQ-" + Math.random().toString(36).slice(2, 10);

    try {
      let translatedQuery = query;
      if (lang !== "en" && query) {
        try {
          const transRes = await fetch(`${API}/api/translate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: query, from_lang: lang, to_lang: "en" }),
          });
          if (transRes.ok) {
            const data = await transRes.json();
            translatedQuery = data.translated || query;
          }
        } catch {
          // fallback to original query
        }
      }

      const res = await fetch(`${API}/api/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          user_query: translatedQuery || "",
          student_name: user.name,
          student_email: user.email,
          student_whatsapp: user.whatsapp,
          student_department: user.department || "",
          assigned_faculty_id: "",
          assigned_faculty_name: selectedFaculty?.name || "",
          course_program: user.courseProgram || "",
          academic_year: user.academicYear || "",
          roll_number: user.rollNumber || "",
        }),
      });

      if (res.ok) {
        // Upload supporting document if available
        if (initialFile) {
          const formData = new FormData();
          formData.append("thread_id", threadId);
          formData.append("uploaded_by", "student");
          formData.append("file", initialFile);

          try {
            const uploadRes = await fetch(`${API}/api/document/upload`, {
              method: "POST",
              body: formData,
            });
            if (!uploadRes.ok) {
              addToast("Request submitted, but document upload failed", "warn");
            }
          } catch {
            addToast("Request submitted, but document upload failed", "warn");
          }
        }

        // The backend is now the source of truth — pull the fresh list
        // instead of guessing the shape of the new record locally. This
        // also picks up the document just uploaded above.
        await fetchRequests(user);
        addNotification("Request submitted", `Faculty alert for ${threadId} has been queued.`, "system");
        addToast(t.submitted, "success");
        setQuery("");
        setInitialFile(null);
      } else {
        addToast("Request could not be submitted", "error");
      }
    } catch {
      addToast("Request submission error", "error");
    }

    setSubmitting(false);
  }, [addNotification, addToast, fetchRequests, initialFile, lang, query, t, user]);

  // ─── Raise a complaint ticket (either student or faculty can do this) ───
  const handleRaiseComplaint = useCallback(async () => {
    if (!complaintSubject.trim() || !complaintDescription.trim()) {
      addToast("Please fill in both subject and description", "warn");
      return;
    }
    if (!user || (user.role !== "student" && user.role !== "faculty")) {
      addToast("Only student or faculty accounts can raise a ticket", "warn");
      return;
    }

    setComplaintSubmitting(true);
    try {
      const res = await fetch(`${API}/api/complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: complaintSubject,
          description: complaintDescription,
          raised_by: user.role,
          raised_by_name: user.name,
          raised_by_email: user.email,
        }),
      });

      if (res.ok) {
        await fetchComplaints(user);
        addNotification("Complaint ticket raised", `Your ticket "${complaintSubject}" has been logged.`, "system");
        addToast("Complaint ticket raised", "success");
        setComplaintSubject("");
        setComplaintDescription("");
      } else {
        addToast("Complaint ticket could not be raised", "error");
      }
    } catch {
      addToast("Complaint submission error", "error");
    }
    setComplaintSubmitting(false);
  }, [addNotification, addToast, complaintDescription, complaintSubject, fetchComplaints, user]);

  // ─── Download a complaint ticket as a PDF ───
  const handleDownloadComplaintTicket = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`${API}/api/complaint/${ticketId}/pdf`);
      if (!res.ok) { addToast("Ticket PDF generation failed", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `complaint-${ticketId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("Complaint ticket downloaded", "success");
    } catch {
      addToast("Ticket download error", "error");
    }
  }, [addToast]);

  const handleApproval = useCallback(async (reqId: string, decision: "APPROVED" | "REJECTED") => {
    const req = requests.find((r) => r.id === reqId);
    if (!req) return;

    try {
      const approvalRes = await fetch(`${API}/api/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: req.threadId,
          decision,
          student_name: req.studentName || user?.name || "Student",
          student_email: req.studentEmail || user?.email || "",
          student_whatsapp: req.studentWhatsapp || user?.whatsapp || "",
          request_summary: req.query,
        }),
      });

      const responseJson = approvalRes.ok ? await approvalRes.json() : null;

      // Optimistic local update so the faculty view reacts instantly...
      setRequests((p) =>
        p.map((r) =>
          r.id === reqId
            ? {
                ...r,
                status: decision === "APPROVED" ? "approved" : "rejected",
                details: responseJson?.result || r.details || (decision === "APPROVED" ? "Approved by faculty" : "Rejected by faculty"),
              }
            : r
        )
      );
      // ...then re-sync with the backend so every open dashboard agrees.
      void fetchRequests(user);

      if (decision === "APPROVED") {
        const notice = `Campus Approval Notice\n\nRequest: ${req.query}\nStudent: ${req.studentName || user?.name || "Student"}\nProgram: ${req.studentProgram || user?.courseProgram || "Not provided"}\nYear: ${req.studentYear || user?.academicYear || "Not provided"}\nRoll/Registration No: ${req.studentRollNo || user?.rollNumber || "Not provided"}\nStatus: Approved\n\nThis is an official institutional approval notice. Please keep it for records and use it as needed for your academic or administrative requirement.`;

        const blob = new Blob([notice], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${req.threadId}-approval-notice.txt`;
        a.click();
        URL.revokeObjectURL(url);
        addNotification("Approval notice sent", `Notice for ${req.threadId} was prepared and sent to the student.`, "email");
      } else {
        addNotification("Request rejected", `The faculty rejected ${req.threadId}.`, "system");
      }

      addToast(decision === "APPROVED" ? t.approved : t.rejected, decision === "APPROVED" ? "success" : "warn");
    } catch {
      addToast("Error updating approval", "error");
    }
  }, [addNotification, addToast, fetchRequests, requests, t, user]);

  const handleDocumentUpload = useCallback(async (threadId: string, uploadedBy: "student" | "faculty") => {
    const file = pendingFiles[threadId];
    if (!file) {
      addToast("Choose a file first", "warn");
      return;
    }

    setUploadingThread(threadId);
    try {
      const formData = new FormData();
      formData.append("thread_id", threadId);
      formData.append("uploaded_by", uploadedBy);
      formData.append("file", file);

      const res = await fetch(`${API}/api/document/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setPendingFiles((p) => ({ ...p, [threadId]: null }));
        await fetchRequests(user);
        addNotification(
          "Document uploaded",
          `${file.name} was attached to ${threadId}.`,
          "system"
        );
        addToast("Document uploaded", "success");
      } else {
        const errBody = await res.json().catch(() => null);
        addToast(errBody?.detail || "Document upload failed", "error");
      }
    } catch {
      addToast("Document upload error", "error");
    }
    setUploadingThread(null);
  }, [addNotification, addToast, fetchRequests, pendingFiles, user]);

  const handleLogout = useCallback(async () => {
    const wasFaculty = user?.role === "faculty";
    setUser(null);
    setView("login");
    setLoginRole(null);
    setRequests([]);
    setQuery("");
    try {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } catch { /* ignore */ }
    // Notify backend that this faculty is now offline so the dropdown updates
    // immediately on all student dashboards without waiting for TTL expiry.
    if (wasFaculty && user) {
      try {
        await fetch(`${API}/api/faculty/offline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: user.name, email: user.email }),
        });
      } catch { /* ignore */ }
    }
    addToast("Logout successful", "info");
  }, [addToast, user]);

  useEffect(() => {
    const refreshAudit = async () => {
      try {
        const res = await fetch(`${API}/api/audit/logs`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.records) && data.records.length > 0) {
          setAuditRecords(data.records.slice(0, 6));
        }
      } catch {
        setAuditRecords(DEFAULT_AUDIT_LOGS);
      }
    };

    if (view === "student" || view === "faculty") {
      void refreshAudit();
    }
  }, [view]);

  const getLanguageName = (code: string) => LANGS.find((item) => item.code === code)?.native || "English";

  const handleFollowUpBot = () => {
    const message = followUpText.trim() || "Can you help me with the next step?";
    setQuery((prev) => `${prev ? `${prev} ` : ""}${message}`);
    addNotification("AI follow-up", `Follow-up prompt added to the request box: ${message}`, "system");
    setFollowUpText("");
  };

  if (view === "login") {
    return (
      <div className="min-h-screen text-slate-100 font-sans flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.3), transparent)", top: "-100px", left: "-100px", filter: "blur(60px)" }} />
          <div className="absolute w-96 h-96 rounded-full opacity-15" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.3), transparent)", bottom: "-100px", right: "-100px", filter: "blur(60px)" }} />
        </div>

        <div className="relative z-10 max-w-2xl w-full mx-auto px-4">
          <div className="pointer-events-none absolute right-[-10%] top-8 hidden xl:block animate-float">
            <div className="relative flex h-72 w-60 items-center justify-center">
              <div className="absolute inset-0 rounded-[40%] bg-gradient-to-b from-cyan-400/20 via-indigo-500/10 to-transparent blur-2xl" />
              <div className="relative h-44 w-40 rounded-[45%] border border-white/20 bg-gradient-to-b from-amber-200 via-orange-200 to-pink-200 shadow-[0_18px_40px_rgba(14,116,144,0.45)]">
                <div className="absolute left-7 top-10 h-4 w-4 rounded-full bg-slate-800" />
                <div className="absolute right-7 top-10 h-4 w-4 rounded-full bg-slate-800" />
                <div className="absolute left-1/2 top-16 h-2.5 w-12 -translate-x-1/2 rounded-full bg-rose-300/80" />
                <div className="absolute left-8 top-20 h-6 w-24 rounded-b-[2rem] border-b-4 border-slate-800/80" />
                <div className="absolute -right-5 top-20 h-10 w-6 rounded-full bg-amber-200" style={{ transform: "rotate(30deg)" }} />
                <div className="absolute -right-7 top-18 h-6 w-4 rounded-full bg-amber-200" style={{ transform: "rotate(30deg)" }} />
                <div className="absolute -left-6 top-24 h-12 w-6 rounded-full bg-amber-200" style={{ transform: "rotate(-35deg)" }} />
                <div className="absolute left-1/2 bottom-0 h-14 w-20 -translate-x-1/2 rounded-t-[2rem] bg-sky-100/90" />
              </div>
            </div>
          </div>

          <div className="text-center mb-12">
            <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: "3s" }}>🚀</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">{t.appTitle}</h1>
            <p className="text-slate-400">Smart institutional request management system</p>
          </div>

          {!loginRole ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 cursor-pointer hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10" onClick={() => setLoginRole("student")}>
                <div className="text-5xl mb-4">👨‍🎓</div>
                <h2 className="text-2xl font-bold mb-2 text-cyan-400">{t.studentLogin}</h2>
                <p className="text-slate-400 mb-4">Submit requests for lab bookings, leaves, NOC, and more</p>
                <Btn variant="primary" className="w-full">{t.studentLogin} →</Btn>
              </div>

              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 cursor-pointer hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10" onClick={() => setLoginRole("faculty")}>
                <div className="text-5xl mb-4">👨‍🏫</div>
                <h2 className="text-2xl font-bold mb-2 text-violet-400">{t.facultyLogin}</h2>
                <p className="text-slate-400 mb-4">Review and approve student requests with notifications</p>
                <Btn variant="violet" className="w-full">{t.facultyLogin} →</Btn>
              </div>

              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 cursor-pointer hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10" onClick={() => setLoginRole("hod")}>
                <div className="text-5xl mb-4">🎓</div>
                <h2 className="text-2xl font-bold mb-2 text-orange-400">HOD Login</h2>
                <p className="text-slate-400 mb-4">Handle escalated requests and department oversight</p>
                <Btn variant="default" className="w-full bg-orange-900/40 border-orange-700/50">HOD Login →</Btn>
              </div>

              <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 cursor-pointer hover:border-rose-500/50 transition-all hover:shadow-lg hover:shadow-rose-500/10 md:col-span-2 lg:col-span-1" onClick={() => setLoginRole("admin")}>
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="text-2xl font-bold mb-2 text-rose-400">Admin Login</h2>
                <p className="text-slate-400 mb-4">Analytics dashboard, audit logs, full system access</p>
                <Btn variant="danger" className="w-full">Admin Login →</Btn>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-purple-900/50 via-indigo-900/40 to-blue-900/50 border border-purple-500/30 rounded-2xl p-8 max-w-md mx-auto shadow-lg shadow-purple-500/20">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">{loginRole === "student" ? t.studentLogin : t.facultyLogin}</h2>

              <div className="space-y-4">
                  <input type="text" placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    <input type="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    <input type="tel" placeholder={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    <input type="tel" placeholder={t.whatsapp} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                
                {loginRole === "student" ? (
                  <>
                    <input type="text" placeholder="Course Program" value={courseProgram} onChange={(e) => setCourseProgram(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    <input type="text" placeholder="Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    <input type="text" placeholder="College Roll No / Registration No" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />
                    
                    <div>
                      <label className="block text-sm font-semibold text-cyan-300 mb-2">📚 {t.selectDepartment}</label>
                      <select value={department} onChange={(e) => { setDepartment(e.target.value); }} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200">
                        <option value="">-- Select Department --</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept.code} value={dept.code}>{dept.icon} {dept.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-emerald-300 mb-2">📚 {t.selectDepartment}</label>
                      <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200">
                        <option value="">-- Select Your Department --</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept.code} value={dept.code}>{dept.icon} {dept.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200" />

                <Btn variant="primary" className="w-full" onClick={handleLogin}>{t.login}</Btn>
                <Btn variant="ghost" className="w-full" onClick={() => setLoginRole(null)}>← Back</Btn>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-2 relative">
            <button onClick={() => setLangOpen(!langOpen)} className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg px-4 py-2 hover:border-cyan-400/50 transition-all text-purple-200">{t.language}: {getLanguageName(lang)}</button>
            {langOpen && (
              <div className="absolute top-12 bg-slate-900/95 border border-purple-400/30 rounded-lg overflow-hidden z-50">
                {LANGS.map((item) => (
                  <button key={item.code} onClick={() => { setLang(item.code); setLangOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-purple-500/20">{item.flag} {item.native}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <Toast key={toast.id} t={toast} onClose={() => rmToast(toast.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (view === "student" && user) {
    const studentRequests = requests.filter((req) => req.studentEmail === user.email);

    return (
      <div className="min-h-screen text-slate-100 font-sans" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 20%, #16213e 50%, #0f0a1e 100%)" }}>
        <header className="border-b border-purple-500/30 bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-purple-900/40 backdrop-blur-lg sticky top-0 z-40 shadow-lg shadow-purple-500/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce">🚀</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t.appTitle}</h1>
                <p className="text-sm text-purple-300">{t.studentDashboard}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {allFacultiesOnline.length > 0 && (
                <div className="relative" data-faculty-dropdown>
                  <button
                    onClick={() => setFacultyDropdownOpen(o => !o)}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 hover:border-violet-400/60 rounded-lg transition-all"
                  >
                    <div className="text-right">
                      <p className="text-[10px] text-violet-300 font-semibold uppercase tracking-wide leading-none mb-0.5">
                        {allFacultiesOnline.length > 1 ? `${allFacultiesOnline.length} Faculty Online` : "Faculty Online"}
                      </p>
                      <p className="text-sm text-violet-200 font-medium leading-none">
                        👨‍🏫 {selectedFaculty?.name || "Select Faculty"}
                      </p>
                    </div>
                    <span className="text-violet-400 text-xs">{facultyDropdownOpen ? "▲" : "▼"}</span>
                  </button>
                  {facultyDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-900/98 border border-violet-500/40 rounded-xl shadow-xl shadow-violet-900/30 overflow-hidden z-50 min-w-[220px]">
                      <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider px-3 pt-2.5 pb-1">
                        Route request to:
                      </p>
                      {allFacultiesOnline.map((faculty, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedFaculty(faculty); setFacultyDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-all text-sm ${
                            selectedFaculty?.email === faculty.email
                              ? "bg-violet-600/30 text-violet-100"
                              : "hover:bg-violet-500/15 text-violet-200"
                          }`}
                        >
                          <span className="text-base">👨‍🏫</span>
                          <div>
                            <p className="font-medium leading-none">{faculty.name}</p>
                            <p className="text-[10px] text-violet-400 mt-0.5">{faculty.email}</p>
                          </div>
                          {selectedFaculty?.email === faculty.email && (
                            <span className="ml-auto text-violet-400 text-xs">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 relative">
                <button onClick={() => setLangOpen(!langOpen)} className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg px-3 py-2 text-sm hover:border-cyan-400/50 transition-all text-purple-200">🌐 {getLanguageName(lang)}</button>
                {langOpen && (
                  <div className="absolute top-16 right-0 bg-slate-900/95 border border-purple-400/30 rounded-lg overflow-hidden z-50">
                    {LANGS.map((item) => (
                      <button key={item.code} onClick={() => { setLang(item.code); setLangOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-purple-500/20 text-sm">{item.flag} {item.native}</button>
                    ))}
                  </div>
                )}
              </div>
              <a href="/history" className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-2 text-xs text-cyan-300 transition-all">
                📜 My History
              </a>
              <Btn variant="danger" size="sm" onClick={handleLogout}>{t.logout}</Btn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-blue-900/30 border border-purple-500/30 rounded-2xl p-8 shadow-lg shadow-purple-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Service Requirement</h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-cyan-300/80 bg-cyan-500/10 px-3 py-1 rounded-full">Student Portal</span>
                </div>
                <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {["NOC", "Lab Booking", "Leave Certificate", "Conduct Certificate", "Fee Refund", "Event Booking", "Equipment Request"].map((item) => (
                    <button key={item} onClick={() => setQuery((prev) => (prev ? `${prev} ${item}` : item))} className="rounded-lg border border-purple-400/40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 px-3 py-2 text-sm text-purple-200 transition-all duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-400/50 hover:bg-gradient-to-br hover:from-emerald-500/10 hover:to-cyan-500/10 hover:shadow-[0_18px_35px_rgba(16,185,129,0.15)]">{item}</button>
                  ))}
                </div>
                <div className="mb-3 flex flex-wrap gap-3">
                  <button onClick={handleVoiceInput} className="rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20 transition-all">
                    {isListening ? "🎙️ Listening..." : "🎙️ Speak in native language"}
                  </button>
                </div>

                <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.enterQuery + " (voice or native language supported)"} className="w-full bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 resize-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(34,211,238,0.15)]" rows={5} />
                <DocumentPanel
                  documents={[]}
                  threadId=""
                  viewerRole="student"
                  pendingFile={initialFile}
                  onFileChange={setInitialFile}
                  onUpload={() => {}}
                  uploading={false}
                  deferUpload
                />
                <div className="mt-5 flex gap-4">
                  <Btn variant="primary" size="lg" onClick={handleSubmitRequest} loading={submitting} className="flex-1">{t.submitRequest}</Btn>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-orange-900/30 border border-amber-500/30 rounded-2xl p-8 shadow-lg shadow-amber-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">Human Approval</h2>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs uppercase tracking-wider">Review required</span>
                </div>
                <div className="space-y-4">
                  {studentRequests.length === 0 ? (
                    <p className="text-amber-300/60">No service requirement has been submitted yet.</p>
                  ) : (
                    studentRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 to-orange-900/10 p-4 hover:border-amber-500/40 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-white">{req.query}</h3>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${req.status === "pending" ? "bg-amber-500/20 text-amber-200 border border-amber-500/30" : req.status === "approved" ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30" : "bg-rose-500/20 text-rose-200 border border-rose-500/30"}`}>
                            {req.status === "pending" ? t.pending : req.status === "approved" ? t.approvedStatus : t.rejectedStatus}
                          </span>
                        </div>
                        {req.studentDepartment && <p className="text-xs text-amber-300 mb-2">📚 Department: {DEPARTMENTS.find(d => d.code === req.studentDepartment)?.label}</p>}
                        {req.assignedFacultyName && <p className="text-xs text-emerald-300 mb-2">👨‍🏫 Faculty: {req.assignedFacultyName}</p>}
                        <p className="text-sm text-slate-300 mb-3">{req.details}</p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setQuery(req.query)} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition-all">Edit request</button>
                          {req.status === "approved" && (
                            <button
                                  onClick={async () => {
                                try {
                                  const res = await fetch(`${API}/api/requests/${req.threadId}/pdf`);
                                  if (!res.ok) { addToast("PDF generation failed", "error"); return; }
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `approval-${req.threadId}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  addToast("Approval PDF downloaded", "success");
                                } catch { addToast("PDF download error", "error"); }
                              }}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 transition-all"
                            >
                              📥 Download PDF
                            </button>
                          )}
                        </div>
                        <DocumentPanel
                          documents={req.documents}
                          threadId={req.threadId}
                          viewerRole="student"
                          pendingFile={pendingFiles[req.threadId]}
                          onFileChange={(file) => setPendingFiles((p) => ({ ...p, [req.threadId]: file }))}
                          onUpload={() => handleDocumentUpload(req.threadId, "student")}
                          uploading={uploadingThread === req.threadId}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <ComplaintPanel
                viewerRole="student"
                complaints={complaints}
                subject={complaintSubject}
                description={complaintDescription}
                onSubjectChange={setComplaintSubject}
                onDescriptionChange={setComplaintDescription}
                onSubmit={handleRaiseComplaint}
                submitting={complaintSubmitting}
                onDownload={handleDownloadComplaintTicket}
              />
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-violet-900/30 via-purple-900/20 to-indigo-900/30 border border-violet-500/30 rounded-2xl p-8 shadow-lg shadow-violet-500/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">Institutional Policy Corpus</h2>
                  <span className="text-xs uppercase tracking-[0.2em] text-violet-300/80 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/30">RAG</span>
                </div>
                <div className="space-y-3">
                  {POLICY_CORPUS.map((policy) => (
                    <button key={policy.id} onClick={() => setSelectedPolicy(policy)} className="w-full rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-900/20 to-purple-900/10 p-4 text-left transition-all duration-200 hover:border-violet-500/50 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_20px_40px_rgba(168,85,247,0.2)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{policy.title}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-violet-300/60 mt-1">{policy.category}</p>
                        </div>
                        <span className="text-xl text-violet-300">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/30 via-teal-900/20 to-cyan-900/30 border border-emerald-500/30 rounded-2xl p-8 shadow-lg shadow-emerald-500/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">Audit Ledger</h2>
                  <button onClick={async () => {
                    try {
                      const res = await fetch(`${API}/api/audit/logs`);
                      const data = await res.json();
                      if (Array.isArray(data.records) && data.records.length > 0) {
                        setAuditRecords(data.records.slice(0, 6));
                      }
                      addToast("Audit ledger refreshed", "success");
                    } catch {
                      addToast("Unable to refresh ledger", "error");
                    }
                  }} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 transition-all">🔄 Refresh</button>
                </div>
                <div className="space-y-3">
                  {auditRecords.length === 0 ? (
                    <p className="text-emerald-300/60">No audit entries yet.</p>
                  ) : (
                    auditRecords.slice(0, 4).map((entry, idx) => (
                      <div key={`${entry.thread_id ?? "audit"}-${idx}`} className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-3 hover:border-emerald-500/40 transition-all">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-sm font-medium text-white">{entry.action_type || "Institutional Action"}</p>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded">{entry.decision || "LOGGED"}</span>
                        </div>
                        <p className="text-xs text-emerald-300/70">{entry.thread_id || "Thread"}</p>
                        <p className="text-[11px] text-emerald-300/50 mt-2">{entry.created_at || "Timestamp unavailable"}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {selectedPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-opacity duration-300" onClick={() => setSelectedPolicy(null)}>
            <div className="w-full max-w-3xl rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-indigo-900/40 shadow-2xl shadow-violet-500/30 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-violet-500/30 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-violet-300 bg-violet-500/20 px-2 py-1 rounded w-fit">Policy</p>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent mt-2">{selectedPolicy.title}</h3>
                </div>
                <button onClick={() => setSelectedPolicy(null)} className="rounded-full border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1 text-violet-200 transition-all">✕</button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                <p className="mb-5 text-sm text-violet-200/80">{selectedPolicy.summary}</p>
                <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPolicy.highlights.map((item) => (
                    <div key={item} className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-200">{item}</div>
                  ))}
                </div>
                <div className="space-y-4">
                  {selectedPolicy.sections.map((section) => (
                    <div key={section.heading} className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-violet-900/10 p-4">
                      <h4 className="text-base font-semibold text-cyan-300 mb-2">{section.heading}</h4>
                      <p className="text-sm text-purple-200/80 leading-7">{section.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <Toast key={toast.id} t={toast} onClose={() => rmToast(toast.id)} />
          ))}
        </div>
      </div>
    );
  }

  if (view === "faculty" && user) {
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const approvedRequests = requests.filter((r) => r.status === "approved");
    const rejectedRequests = requests.filter((r) => r.status === "rejected");

    return (
      <div className="min-h-screen text-slate-100 font-sans" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%)" }}>
        <header className="border-b border-slate-700/50 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🚀</div>
              <div>
                <h1 className="text-2xl font-bold text-violet-400">{t.appTitle}</h1>
                <p className="text-sm text-slate-400">{t.facultyDashboard}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 relative">
                <button onClick={() => setLangOpen(!langOpen)} className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm hover:border-violet-500/50">🌐 {getLanguageName(lang)}</button>
                {langOpen && (
                  <div className="absolute top-16 right-0 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden z-50">
                    {LANGS.map((item) => (
                      <button key={item.code} onClick={() => { setLang(item.code); setLangOpen(false); }} className="block w-full text-left px-4 py-2 hover:bg-slate-800 text-sm">{item.flag} {item.native}</button>
                    ))}
                  </div>
                )}
              </div>
              <Btn variant="danger" size="sm" onClick={handleLogout}>{t.logout}</Btn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
              <p className="text-amber-400 text-sm font-medium">{t.approvalQueue}</p>
              <p className="text-3xl font-bold text-white mt-2">{pendingRequests.length}</p>
            </div>
            <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
              <p className="text-emerald-400 text-sm font-medium">{t.approvedStatus}</p>
              <p className="text-3xl font-bold text-white mt-2">{approvedRequests.length}</p>
            </div>
            <div className="bg-rose-900/30 border border-rose-700/50 rounded-lg p-4">
              <p className="text-rose-400 text-sm font-medium">{t.rejectedStatus}</p>
              <p className="text-3xl font-bold text-white mt-2">{rejectedRequests.length}</p>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-violet-400">{t.approvalQueue}</h2>
            {pendingRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/70 transition-all">
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-lg">{req.query}</h3>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200">{req.status}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{req.details}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>🧑‍🎓 {req.studentName || "Student"}</span>
                        <span>📧 {req.studentEmail || "Email unavailable"}</span>
                        <span>📲 {req.studentWhatsapp || "WhatsApp unavailable"}</span>
                        <span>🕐 {req.createdAt.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Btn variant="success" size="sm" onClick={() => handleApproval(req.id, "APPROVED")}>✅ {t.approve}</Btn>
                      <Btn variant="danger" size="sm" onClick={() => handleApproval(req.id, "REJECTED")}>❌ {t.reject}</Btn>
                    </div>
                    <DocumentPanel
                      documents={req.documents}
                      threadId={req.threadId}
                      viewerRole="faculty"
                      pendingFile={pendingFiles[req.threadId]}
                      onFileChange={(file) => setPendingFiles((p) => ({ ...p, [req.threadId]: file }))}
                      onUpload={() => handleDocumentUpload(req.threadId, "faculty")}
                      uploading={uploadingThread === req.threadId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {(approvedRequests.length > 0 || rejectedRequests.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {approvedRequests.length > 0 && (
                <div className="bg-slate-900/70 border border-emerald-700/30 rounded-2xl p-8">
                  <h3 className="text-xl font-bold mb-6 text-emerald-400">✅ {t.approvedStatus}</h3>
                  <div className="space-y-3">
                    {approvedRequests.map((req) => (
                      <div key={req.id} className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
                        <p className="text-white font-medium">{req.query.slice(0, 50)}...</p>
                        <p className="text-xs text-slate-400 mt-2">{req.createdAt.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejectedRequests.length > 0 && (
                <div className="bg-slate-900/70 border border-rose-700/30 rounded-2xl p-8">
                  <h3 className="text-xl font-bold mb-6 text-rose-400">❌ {t.rejectedStatus}</h3>
                  <div className="space-y-3">
                    {rejectedRequests.map((req) => (
                      <div key={req.id} className="bg-rose-900/20 border border-rose-700/30 rounded-lg p-4">
                        <p className="text-white font-medium">{req.query.slice(0, 50)}...</p>
                        <p className="text-xs text-slate-400 mt-2">{req.createdAt.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8">
            <ComplaintPanel
              viewerRole="faculty"
              complaints={complaints}
              subject={complaintSubject}
              description={complaintDescription}
              onSubjectChange={setComplaintSubject}
              onDescriptionChange={setComplaintDescription}
              onSubmit={handleRaiseComplaint}
              submitting={complaintSubmitting}
              onDownload={handleDownloadComplaintTicket}
            />
          </div>
        </main>

        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <Toast key={toast.id} t={toast} onClose={() => rmToast(toast.id)} />
          ))}
        </div>
      </div>
    );
  }

  if ((view === "hod" || view === "admin") && user) {
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const escalatedRequests = requests.filter((r) => (r as any).escalated);

    return (
      <div className="min-h-screen text-slate-100 font-sans" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%)" }}>
        <header className="border-b border-slate-700/50 bg-slate-900/70 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{view === "admin" ? "🔐" : "🎓"}</div>
              <div>
                <h1 className="text-2xl font-bold text-rose-400">{t.appTitle}</h1>
                <p className="text-sm text-slate-400">{view === "admin" ? "Admin Dashboard" : "HOD Dashboard"} — {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {view === "admin" && (
                <a href="/admin" className="inline-flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-2 text-sm text-violet-300 transition-all">
                  📊 Analytics
                </a>
              )}
              <Btn variant="danger" size="sm" onClick={handleLogout}>{t.logout}</Btn>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg p-4">
              <p className="text-amber-400 text-sm font-medium">Pending Requests</p>
              <p className="text-3xl font-bold text-white mt-2">{pendingRequests.length}</p>
            </div>
            <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-4">
              <p className="text-orange-400 text-sm font-medium">🚨 Escalated</p>
              <p className="text-3xl font-bold text-white mt-2">{escalatedRequests.length}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm font-medium">Total</p>
              <p className="text-3xl font-bold text-white mt-2">{requests.length}</p>
            </div>
          </div>

          {escalatedRequests.length > 0 && (
            <div className="mb-8 bg-orange-900/20 border border-orange-700/40 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-orange-400 mb-4">🚨 Escalated Requests</h2>
              <div className="space-y-3">
                {escalatedRequests.map((req) => (
                  <div key={req.id} className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-white">{req.query}</h3>
                      <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded">ESCALATED</span>
                    </div>
                    <p className="text-xs text-slate-400">Student: {req.studentName} | Faculty: {req.assignedFacultyName || "Unassigned"}</p>
                    <div className="flex gap-3 mt-3">
                      <Btn variant="success" size="sm" onClick={() => handleApproval(req.id, "APPROVED")}>✅ Approve</Btn>
                      <Btn variant="danger" size="sm" onClick={() => handleApproval(req.id, "REJECTED")}>❌ Reject</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-violet-400">All Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-white">{req.query}</h3>
                      <span className="text-xs text-amber-300 bg-amber-500/15 px-2 py-1 rounded-full">{req.status}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">Student: {req.studentName} | Dept: {req.studentDepartment} | Faculty: {req.assignedFacultyName}</p>
                    <div className="flex gap-3">
                      <Btn variant="success" size="sm" onClick={() => handleApproval(req.id, "APPROVED")}>✅ Approve</Btn>
                      <Btn variant="danger" size="sm" onClick={() => handleApproval(req.id, "REJECTED")}>❌ Reject</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (<Toast key={toast.id} t={toast} onClose={() => rmToast(toast.id)} />))}
        </div>
      </div>
    );
  }

  return null;
}
