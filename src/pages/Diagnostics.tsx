import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import AivedhaAPI from "@/lib/api";
import { getErrorMessage } from "@/utils/type-guards";

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  detail: string;
}

export default function Diagnostics() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>(AivedhaAPI.getBaseUrl());
  const [override, setOverride] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('API_BASE_OVERRIDE') || '') : '');

  useEffect(() => {
    setBaseUrl(AivedhaAPI.getBaseUrl());
  }, []);

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    document.title = "API Connectivity Diagnostics | AiVedha Guard";
    setMetaDescription("Run connectivity checks to AiVedha Guard backend API.");

    try {
      const res = await AivedhaAPI.checkConnectivity();
      setResults(res.tests);
    } catch (e: unknown) {
      setResults([
        {
          name: 'Unexpected error',
          status: 'fail',
          detail: getErrorMessage(e),
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  const saveOverride = () => {
    const val = override.trim();
    if (!val) return;
    AivedhaAPI.setBaseUrlOverride(val);
    setBaseUrl(AivedhaAPI.getBaseUrl());
  };

  const clearOverride = () => {
    AivedhaAPI.clearBaseUrlOverride();
    setOverride('');
    setBaseUrl(AivedhaAPI.getBaseUrl());
  };

  return (
    <Layout>
      <main className="container mx-auto max-w-3xl py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">API Connectivity Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-muted-foreground">Verify that the frontend can reach the backend API. This helps diagnose CORS, DNS, and SSL issues.</p>
            <p className="mb-2 text-xs text-muted-foreground">Current API base: <code className="font-mono">{baseUrl}</code></p>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                className="sm:max-w-md"
              />
              <Button variant="outline" size="sm" className="px-3 py-1.5" onClick={saveOverride} disabled={!override.trim()}>Save override</Button>
              <Button variant="ghost" size="sm" className="px-3 py-1.5" onClick={clearOverride}>Clear</Button>
            </div>
            <button onClick={runTests} disabled={running} className="btn-primary px-6 py-2 rounded-xl mb-6">
              {running ? 'Running…' : 'Run Tests'}
            </button>

            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between rounded-md border p-3">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">{r.detail}</div>
                  </div>
                  <Badge variant={r.status === 'pass' ? 'default' : 'destructive'}>
                    {r.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {!results.length && (
                <p className="text-sm text-muted-foreground">No results yet. Click "Run Tests" to begin.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}

function setMetaDescription(text: string) {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', text);
}
