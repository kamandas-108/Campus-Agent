import json
import hashlib
import asyncpg
from typing import Dict, Any

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

class CryptographicAuditLogger:
    def __init__(self, db_url: str):
        self.db_url = db_url

    async def _get_last_record_hash(self, conn: asyncpg.Connection) -> str:
        query = "SELECT record_hash FROM cryptographic_audit_log ORDER BY sequence_id DESC LIMIT 1;"
        row = await conn.fetchrow(query)
        return row["record_hash"] if row else GENESIS_HASH

    def _compute_sha256(self, previous_hash: str, thread_id: str, actor_id: str, 
                        decision: str, action_type: str, payload_json: str) -> str:
        raw_data = f"{previous_hash}|{thread_id}|{actor_id}|{decision}|{action_type}|{payload_json}"
        return hashlib.sha256(raw_data.encode("utf-8")).hexdigest()

    async def log_decision(self, thread_id: str, actor_id: str, decision: str, 
                            action_type: str, action_payload: Dict[str, Any]) -> Dict[str, Any]:
        payload_json = json.dumps(action_payload, sort_keys=True)
        conn = await asyncpg.connect(self.db_url)
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
                    "timestamp": record["created_at"].isoformat()
                }
        finally:
            await conn.close()

    async def verify_chain_integrity(self) -> Dict[str, Any]:
        conn = await asyncpg.connect(self.db_url)
        try:
            rows = await conn.fetch("SELECT * FROM cryptographic_audit_log ORDER BY sequence_id ASC;")
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
        finally:
            await conn.close()
