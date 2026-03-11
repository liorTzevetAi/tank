import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    execute: mockExecute
  }
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((col) => ({ col, type: 'desc' })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
      type: 'sql'
    })),
    {
      raw: vi.fn((str: string) => ({ str, type: 'sql_raw' }))
    }
  )
}));

const mockCreateSignedUrl = vi.fn();
vi.mock('@/lib/storage/provider', () => ({
  getStorageProvider: vi.fn(() => ({
    createSignedUrl: mockCreateSignedUrl
  }))
}));

vi.mock('@/lib/auth-helpers', () => ({
  resolveRequestUserId: vi.fn().mockResolvedValue(null)
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(url: string, headers?: Record<string, string>) {
  return new Request(url, {
    method: 'GET',
    headers: headers ?? {}
  });
}

const skillVersionRow = {
  skillId: 'skill-1',
  name: 'my-skill',
  description: 'A test skill',
  versionId: 'version-1',
  version: '1.0.0',
  integrity: 'sha512-abc123',
  permissions: { network: { outbound: ['*.example.com'] } },
  auditScore: 8.5,
  auditStatus: 'published',
  tarballPath: 'skills/skill-1/1.0.0.tgz',
  publishedAt: '2026-01-10T00:00:00Z'
};

const defaultMetaRow = {
  downloadCount: 0,
  scanVerdict: null,
  findingStage: null,
  findingSeverity: null,
  findingType: null,
  findingDescription: null,
  findingLocation: null
};

function setupSuccessfulFetch(options?: { downloadCount?: number }) {
  const { downloadCount = 0 } = options ?? {};

  mockExecute.mockResolvedValueOnce([skillVersionRow]);
  mockExecute.mockResolvedValueOnce(undefined);
  mockExecute.mockResolvedValueOnce([{ ...defaultMetaRow, downloadCount }]);

  mockCreateSignedUrl.mockResolvedValue({
    signedUrl: 'https://storage.example.com/download?token=xyz'
  });
}

async function callVersionEndpoint(headers?: Record<string, string>) {
  const { GET } = await import('@/app/api/v1/skills/[name]/[version]/route');
  const request = makeGetRequest('http://localhost:3000/api/v1/skills/my-skill/1.0.0', headers);
  return GET(request, {
    params: Promise.resolve({ name: 'my-skill', version: '1.0.0' })
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Download counting - GET /api/v1/skills/[name]/[version]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records download on successful version fetch', async () => {
    setupSuccessfulFetch();

    const response = await callVersionEndpoint({
      'x-forwarded-for': '192.168.1.1'
    });

    expect(response.status).toBe(200);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('includes download count in response', async () => {
    setupSuccessfulFetch({ downloadCount: 42 });

    const response = await callVersionEndpoint({
      'x-forwarded-for': '192.168.1.1'
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.downloads).toBe(42);
  });

  it("download counting errors don't break the response", async () => {
    mockExecute.mockResolvedValueOnce([skillVersionRow]);
    mockExecute.mockRejectedValueOnce(new Error('DB connection failed'));
    mockExecute.mockResolvedValueOnce([defaultMetaRow]);

    mockCreateSignedUrl.mockResolvedValue({
      signedUrl: 'https://storage.example.com/download?token=xyz'
    });

    const response = await callVersionEndpoint({
      'x-forwarded-for': '192.168.1.1'
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('my-skill');
    expect(data.downloadUrl).toBe('https://storage.example.com/download?token=xyz');
  });
});
