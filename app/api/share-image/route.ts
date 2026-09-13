import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

function hostPermitido(hostname: string) {
  const supabaseHost = (() => {
    try {
      return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";
    } catch {
      return "";
    }
  })();

  return hostname === "s.glbimg.com"
    || hostname.endsWith(".glbimg.com")
    || Boolean(supabaseHost && hostname === supabaseHost);
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");
  if (!source) return NextResponse.json({ error: "URL não informada" }, { status: 400 });

  let imageUrl: URL;
  try {
    imageUrl = new URL(source);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !hostPermitido(imageUrl.hostname)) {
    return NextResponse.json({ error: "Origem da imagem não permitida" }, { status: 403 });
  }

  try {
    const response = await fetch(imageUrl, {
      cache: "force-cache",
      signal: AbortSignal.timeout(8000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Imagem indisponível" }, { status: 404 });
    }

    const png = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(320, 320, { fit: "contain", withoutEnlargement: true })
      .png()
      .toBuffer();

    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar imagem" }, { status: 502 });
  }
}
