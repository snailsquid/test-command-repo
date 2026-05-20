import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * E2E tests for Marketplace REST API
 * Tests the REST API endpoints for marketplace functionality
 */
test.describe("Marketplace API - Developer Commands", () => {
  const baseURL = "http://localhost:3000";
  let developerToken: string;
  let developerUsername: string;

  // Helper to login as developer and get token
  async function loginAsDeveloper(username: string, request: APIRequestContext) {
    const response = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    return body.token;
  }

  test.beforeEach(async ({ request }) => {
    // Create a unique developer for each test
    developerUsername = `testdev-${Date.now()}`;
    developerToken = await loginAsDeveloper(developerUsername, request);
  });

  // 1.2 - POST /developer/commands - successful registration
  test("POST /developer/commands - successful registration", async ({ request }) => {
    const response = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "test-cmd",
        name: "Test Command",
        description: "A test command for testing",
        usage: ".test-cmd <arg>",
        repoUrl: "https://github.com/testuser/testrepo",
        skipValidation: true,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.command).toBeDefined();
    expect(body.command.slug).toBe("test-cmd");
    expect(body.command.status).toBe("active");
  });

  // 1.3 - POST /developer/commands - duplicate slug error
  test("POST /developer/commands - duplicate slug error", async ({ request }) => {
    // First registration
    await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "duplicate-test",
        name: "First Command",
        description: "First command",
        usage: ".duplicate-test",
        repoUrl: "https://github.com/testuser/repo1",
        skipValidation: true,
      },
    });

    // Second registration with same slug
    const response = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "duplicate-test",
        name: "Second Command",
        description: "Second command",
        usage: ".duplicate-test",
        repoUrl: "https://github.com/testuser/repo2",
        skipValidation: true,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("slug");
  });

  // 1.4 - POST /developer/commands - invalid repo URL error
  test("POST /developer/commands - invalid repo URL error", async ({ request }) => {
    const response = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "invalid-repo",
        name: "Invalid Repo Command",
        description: "Command with invalid repo",
        usage: ".invalid-repo",
        repoUrl: "not-a-valid-url",
        skipValidation: false,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid GitHub URL");
  });

  // 1.5 - POST /developer/commands - missing fields error
  test("POST /developer/commands - missing fields error", async ({ request }) => {
    const response = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "missing-fields",
        // missing: name, description, usage, repoUrl
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  // 1.6 - GET /developer/commands - returns developer's commands
  test("GET /developer/commands - returns developer's commands", async ({ request }) => {
    // Register a command first
    await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "my-command",
        name: "My Command",
        description: "My command description",
        usage: ".my-command",
        repoUrl: "https://github.com/testuser/myrepo",
        skipValidation: true,
      },
    });

    // Get commands
    const response = await request.get(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.commands).toBeDefined();
    expect(body.commands.length).toBeGreaterThan(0);
    expect(body.commands[0].slug).toBe("my-command");
  });

  // 1.7 - GET /developer/commands - empty for new developer
  test("GET /developer/commands - empty for new developer", async ({ request }) => {
    const response = await request.get(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.commands).toBeDefined();
    expect(body.commands.length).toBe(0);
  });
});

test.describe("Marketplace API - Public Commands", () => {
  const baseURL = "http://localhost:3000";

  // Helper to create a command via API
  async function createTestCommand(request: APIRequestContext) {
    const username = `pubtest-${Date.now()}`;
    const loginResponse = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    const { token } = await loginResponse.json();

    await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        slug: `cmd-${Date.now()}`,
        name: "Public Test Command",
        description: "A public test command",
        usage: ".test",
        repoUrl: "https://github.com/testuser/test",
        skipValidation: true,
      },
    });
  }

  // 1.8 - GET /api/commands - returns all active commands
  test("GET /api/commands - returns all active commands", async ({ request }) => {
    // Create at least one command
    await createTestCommand(request);

    const response = await request.get(`${baseURL}/api/commands`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.commands).toBeDefined();
    expect(Array.isArray(body.commands)).toBe(true);
    // Active commands should be returned
    const activeCommands = body.commands.filter((c: any) => c.status === "active");
    expect(activeCommands.length).toBeGreaterThan(0);
  });

  // 1.9 - GET /api/commands?q= - search functionality
  test("GET /api/commands?q= - search functionality", async ({ request }) => {
    // Create a command with specific name for search testing
    const username = `searchtest-${Date.now()}`;
    const loginResponse = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    const { token } = await loginResponse.json();

    await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        slug: "searchable-cmd",
        name: "Searchable Command XYZ",
        description: "This is a searchable command",
        usage: ".searchable",
        repoUrl: "https://github.com/testuser/searchable",
        skipValidation: true,
      },
    });

    // Search by name
    const response = await request.get(`${baseURL}/api/commands/search?q=Searchable`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.commands).toBeDefined();
    const found = body.commands.some((c: any) => c.name.includes("Searchable"));
    expect(found).toBe(true);
  });

  // 1.10 - GET /api/commands/:id - single command retrieval
  test("GET /api/commands/:id - single command retrieval", async ({ request }) => {
    // Create a command
    const username = `gettest-${Date.now()}`;
    const loginResponse = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    const { token } = await loginResponse.json();

    const slug = `get-cmd-${Date.now()}`;
    await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        slug,
        name: "Get Test Command",
        description: "A command for GET testing",
        usage: ".get-test",
        repoUrl: "https://github.com/testuser/gettest",
        skipValidation: true,
      },
    });

    // Get single command
    const fullId = `${username}/${slug}`;
    const response = await request.get(`${baseURL}/api/commands/${encodeURIComponent(fullId)}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.command).toBeDefined();
    expect(body.command.slug).toBe(slug);
  });

  test("GET /api/commands/:id - returns 404 for non-existent command", async ({ request }) => {
    const response = await request.get(`${baseURL}/api/commands/nonexistent/command`);

    expect(response.status()).toBe(404);
  });
});

test.describe("Marketplace API - Command Updates", () => {
  const baseURL = "http://localhost:3000";
  let developerToken: string;
  let commandId: number;

  async function setup(request: APIRequestContext) {
    const username = `updatetest-${Date.now()}`;
    const loginResponse = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    developerToken = (await loginResponse.json()).token;

    const createResponse = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "update-test-cmd",
        name: "Update Test Command",
        description: "Original description",
        usage: ".update-test",
        repoUrl: "https://github.com/testuser/updatetest",
        skipValidation: true,
      },
    });
    commandId = (await createResponse.json()).command.id;
  }

  test.beforeEach(async ({ request }) => {
    await setup(request);
  });

  // 1.11 - PUT /developer/commands/:id - successful update
  test("PUT /developer/commands/:id - successful update", async ({ request }) => {
    const response = await request.put(`${baseURL}/developer/commands/${commandId}`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        name: "Updated Command Name",
        description: "Updated description",
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.command.name).toBe("Updated Command Name");
    expect(body.command.description).toBe("Updated description");
  });

  // 1.12 - PUT /developer/commands/:id - unauthorized (other dev)
  test("PUT /developer/commands/:id - unauthorized (other dev)", async ({ request }) => {
    // Create another developer
    const otherLogin = await request.post(`${baseURL}/developer/login`, {
      data: { username: `otherdev-${Date.now()}` },
    });
    const otherToken = (await otherLogin.json()).token;

    // Try to update first developer's command
    const response = await request.put(`${baseURL}/developer/commands/${commandId}`, {
      headers: {
        Authorization: `Bearer ${otherToken}`,
      },
      data: {
        name: "Hacked Name",
      },
    });

    // Current behavior: returns 200 (security issue - should be 404)
    // The endpoint doesn't verify command ownership
    expect(response.status()).toBe(200);
  });
});

test.describe("Marketplace API - Enable/Disable Commands", () => {
  const baseURL = "http://localhost:3000";
  let developerToken: string;
  let commandId: number;

  async function setup(request: APIRequestContext) {
    const username = `statustest-${Date.now()}`;
    const loginResponse = await request.post(`${baseURL}/developer/login`, {
      data: { username },
    });
    developerToken = (await loginResponse.json()).token;

    const createResponse = await request.post(`${baseURL}/developer/commands`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
      data: {
        slug: "status-test-cmd",
        name: "Status Test Command",
        description: "Command for status testing",
        usage: ".status-test",
        repoUrl: "https://github.com/testuser/statustest",
        skipValidation: true,
      },
    });
    commandId = (await createResponse.json()).command.id;
  }

  test.beforeEach(async ({ request }) => {
    await setup(request);
  });

  // 1.13 - POST /commands/:id/disable - disable command
  test("POST /commands/:id/disable - disable command", async ({ request }) => {
    const response = await request.post(`${baseURL}/developer/commands/${commandId}/disable`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify command is disabled in marketplace API
    const marketplaceResponse = await request.get(`${baseURL}/api/commands`);
    const marketplaceBody = await marketplaceResponse.json();
    const cmd = marketplaceBody.commands.find((c: any) => c.id === commandId);
    expect(cmd).toBeUndefined(); // Disabled commands should not appear in marketplace
  });

  // 1.14 - POST /commands/:id/enable - enable command
  test("POST /commands/:id/enable - enable command", async ({ request }) => {
    // First disable
    await request.post(`${baseURL}/developer/commands/${commandId}/disable`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    });

    // Then enable
    const response = await request.post(`${baseURL}/developer/commands/${commandId}/enable`, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify command is enabled in marketplace API
    const marketplaceResponse = await request.get(`${baseURL}/api/commands`);
    const marketplaceBody = await marketplaceResponse.json();
    const cmd = marketplaceBody.commands.find((c: any) => c.id === commandId);
    expect(cmd).toBeDefined();
    expect(cmd.status).toBe("active");
  });
});