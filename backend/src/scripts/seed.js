import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import HostelBlock from "../models/HostelBlock.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";
import Complaint from "../models/Complaint.js";
import LeaveRequest from "../models/LeaveRequest.js";
import MessMenu from "../models/MessMenu.js";
import Announcement from "../models/Announcement.js";

export async function runSeed() {
  const adminPassword = await bcrypt.hash("Admin@Hostel360", 12);
  const wardenPassword = await bcrypt.hash("Warden@Hostel360", 12);
  const studentPassword = await bcrypt.hash("Student@Hostel360", 12);

  // 1. Admin
  const admin = await User.findOneAndUpdate(
    { email: "admin@hostel360.dev" },
    { $setOnInsert: { name: "Hostel360 Super Admin", email: "admin@hostel360.dev", password: adminPassword, role: "admin", phone: "+91 98765 00001", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  // Keep legacy admin login working too
  await User.findOneAndUpdate(
    { email: "admin@hostelos.dev" },
    { $setOnInsert: { name: "Hostel360 Admin", email: "admin@hostelos.dev", password: adminPassword, role: "admin", phone: "+91 98765 00000", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 2. Warden & Staff
  const warden = await User.findOneAndUpdate(
    { email: "warden@hostel360.dev" },
    { $setOnInsert: { name: "Prof. Rajesh Verma", email: "warden@hostel360.dev", password: wardenPassword, role: "warden", phone: "+91 98765 00002", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await User.findOneAndUpdate(
    { email: "staff@hostel360.dev" },
    { $setOnInsert: { name: "Hostel Staff & Warden", email: "staff@hostel360.dev", password: wardenPassword, role: "warden", phone: "+91 98765 00004", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await User.findOneAndUpdate(
    { email: "warden@hostelos.dev" },
    { $setOnInsert: { name: "Chief Warden", email: "warden@hostelos.dev", password: wardenPassword, role: "warden", phone: "+91 98765 00003", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 3. Hostel Blocks
  const blockA = await HostelBlock.findOneAndUpdate(
    { code: "BLOCK-A" },
    { $setOnInsert: { name: "North Wing (A Block)", code: "BLOCK-A", gender: "mixed", capacity: 60, warden: warden._id, address: "North Campus, Main Avenue", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const blockB = await HostelBlock.findOneAndUpdate(
    { code: "BLOCK-B" },
    { $setOnInsert: { name: "South Wing (B Block)", code: "BLOCK-B", gender: "mixed", capacity: 60, warden: warden._id, address: "South Campus, Garden View", isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 4. Rooms
  const sampleRooms = [
    { block: blockA._id, roomNumber: "A-101", floor: 1, capacity: 2, type: "double", monthlyFee: 6500 },
    { block: blockA._id, roomNumber: "A-102", floor: 1, capacity: 2, type: "double", monthlyFee: 6500 },
    { block: blockA._id, roomNumber: "A-201", floor: 2, capacity: 3, type: "triple", monthlyFee: 5500 },
    { block: blockB._id, roomNumber: "B-101", floor: 1, capacity: 2, type: "double", monthlyFee: 6500 },
    { block: blockB._id, roomNumber: "B-102", floor: 1, capacity: 1, type: "single", monthlyFee: 9500 },
  ];

  for (const r of sampleRooms) {
    await Room.updateOne({ block: r.block, roomNumber: r.roomNumber }, { $setOnInsert: r }, { upsert: true });
  }

  const roomA101 = await Room.findOne({ roomNumber: "A-101" });
  const roomA102 = await Room.findOne({ roomNumber: "A-102" });
  const roomB101 = await Room.findOne({ roomNumber: "B-101" });

  // 5. Students
  const seedStudents = [
    { studentId: "STU-2026-001", name: "Aarav Sharma", email: "student@hostel360.dev", course: "Computer Science", department: "Engineering", year: 2, gender: "male", room: roomA101?._id, phone: "+91 98111 22233", guardianName: "Sanjay Sharma", guardianPhone: "+91 98111 22234" },
    { studentId: "STU-2026-002", name: "Diya Patel", email: "diya.patel@hostel360.dev", course: "Business Administration", department: "Management", year: 1, gender: "female", room: roomA101?._id, phone: "+91 98222 33344", guardianName: "Anita Patel", guardianPhone: "+91 98222 33345" },
    { studentId: "STU-2026-003", name: "Kabir Singh", email: "kabir.singh@hostel360.dev", course: "Mechanical Engineering", department: "Engineering", year: 3, gender: "male", room: roomA102?._id, phone: "+91 98333 44455", guardianName: "Rajendra Singh", guardianPhone: "+91 98333 44456" },
    { studentId: "STU-2026-004", name: "Meera Nair", email: "meera.nair@hostel360.dev", course: "Information Technology", department: "Engineering", year: 2, gender: "female", room: roomB101?._id, phone: "+91 98444 55566", guardianName: "Govind Nair", guardianPhone: "+91 98444 55567" },
    { studentId: "STU-2026-005", name: "Ishaan Rao", email: "ishaan.rao@hostel360.dev", course: "Civil Engineering", department: "Engineering", year: 1, gender: "male", room: null, phone: "+91 98555 66677", guardianName: "Anand Rao", guardianPhone: "+91 98555 66678" },
  ];

  for (const s of seedStudents) {
    const user = await User.findOneAndUpdate(
      { email: s.email },
      { $setOnInsert: { name: s.name, email: s.email, password: studentPassword, role: "student", phone: s.phone, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Student.findOneAndUpdate(
      { studentId: s.studentId },
      { $setOnInsert: { user: user._id, studentId: s.studentId, course: s.course, department: s.department, year: s.year, gender: s.gender, room: s.room, guardianName: s.guardianName, guardianPhone: s.guardianPhone, status: "active" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Update room occupancy
  const allRooms = await Room.find();
  for (const r of allRooms) {
    const occupiedBeds = await Student.countDocuments({ room: r._id, status: "active" });
    await Room.updateOne({ _id: r._id }, { $set: { occupiedBeds, status: occupiedBeds >= r.capacity ? "full" : "available" } });
  }

  // 6. Fees
  const mainStudent = await Student.findOne({ studentId: "STU-2026-001" });
  if (mainStudent) {
    await Payment.findOneAndUpdate(
      { student: mainStudent._id, feeType: "accommodation", academicYear: "2026-2027" },
      {
        $setOnInsert: {
          student: mainStudent._id,
          amount: 39000,
          amountPaid: 39000,
          feeType: "accommodation",
          academicYear: "2026-2027",
          purpose: "rent",
          dueDate: new Date(Date.now() + 30 * 86400000),
          paidAt: new Date(),
          status: "paid",
          method: "upi",
          transactionId: "SIM-TXN-100293",
        },
      },
      { upsert: true }
    );

    await Payment.findOneAndUpdate(
      { student: mainStudent._id, feeType: "mess", academicYear: "2026-2027" },
      {
        $setOnInsert: {
          student: mainStudent._id,
          amount: 14500,
          amountPaid: 0,
          feeType: "mess",
          academicYear: "2026-2027",
          purpose: "mess",
          dueDate: new Date(Date.now() + 15 * 86400000),
          status: "pending",
        },
      },
      { upsert: true }
    );
  }

  // 7. Complaints
  if (mainStudent && roomA101) {
    await Complaint.findOneAndUpdate(
      { title: "Air conditioner thermostat not responding" },
      {
        $setOnInsert: {
          student: mainStudent._id,
          room: roomA101._id,
          title: "Air conditioner thermostat not responding",
          description: "The room AC thermostat is stuck at 18 degrees and cannot be adjusted with the remote.",
          category: "electrical",
          priority: "high",
          status: "in_progress",
          assignedTo: warden._id,
          remarks: "Maintenance technician scheduled for inspection today.",
        },
      },
      { upsert: true }
    );
  }

  // 8. Mess Menu
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const defaultMenus = [
    { meal: "breakfast", items: ["Idli & Sambhar", "Coconut Chutney", "Boiled Eggs / Sprouts", "Tea & Coffee"] },
    { meal: "lunch", items: ["Steamed Basmati Rice", "Dal Tadka", "Paneer Butter Masala", "Roti", "Fresh Salad & Curd"] },
    { meal: "dinner", items: ["Mixed Vegetable Pulao", "Yellow Dal Fry", "Phulka Roti", "Gulab Jamun / Kheer"] },
  ];

  for (const day of days) {
    for (const m of defaultMenus) {
      await MessMenu.updateOne(
        { dayOfWeek: day, mealType: m.meal },
        { $setOnInsert: { dayOfWeek: day, mealType: m.meal, items: m.items, updatedBy: admin._id } },
        { upsert: true }
      );
    }
  }

  // 9. Announcements
  await Announcement.findOneAndUpdate(
    { title: "Hostel Maintenance & Inspection Schedule" },
    {
      $setOnInsert: {
        title: "Hostel Maintenance & Inspection Schedule",
        content: "Routine electrical and plumbing inspections will be conducted across all blocks this Thursday between 10:00 AM and 4:00 PM.",
        targetRole: "all",
        priority: "important",
        author: admin._id,
      },
    },
    { upsert: true }
  );

  console.info("Hostel360 initial seed successfully verified / applied.");
}

async function main() {
  await connectDatabase();
  await runSeed();
}

if (process.argv[1]?.endsWith("seed.js")) {
  main()
    .catch(console.error)
    .finally(() => disconnectDatabase().catch(() => null));
}

