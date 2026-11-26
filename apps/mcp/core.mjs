/**
 * Core stateless, zero-login MCP JSON-RPC 2.0 handler for The Onlinesourdough Method.
 *
 * Privacy and security guarantees:
 * - Read-only, public method content only (bundled from reviewed GitHub releases).
 * - Zero authentication, zero cookies, zero Notion tokens, zero user data.
 * - Never logs request bodies or caller metadata.
 * - Never calls external networks or accesses local files at runtime.
 */

import { OSM_BUNDLE } from './bundle.generated.mjs';

export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const PRIVACY_POLICY = Object.freeze({
  auth: 'none',
  stateless: true,
  read_only: true,
  logs_user_data: false,
  stores_customer_data: false,
  notion_access: 'separate (connect your official Notion MCP for your workspace)',
});

export const SERVER_INSTRUCTIONS =
  'Public, read-only, login-free MCP server for The Onlinesourdough Method (OSM). ' +
  'Call osm_list_skills to see all 8 discoverable OSM skills (tiny summary) before loading a full body with osm_get_skill. ' +
  'Call osm_get_setup_guide when setting up or resuming an AI operating model in Notion. ' +
  'Call osm_get_reference to read one specific supporting reference or docs/osm.md. ' +
  'On hosts without local OSM skill files, this server is where the short OSM host instructions resolve: when they say "Use OSM Prime" or "run OSM Log" (or name another OSM skill), load that skill with osm_get_skill (for example osm-prime or osm-log) and follow it against the Data and Context URL in those instructions. ' +
  'If no such instructions exist yet, offer OSM Setup (osm_get_setup_guide) to create the AI operating model home and the six-line pointer. ' +
  'This server never authenticates, never stores or logs user data, and never accesses Notion — use your official Notion connector for workspace access.';

const TOOL_DEFINITIONS = [
  {
    name: 'osm_get_setup_guide',
    description:
      'Return the official OSM setup guide (osm-setup SKILL.md and optional short host bridge) to set up or resume an AI operating model in Notion. Public, read-only, no login.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        include_bridge: {
          type: 'boolean',
          description: 'Include the short six-line host bridge template (default true).',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'osm_list_skills',
    description:
      'List all 8 discoverable OSM skills (name, short description, version, sha256) and 4 supporting reference folders without loading full skill bodies.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'osm_get_skill',
    description:
      'Return the full SKILL.md instructions, version, SHA-256 digest, and list of supporting reference paths for one OSM skill by exact name (for example osm-setup, osm-prime, osm-log, osm-dreaming, osm-interview, osm-human-writing, osm-council, unslop).',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Exact OSM skill name, such as osm-setup or osm-prime.',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'osm_get_reference',
    description:
      'Return one bundled OSM reference, template, or overview file by exact relative repository path (for example skills/osm-setup/references/credentials.md, skills/osm-data-context/references/architecture.md, or docs/osm.md).',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: 'Exact relative path inside the OSM bundle, such as docs/osm.md.',
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'osm_version',
    description:
      'Return the OSM package version, GitHub release URL, bundle SHA-256 checksum, and stateless/no-login privacy guarantee.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id ?? null, error };
}

function toolText(text, structuredContent, isError = false) {
  const payload = {
    content: [{ type: 'text', text }],
  };
  if (structuredContent !== undefined) {
    payload.structuredContent = structuredContent;
  }
  if (isError) {
    payload.isError = true;
  }
  return payload;
}

function mimeTypeFor(path) {
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.yaml')) return 'application/yaml';
  return 'text/markdown';
}

function executeTool(name, args = {}, bundle = OSM_BUNDLE) {
  if (args !== null && (typeof args !== 'object' || Array.isArray(args))) {
    return toolText('Tool arguments must be a JSON object.', undefined, true);
  }
  const safeArgs = args ?? {};

  switch (name) {
    case 'osm_get_setup_guide': {
      const includeBridge = safeArgs.include_bridge !== false;
      const skill = bundle.skills.find((entry) => entry.name === 'osm-setup');
      const setupFile = bundle.files['skills/osm-setup/SKILL.md'];
      const bridgeFile = bundle.files['skills/osm-data-context/assets/bridge.md'];

      const sections = [
        `# OSM Setup Guide (OSM ${bundle.version} · osm-setup ${skill.version})`,
        `Release: ${bundle.release_url}`,
        `SHA-256 (skills/osm-setup/SKILL.md): ${setupFile.sha256}`,
        `Supporting setup references: ${skill.references.join(', ')}`,
        '',
        setupFile.content.trimEnd(),
      ];

      if (includeBridge && bridgeFile) {
        sections.push(
          '',
          '---',
          '## Short host bridge template (skills/osm-data-context/assets/bridge.md)',
          `SHA-256: ${bridgeFile.sha256}`,
          '',
          bridgeFile.content.trimEnd(),
        );
      }

      return toolText(sections.join('\n'), {
        package_version: bundle.version,
        release_tag: bundle.release_tag,
        release_url: bundle.release_url,
        skill_name: 'osm-setup',
        skill_version: skill.version,
        sha256: setupFile.sha256,
        references: skill.references,
        bridge_path: includeBridge ? 'skills/osm-data-context/assets/bridge.md' : null,
      });
    }

    case 'osm_list_skills': {
      const summary = {
        package: bundle.name,
        version: bundle.version,
        release_tag: bundle.release_tag,
        release_url: bundle.release_url,
        bundle_sha256: bundle.bundle_sha256,
        skills: bundle.skills.map((skill) => ({
          name: skill.name,
          version: skill.version,
          description: skill.description,
          sha256: skill.sha256,
          reference_count: skill.references.length,
        })),
        reference_folders: bundle.reference_folders.map((folder) => ({
          name: folder.name,
          index: folder.index,
          file_count: folder.files.length,
        })),
        overview_path: 'docs/osm.md',
        privacy: PRIVACY_POLICY,
      };
      return toolText(JSON.stringify(summary, null, 2), summary);
    }

    case 'osm_get_skill': {
      const skillName = typeof safeArgs.name === 'string' ? safeArgs.name.trim() : '';
      if (!skillName) {
        return toolText(
          `Missing required "name". Valid skills: ${bundle.skills.map((s) => s.name).join(', ')}`,
          undefined,
          true,
        );
      }
      const skill = bundle.skills.find((entry) => entry.name === skillName);
      if (!skill) {
        return toolText(
          `Unknown OSM skill "${skillName}". Valid skills: ${bundle.skills.map((s) => s.name).join(', ')}`,
          undefined,
          true,
        );
      }
      const file = bundle.files[skill.path];
      const header = [
        `<!-- OSM ${bundle.version} | ${skill.name} ${skill.version} | ${skill.path} | sha256:${skill.sha256} -->`,
        skill.references.length > 0
          ? `<!-- Supporting references (read with osm_get_reference): ${skill.references.join(', ')} -->`
          : '<!-- Supporting references: none -->',
        '',
        file.content.trimEnd(),
      ].join('\n');

      return toolText(header, {
        package_version: bundle.version,
        name: skill.name,
        version: skill.version,
        path: skill.path,
        sha256: skill.sha256,
        references: skill.references,
      });
    }

    case 'osm_get_reference': {
      const requestedPath = typeof safeArgs.path === 'string' ? safeArgs.path.trim() : '';
      if (!requestedPath) {
        return toolText(
          'Missing required "path" (for example "docs/osm.md" or "skills/osm-setup/references/credentials.md").',
          undefined,
          true,
        );
      }
      // Strict exact-key lookup against the immutable bundle; prevents any path traversal.
      if (!Object.prototype.hasOwnProperty.call(bundle.files, requestedPath)) {
        return toolText(
          `Reference not found in OSM ${bundle.version} bundle: "${requestedPath}". ` +
            'Call osm_list_skills or osm_get_skill to inspect valid relative paths.',
          undefined,
          true,
        );
      }
      const file = bundle.files[requestedPath];
      const text = [
        `<!-- OSM ${bundle.version} | ${requestedPath} | sha256:${file.sha256} -->`,
        '',
        file.content.trimEnd(),
      ].join('\n');

      return toolText(text, {
        package_version: bundle.version,
        path: requestedPath,
        sha256: file.sha256,
        bytes: file.bytes,
      });
    }

    case 'osm_version': {
      const info = {
        name: bundle.name,
        version: bundle.version,
        release_tag: bundle.release_tag,
        repository: bundle.repository,
        release_url: bundle.release_url,
        license: bundle.license,
        bundle_sha256: bundle.bundle_sha256,
        skill_count: bundle.skill_count,
        file_count: bundle.file_count,
        privacy: PRIVACY_POLICY,
      };
      return toolText(JSON.stringify(info, null, 2), info);
    }

    default:
      return null;
  }
}

function listResources(bundle = OSM_BUNDLE) {
  const resources = [
    {
      uri: 'osm://overview',
      name: 'OSM Overview (docs/osm.md)',
      description: `Versioned overview for OSM ${bundle.version}.`,
      mimeType: 'text/markdown',
    },
  ];
  for (const skill of bundle.skills) {
    resources.push({
      uri: `osm://skill/${skill.name}`,
      name: `${skill.name} (${skill.version})`,
      description: skill.description,
      mimeType: 'text/markdown',
    });
  }
  for (const filePath of Object.keys(bundle.files)) {
    if (filePath === 'docs/osm.md' || filePath.endsWith('/SKILL.md')) continue;
    resources.push({
      uri: `osm://ref/${filePath}`,
      name: filePath,
      description: `Bundled OSM ${bundle.version} reference file.`,
      mimeType: mimeTypeFor(filePath),
    });
  }
  return resources;
}

function readResource(uri, bundle = OSM_BUNDLE) {
  if (typeof uri !== 'string') return null;
  if (uri === 'osm://overview') {
    const file = bundle.files['docs/osm.md'];
    return {
      uri,
      mimeType: 'text/markdown',
      text: file.content,
    };
  }
  if (uri.startsWith('osm://skill/')) {
    const skillName = uri.slice('osm://skill/'.length);
    const skill = bundle.skills.find((entry) => entry.name === skillName);
    if (!skill) return null;
    return {
      uri,
      mimeType: 'text/markdown',
      text: bundle.files[skill.path].content,
    };
  }
  if (uri.startsWith('osm://ref/')) {
    const relPath = uri.slice('osm://ref/'.length);
    if (!Object.prototype.hasOwnProperty.call(bundle.files, relPath)) return null;
    return {
      uri,
      mimeType: mimeTypeFor(relPath),
      text: bundle.files[relPath].content,
    };
  }
  return null;
}

export function handleJsonRpcMessage(message, bundle = OSM_BUNDLE) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return jsonRpcError(null, -32600, 'Invalid Request');
  }
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return jsonRpcError(message.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request');
  }

  const isNotification = message.id === undefined;
  const { id, method, params } = message;

  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return null;
  }

  if (method === 'initialize') {
    const requestedVersion =
      params && typeof params.protocolVersion === 'string' ? params.protocolVersion : null;
    const protocolVersion =
      requestedVersion && SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
        ? requestedVersion
        : SUPPORTED_PROTOCOL_VERSIONS[0];

    return jsonRpcResult(id, {
      protocolVersion,
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
        prompts: { listChanged: false },
      },
      serverInfo: {
        name: 'osm-mcp',
        title: 'The Onlinesourdough Method (OSM)',
        version: bundle.version,
      },
      instructions: SERVER_INSTRUCTIONS,
    });
  }

  if (method === 'ping') {
    return jsonRpcResult(id, {});
  }

  if (method === 'tools/list') {
    return jsonRpcResult(id, { tools: TOOL_DEFINITIONS });
  }

  if (method === 'tools/call') {
    const toolName = params && typeof params.name === 'string' ? params.name : '';
    const toolArgs = params && params.arguments !== undefined ? params.arguments : {};
    const result = executeTool(toolName, toolArgs, bundle);
    if (result === null) {
      return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
    }
    return jsonRpcResult(id, result);
  }

  if (method === 'resources/list') {
    return jsonRpcResult(id, { resources: listResources(bundle) });
  }

  if (method === 'resources/read') {
    const uri = params && typeof params.uri === 'string' ? params.uri : '';
    const resource = readResource(uri, bundle);
    if (!resource) {
      return jsonRpcError(id, -32002, `Resource not found: ${uri}`);
    }
    return jsonRpcResult(id, { contents: [resource] });
  }

  if (method === 'prompts/list') {
    return jsonRpcResult(id, {
      prompts: [
        {
          name: 'osm-setup',
          description: 'Set up or resume your Notion AI operating model using The Onlinesourdough Method.',
          arguments: [],
        },
      ],
    });
  }

  if (method === 'prompts/get') {
    const promptName = params && typeof params.name === 'string' ? params.name : '';
    if (promptName !== 'osm-setup') {
      return jsonRpcError(id, -32602, `Unknown prompt: ${promptName}`);
    }
    const setupFile = bundle.files['skills/osm-setup/SKILL.md'];
    return jsonRpcResult(id, {
      description: 'Official OSM Setup instructions.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              `Follow the official OSM ${bundle.version} setup guide below (and use the user's official Notion connector for workspace access):\n\n` +
              setupFile.content,
          },
        },
      ],
    });
  }

  if (isNotification) {
    return null;
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Accept, MCP-Protocol-Version',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Web-standard Fetch API handler for both Cloudflare Workers and local Node HTTP.
 */
export async function handleHttpRequest(request, bundle = OSM_BUNDLE) {
  const url = new URL(request.url);
  const { pathname } = url;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Reject credentials explicitly so callers never accidentally send Notion tokens or cookies here.
  if (request.headers.get('authorization') || request.headers.get('cookie')) {
    return jsonResponse(
      {
        error: 'credentials_not_accepted',
        message:
          'OSM MCP is public, stateless, and login-free. Do not send Authorization headers, API tokens, or cookies.',
      },
      400,
    );
  }

  if ((pathname === '/' || pathname === '/health') && request.method === 'GET') {
    return jsonResponse({
      name: 'osm-mcp',
      package: bundle.name,
      version: bundle.version,
      release_tag: bundle.release_tag,
      release_url: bundle.release_url,
      repository: bundle.repository,
      bundle_sha256: bundle.bundle_sha256,
      skill_count: bundle.skill_count,
      file_count: bundle.file_count,
      endpoints: {
        mcp: '/mcp',
        pinned_mcp: `/v${bundle.version}/mcp`,
        health: '/health',
      },
      privacy: PRIVACY_POLICY,
    });
  }

  const versionedMatch = pathname.match(/^\/v(\d+\.\d+\.\d+)\/mcp$/);
  if (versionedMatch && versionedMatch[1] !== bundle.version) {
    return jsonResponse(
      {
        error: 'version_not_served',
        requested_version: versionedMatch[1],
        served_version: bundle.version,
        pinned_endpoint: `/v${bundle.version}/mcp`,
        release_url: bundle.release_url,
      },
      404,
    );
  }

  const isMcpRoute = pathname === '/mcp' || Boolean(versionedMatch);
  if (!isMcpRoute) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  if (request.method === 'GET') {
    return new Response(null, {
      status: 405,
      headers: {
        ...CORS_HEADERS,
        allow: 'POST, OPTIONS',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers: {
        ...CORS_HEADERS,
        allow: 'POST, OPTIONS',
      },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(jsonRpcError(null, -32700, 'Parse error: expected valid JSON'), 400);
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return jsonResponse(jsonRpcError(null, -32600, 'Invalid Request: empty batch'), 400);
    }
    const responses = payload
      .map((item) => handleJsonRpcMessage(item, bundle))
      .filter((item) => item !== null);
    if (responses.length === 0) {
      return new Response(null, { status: 202, headers: CORS_HEADERS });
    }
    return jsonResponse(responses, 200);
  }

  const response = handleJsonRpcMessage(payload, bundle);
  if (response === null) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return jsonResponse(response, 200);
}
