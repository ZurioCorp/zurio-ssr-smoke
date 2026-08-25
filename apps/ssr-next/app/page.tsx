export const dynamic = "force-dynamic";

export default function Home() {
  return <main><h1>SSR smoke</h1><code data-testid="rendered-at">{new Date().toISOString()}</code></main>;
}
