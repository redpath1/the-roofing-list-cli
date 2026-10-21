// Argument parsing and output for the theroofinglist command.

import { parseArgs } from 'node:util';
import { ApiError, VERSION, getContractor, searchContractors } from './api.js';
import { formatContractor, formatSearch } from './format.js';

const TRADES = ['roofing', 'siding', 'gutters'];

export const USAGE = `theroofinglist ${VERSION}
Find checked US roofing, siding and gutter contractors by city.

Usage:
  theroofinglist search --trade <trade> --city <name> --state <state> [--limit N] [--json]
  theroofinglist get <id> [--json]
  theroofinglist help

Options:
  --trade    roofing, siding or gutters
  --city     a US city name, for example Austin
  --state    a USPS code (TX) or a full name (Texas)
  --limit    how many results, 1 to 25 (default 10)
  --json     print the raw API answer as JSON
  -h, --help     show this help
  -v, --version  show the version

Examples:
  theroofinglist search --trade roofing --city Austin --state TX --limit 5
  theroofinglist get 510

You can also run it as "roofers".

Data: https://theroofinglist.com/mcp/`;

class UsageError extends Error {}

const OPTIONS = {
  trade: { type: 'string' },
  city: { type: 'string' },
  state: { type: 'string' },
  limit: { type: 'string' },
  json: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  version: { type: 'boolean', short: 'v', default: false },
};

function parse(argv) {
  try {
    return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (err) {
    throw new UsageError(err.message);
  }
}

function checkSearch(values, positionals) {
  if (positionals.length > 1) throw new UsageError(`Unexpected argument "${positionals[1]}".`);
  const { trade, city, state, limit } = values;
  if (!trade) throw new UsageError('Missing --trade.');
  if (!TRADES.includes(trade)) {
    throw new UsageError(`Unknown trade "${trade}". Use roofing, siding or gutters.`);
  }
  if (!city || !city.trim()) throw new UsageError('Missing --city.');
  if (!state || !state.trim()) throw new UsageError('Missing --state.');
  const params = { trade, city: city.trim(), state: state.trim() };
  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 25) {
      throw new UsageError(`--limit must be a whole number from 1 to 25, not "${limit}".`);
    }
    params.limit = n;
  }
  return params;
}

function checkGet(values, positionals) {
  for (const key of ['trade', 'city', 'state', 'limit']) {
    if (values[key] !== undefined) throw new UsageError(`get does not take --${key}.`);
  }
  if (positionals.length < 2) throw new UsageError('Missing contractor id.');
  if (positionals.length > 2) throw new UsageError(`Unexpected argument "${positionals[2]}".`);
  const id = positionals[1];
  if (!/^[1-9]\d*$/.test(id)) throw new UsageError(`The id must be a positive whole number, not "${id}".`);
  return id;
}

function apiErrorText(err) {
  if (err.status === 429) {
    const wait =
      err.retryAfter !== undefined
        ? `Wait ${err.retryAfter} second${err.retryAfter === 1 ? '' : 's'} and try again.`
        : 'Wait a minute and try again.';
    return `Too many requests. ${wait}`;
  }
  return err.message;
}

/**
 * Run the CLI. Returns the exit code: 0 success, 1 API or network error, 2 usage error.
 * io lets tests capture output and stub fetch.
 */
export async function main(argv, io = {}) {
  const out = io.stdout ?? ((s) => process.stdout.write(s + '\n'));
  const err = io.stderr ?? ((s) => process.stderr.write(s + '\n'));
  const fetchImpl = io.fetch;

  try {
    const { values, positionals } = parse(argv);
    if (values.version) {
      out(VERSION);
      return 0;
    }
    const command = positionals[0];
    if (values.help || command === undefined || command === 'help') {
      out(USAGE);
      return 0;
    }

    if (command === 'search') {
      const params = checkSearch(values, positionals);
      const body = await searchContractors(params, fetchImpl);
      out(values.json ? JSON.stringify(body, null, 2) : formatSearch(body, params));
      return 0;
    }
    if (command === 'get') {
      const id = checkGet(values, positionals);
      const body = await getContractor(id, fetchImpl);
      out(values.json ? JSON.stringify(body, null, 2) : formatContractor(body));
      return 0;
    }
    throw new UsageError(`Unknown command "${command}".`);
  } catch (e) {
    if (e instanceof UsageError) {
      err(`Error: ${e.message}`);
      err('Run "theroofinglist --help" to see usage.');
      return 2;
    }
    if (e instanceof ApiError) {
      err(`Error: ${apiErrorText(e)}`);
      return 1;
    }
    err(`Error: ${e?.message ?? e}`);
    return 1;
  }
}
