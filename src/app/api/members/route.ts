import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const members = await CoopExcelDB.getMembers();
    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error("GET /api/members error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT", "TELLER"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Unauthorized to add member)" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let data: any = {};
    let photoBuffer: Buffer | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      data.fullName = formData.get("fullName")?.toString() || "";
      data.citizenshipNo = formData.get("citizenshipNo")?.toString() || "";
      data.address = formData.get("address")?.toString() || "";
      data.phone = formData.get("phone")?.toString() || "";
      data.nomineeName = formData.get("nomineeName")?.toString() || "";
      data.nomineeRelation = formData.get("nomineeRelation")?.toString() || "";
      data.enrolledDate = formData.get("enrolledDate")?.toString() || "";
      data.shareUnits = parseInt(formData.get("shareUnits")?.toString() || "0", 10);
      data.paymentMode = (formData.get("paymentMode")?.toString() || "CASH") as "CASH" | "BANK";

      const file = formData.get("photo") as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        photoBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      data = await req.json();
    }

    if (!data.fullName || !data.citizenshipNo) {
      return NextResponse.json(
        { error: "सदस्यको नाम र नागरिकता नम्बर अनिवार्य छ (Full name and Citizenship No required)" },
        { status: 400 }
      );
    }

    const res = await CoopExcelDB.postNewMember({
      fullName: data.fullName,
      citizenshipNo: data.citizenshipNo,
      address: data.address || "",
      phone: data.phone || "",
      nomineeName: data.nomineeName || "",
      nomineeRelation: data.nomineeRelation || "",
      enrolledDate: data.enrolledDate || new Date().toISOString().split("T")[0],
      shareUnits: data.shareUnits || 0,
      paymentMode: data.paymentMode || "CASH",
      photoBuffer,
    });

    return NextResponse.json({
      success: true,
      message: "नयाँ सदस्य सफलतापूर्वक दर्ता गरियो (New member registered successfully)",
      ...res,
    });
  } catch (error: any) {
    console.error("POST /api/members error:", error);
    return NextResponse.json({ error: error.message || "Failed to register member" }, { status: 500 });
  }
}
