import json
import hashlib
import asyncpg
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


class CryptographicAuditLogger:
    """
    Hash-chained audit ledger for real institutional events — request
    escalations, faculty approvals/rejections, completed policy lookups.

    Every call to log_decision() tries to persist to Postgres
    (`cryptographic_audit_log`) first, since that's durable across restarts.
    If the database is unreachable (e.g. no Postgres running locally), the
    record is appended to an in-memory hash chain instead so the ledger
    keeps working during local development.

    Importantly: the in-memory chain only ever grows from real calls to
    log_decision(). Nothing seeds it with placeholder/demo rows, so whatever
    the ledger shows always corresponds to an actual request or decision
    that happened in this process.
    """

    def __init__(self, db_url: str):
        self.db_url = db_url
        self._memory_log: List[Dict[str, Any]] = []

    # ─── Postgres helpers ───
    async def _get_last_record_hash(self, conn: asyncpg.Connection) -> str:
        query = "SELECT record_hash FROM cryptographic_audit_log ORDER BY sequence_id DESC LIMIT 1;"
        row = await conn.fetchrow(query)
        return row["record_hash"] if row else GENESIS_HASH

    def _compute_sha256(self, previous_hash: str, thread_id: str, actor_id: str,
                        decision: str, action_type: str, payload_json: str) -> str:
        raw_data = f"{previous_hash}|{thread_id}|{actor_id}|{decision}|{action_type}|{payload_json}"
        return hashlib.sha256(raw_data.encode("utf-8")).hexdigest()

    # ─── In-memory fallback helpers (real events only, never seeded) ───
    def _memory_last_hash(self) -> str:
        return self._memory_log[-1]["record_hash"] if self._memory_log else GENESIS_HASH

    def _memory_append(self, thread_id: str, actor_id: str, decision: str, action_type: str,
                        action_payload: Dict[str, Any], payload_json: str) -> Dict[str, Any]:
        prev_hash = self._memory_last_hash()
        curr_hash = self._compute_sha256(prev_hash, thread_id, actor_id, decision, action_type, payload_json)
        record = {
            "sequence_id": len(self._memory_log) + 1,
            "thread_id": thread_id,
            "actor_id": actor_id,
            "decision": decision,
            "action_type": action_type,
            "action_payload": action_payload,
            "previous_hash": prev_hash,
            "record_hash": curr_hash,
            "created_at": datetime.now(timezone.utc).isoformat() + "Z",
        }
        self._memory_log.append(record)
        return record

    def _verify_memory_chain(self) -> Dict[str, Any]:
        expected_previous = GENESIS_HASH
        for record in self._memory_log:
            if record["previous_hash"] != expected_previous:
                return {"status": "CORRUPTED", "error": f"Chain broken at Sequence #{record['sequence_id']}"}
            payload_json = json.dumps(record["action_payload"], sort_keys=True)
            recomputed = self._compute_sha256(
                record["previous_hash"], record["thread_id"], record["actor_id"],
                record["decision"], record["action_type"], payload_json,
            )
            if recomputed != record["record_hash"]:
                return {"status": "TAMPERED", "error": f"Hash mismatch at Sequence #{record['sequence_id']}"}
            expected_previous = record["record_hash"]
        return {"status": "VALID", "total_records_verified": len(self._memory_log)}

    # ─── Public API ───
    async def log_decision(self, thread_id: str, actor_id: str, decision: str,
                            action_type: str, action_payload: Dict[str, Any]) -> Dict[str, Any]:
        payload_json = json.dumps(action_payload, sort_keys=True)

        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            record = self._memory_append(thread_id, actor_id, decision, action_type, action_payload, payload_json)
            return {
                "sequence_id": record["sequence_id"],
                "thread_id": thread_id,
                "decision": decision,
                "previous_hash": record["previous_hash"],
                "record_hash": record["record_hash"],
                "timestamp": record["created_at"],
                "storage": "memory",
            }

        try:
            async with conn.transaction():
                prev_hash = await self._get_last_record_hash(conn)
                curr_hash = self._compute_sha256(prev_hash, thread_id, actor_id, decision, action_type, payload_json)
                insert_query = """
                    INSERT INTO cryptographic_audit_log (
                        thread_id, actor_id, decision, action_type,
                        action_payload, previous_hash, record_hash
                    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
                    RETURNING sequence_id, created_at;
                """
                record = await conn.fetchrow(insert_query, thread_id, actor_id, decision, action_type, payload_json, prev_hash, curr_hash)
                return {
                    "sequence_id": record["sequence_id"],
                    "thread_id": thread_id,
                    "decision": decision,
                    "previous_hash": prev_hash,
                    "record_hash": curr_hash,
                    "timestamp": record["created_at"].isoformat(),
                    "storage": "postgres",
                }
        except Exception:
            # Table missing, connection dropped mid-write, etc. Fall back to
            # the real in-memory chain rather than losing the event.
            record = self._memory_append(thread_id, actor_id, decision, action_type, action_payload, payload_json)
            return {
                "sequence_id": record["sequence_id"],
                "thread_id": thread_id,
                "decision": decision,
                "previous_hash": record["previous_hash"],
                "record_hash": record["record_hash"],
                "timestamp": record["created_at"],
                "storage": "memory",
            }
        finally:
            await conn.close()

    async def get_records(self, limit: Optional[int] = None) -> Dict[str, Any]:
        """Return real audit records — Postgres if reachable, otherwise the
        in-memory fallback chain. Never returns seeded/placeholder data."""
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            records = list(self._memory_log)
            if limit:
                records = records[-limit:]
            return {"source": "memory", "records": records}

        try:
            rows = await conn.fetch("SELECT * FROM cryptographic_audit_log ORDER BY sequence_id ASC;")
            records = [dict(r) for r in rows]
            if limit:
                records = records[-limit:]
            return {"source": "postgres", "records": records}
        except Exception:
            records = list(self._memory_log)
            if limit:
                records = records[-limit:]
            return {"source": "memory", "records": records}
        finally:
            await conn.close()

    async def verify_chain_integrity(self) -> Dict[str, Any]:
        try:
            conn = await asyncpg.connect(self.db_url)
        except Exception:
            return self._verify_memory_chain()

        try:
            rows = await conn.fetch("SELECT * FROM cryptographic_audit_log ORDER BY sequence_id ASC;")
            if not rows:
                # Nothing persisted in Postgres yet (e.g. table exists but is
                # empty because every write so far fell back to memory) —
                # check the in-memory chain instead of reporting an empty
                # "VALID, 0 records" against a chain that actually has data.
                return self._verify_memory_chain()
            expected_previous = GENESIS_HASH
            for row in rows:
                if row["previous_hash"] != expected_previous:
                    return {"status": "CORRUPTED", "error": f"Chain broken at Sequence #{row['sequence_id']}"}
                payload_json = json.dumps(json.loads(row["action_payload"]), sort_keys=True)
                recomputed = self._compute_sha256(row["previous_hash"], row["thread_id"], row["actor_id"], row["decision"], row["action_type"], payload_json)
                if recomputed != row["record_hash"]:
                    return {"status": "TAMPERED", "error": f"Hash mismatch at Sequence #{row['sequence_id']}"}
                expected_previous = row["record_hash"]
            return {"status": "VALID", "total_records_verified": len(rows)}
        except Exception:
            return self._verify_memory_chain()
        finally:
            await conn.close()

    async def purge(self) -> None:
        """Clears the audit trail — Postgres table (if reachable) and the
        in-memory fallback chain. Intended for local development/testing,
        not for production use."""
        try:
            conn = await asyncpg.connect(self.db_url)
            try:
                await conn.execute("TRUNCATE cryptographic_audit_log RESTART IDENTITY;")
            finally:
                await conn.close()
        except Exception:
            pass
        self._memory_log = []

