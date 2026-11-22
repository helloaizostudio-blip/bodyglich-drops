import { MANUAL_CSV_TEMPLATE } from "@/services/amazon/manual-import";

export async function GET() {
  return new Response(MANUAL_CSV_TEMPLATE, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="products-template.csv"',
    },
  });
}
