import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), "public", "uploads", "members", filename);

    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === ".png" ? "image/png" : "image/jpeg";
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      });
    }

    // Fallback placeholder image if requested file does not exist on disk
    const placeholderPath = path.join(process.cwd(), "public", "avatar-placeholder.png");
    if (fs.existsSync(placeholderPath)) {
      const buffer = fs.readFileSync(placeholderPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Dynamic SVG avatar fallback
    const id = filename.replace(/\.[^/.]+$/, "");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" rx="100" fill="#1F497D"/>
        <circle cx="100" cy="70" r="35" fill="#FFFFFF"/>
        <path d="M40 170 C40 120 160 120 160 170 Z" fill="#FFFFFF"/>
        <text x="100" y="190" font-family="sans-serif" font-size="12" font-weight="bold" fill="#F1F5F9" text-anchor="middle">${id}</text>
      </svg>
    `.trim();

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 404 });
  }
}
