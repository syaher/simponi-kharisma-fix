import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

interface PDFRequest {
  htmlContent: string;
  filename?: string;
  options?: {
    format?: string;
    margin?: { top: number; right: number; bottom: number; left: number };
    printBackground?: boolean;
  };
}

serve(async (req: Request) => {
  // === CORS HEADERS ===
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: PDFRequest = await req.json();
    const { htmlContent, filename, options } = body;

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ error: "htmlContent is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[PDF Generation] Starting...");

    // === LAUNCH BROWSER ===
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // === SET VIEWPORT ===
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    // === INJECT HTML ===
    await page.setContent(htmlContent, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // === WAIT FOR FONTS ===
    await page.evaluateHandle("document.fonts.ready");

    // === PDF OPTIONS ===
    const pdfOptions = {
      format: options?.format || "A4",
      landscape: options?.format === "A3" ? true : false,
      margin: options?.margin || {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
      printBackground: options?.printBackground !== false,
      displayHeaderFooter: false,
    };

    // === GENERATE PDF ===
    const pdf = await page.pdf(pdfOptions as Parameters<typeof page.pdf>[0]);

    await browser.close();

    console.log("[PDF Generation] Success - Size: " + pdf.byteLength);

    // === RETURN PDF ===
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${
          filename || "document.pdf"
        }"`,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[PDF Generation] Error:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Failed to generate PDF",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
