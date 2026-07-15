import { vi } from "vitest";

type Row = Record<string, unknown>;

interface MockState {
  filters: Array<(r: Row) => boolean>;
  updates?: Row;
  insertRow?: Row;
  orderCol?: string;
  orderAsc?: boolean;
  limitN?: number;
  countHead?: boolean;
  selectCols?: string;
}

export function createMockSupabase(initial: {
  codes?: Row[];
  logs?: Row[];
  profiles?: Row[];
  rpcResult?: unknown;
}) {
  const codes = [...(initial.codes || [])];
  const logs = [...(initial.logs || [])];
  const profiles = [...(initial.profiles || [])];
  let rpcResult = initial.rpcResult ?? null;

  const tableRows = (table: string) => {
    if (table === "email_verification_codes") return codes;
    if (table === "verification_request_log") return logs;
    if (table === "profiles") return profiles;
    return [];
  };

  const applyFilters = (rows: Row[], state: MockState) =>
    rows.filter((r) => state.filters.every((f) => f(r)));

  const resolveQuery = (table: string, state: MockState) => {
    let rows = applyFilters([...tableRows(table)], state);

    if (state.orderCol) {
      rows.sort((a, b) => {
        const av = String(a[state.orderCol!]);
        const bv = String(b[state.orderCol!]);
        return state.orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    if (state.limitN !== undefined) {
      rows = rows.slice(0, state.limitN);
    }

    if (state.updates) {
      const targets = applyFilters([...tableRows(table)], state);
      if (table === "email_verification_codes") {
        if (targets.length === 0 && state.filters.length === 1) {
          codes.forEach((c) => Object.assign(c, state.updates));
        } else {
          targets.forEach((t) => Object.assign(t, state.updates));
        }
      } else {
        targets.forEach((t) => Object.assign(t, state.updates));
      }
    }

    if (state.insertRow) {
      if (table === "verification_request_log") {
        logs.push({
          ...state.insertRow,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (state.countHead) {
      return { count: rows.length, error: null, data: null };
    }

    return { data: rows, error: null, count: rows.length };
  };

  const from = (table: string) => {
    const state: MockState = { filters: [] };
    const builder: Record<string, unknown> = {};

    const chain = () => builder;

    builder.select = vi.fn((cols?: string, opts?: { count?: string; head?: boolean }) => {
      state.selectCols = cols;
      if (opts?.head) state.countHead = true;
      return builder;
    });
    builder.eq = vi.fn((col: string, val: unknown) => {
      state.filters.push((r) => r[col] === val);
      return builder;
    });
    builder.is = vi.fn((col: string, val: null) => {
      state.filters.push((r) => (val === null ? r[col] == null : r[col] === val));
      return builder;
    });
    builder.gte = vi.fn((col: string, val: string) => {
      state.filters.push(
        (r) => new Date(String(r[col])).getTime() >= new Date(val).getTime()
      );
      return builder;
    });
    builder.order = vi.fn((col: string, opts?: { ascending?: boolean }) => {
      state.orderCol = col;
      state.orderAsc = opts?.ascending ?? true;
      return builder;
    });
    builder.limit = vi.fn((n: number) => {
      state.limitN = n;
      return builder;
    });
    builder.update = vi.fn((updates: Row) => {
      state.updates = updates;
      return builder;
    });
    builder.insert = vi.fn((row: Row) => {
      state.insertRow = row;
      return builder;
    });

    builder.single = vi.fn(async () => {
      if (table === "email_verification_codes" && state.insertRow) {
        const row = {
          id: "new-code-id",
          ...state.insertRow,
          attempt_count: 0,
          consumed_at: null,
        };
        codes.push(row);
        return { data: row, error: null };
      }
      const result = resolveQuery(table, state);
      return {
        data: Array.isArray(result.data) ? result.data[0] : result.data,
        error: null,
      };
    });

    builder.maybeSingle = vi.fn(async () => {
      const result = resolveQuery(table, state);
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      return { data: row ?? null, error: null };
    });

    Object.defineProperty(builder, "then", {
      configurable: true,
      value: (
        resolve: (v: unknown) => void,
        reject?: (e: unknown) => void
      ) => {
        try {
          resolve(resolveQuery(table, state));
        } catch (e) {
          reject?.(e);
        }
      },
    });

    return builder;
  };

  return {
    from,
    rpc: vi.fn(async () => ({ data: rpcResult, error: null })),
    auth: {
      admin: {
        updateUserById: vi.fn(async () => ({ data: {}, error: null })),
      },
    },
    setRpcResult: (value: unknown) => {
      rpcResult = value;
    },
    _codes: codes,
    _logs: logs,
    _profiles: profiles,
  };
}