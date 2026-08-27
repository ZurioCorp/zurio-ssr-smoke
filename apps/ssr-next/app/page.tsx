export const dynamic = "force-dynamic";

type CatalogResponse = {
  service: string;
  items: Array<{ id: string; name: string; status: string }>;
  backend_ms: number;
};

async function getCatalog(): Promise<CatalogResponse> {
  const baseUrl = process.env.INTERNAL_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
  const response = await fetch(`${baseUrl}/api/catalog`, { cache: "no-store" });
  if (!response.ok) throw new Error(`catalog request failed: ${response.status}`);
  return response.json();
}

export default async function Home() {
  const renderedAt = new Date().toISOString();
  const catalog = await getCatalog();

  return (
    <main>
      <h1>SSR smoke</h1>
      <p>Frontend mínimo renderizado en el servidor.</p>
      <p data-testid="service">API: {catalog.service}</p>
      <p data-testid="backend-ms">Latencia API: {catalog.backend_ms} ms</p>
      <ul>
        {catalog.items.map((item) => <li key={item.id}>{item.name} — {item.status}</li>)}
      </ul>
      <code data-testid="rendered-at">{renderedAt}</code>
    </main>
  );
}
