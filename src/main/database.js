import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { getRegistryValue } from './registry.js';

let db;

export function getDatabasePath() {
  const defaultDir = app.getPath('userData');
  if (!app.isPackaged) {
    return path.join(defaultDir, 'stratagem_intel.db');
  }
  const customDir = getRegistryValue('DatabasePath', defaultDir);
  if (!fs.existsSync(customDir)) {
    try {
      fs.mkdirSync(customDir, { recursive: true });
    } catch (e) {}
  }
  return path.join(customDir, 'stratagem_intel.db');
}

export function initDatabase() {
  const dbPath = getDatabasePath();
  console.log(`[Database] Mounting SQLITE Matrix at: ${dbPath}`);
  
  const sqlite3Verbose = sqlite3.verbose();
  db = new sqlite3Verbose.Database(dbPath, (err) => {
    if (err) {
      console.error('[Database] Connection error:', err.message);
    } else {
      console.log('[Database] Connected to stratagem_intel.db SQLite database.');
    }
  });

  db.serialize(() => {
    // We DO NOT drop tables here. We ensure they exist.
    
    // Config Table
    db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Missions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        temporal_boundary TEXT,
        threat_level TEXT,
        status TEXT,
        classifications TEXT,
        is_rescheduled INTEGER DEFAULT 0,
        initiated_at TEXT,
        rescheduled_at TEXT,
        resolution_comment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit Log Table
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id INTEGER,
        action TEXT,
        description TEXT,
        logged_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mission_id) REFERENCES missions(id) ON DELETE CASCADE
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_missions_created_at ON missions(created_at)`);

    // Table creation complete. Seeding is controlled manually by renderer boot screen choice.
  });
}

export function seedDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }

    db.serialize(() => {
      const now = Date.now();
      const oneDay = 24 * 3600 * 1000;

      const execData = [
        { title: "COGNITIVE CORE SYNCHRONIZATION", days: 3, threat: "HIGH", tags: "NEURAL,COGNITIVE" },
        { title: "FIREWALL SECURITY DEPLOYMENT", days: 5, threat: "MED", tags: "DEFENSE,ROUTING" },
        { title: "QUANTUM INTERFACE HANDSHAKE", days: 1, threat: "HIGH", tags: "QUANTUM,SECURE" }
      ];

      let completed = 0;
      let rejected = false;

      execData.forEach(item => {
        const deadline = new Date(now + item.days * oneDay).toISOString().split('T')[0];
        db.run(
          `INSERT INTO missions (title, temporal_boundary, threat_level, status, classifications, initiated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [item.title, deadline, item.threat, 'EXECUTION', item.tags, new Date().toISOString()],
          (err) => {
            if (rejected) return;
            if (err) {
              rejected = true;
              reject(err);
              return;
            }
            completed++;
            if (completed === execData.length) {
              resolve({ success: true });
            }
          }
        );
      });
    });
  });
}

export function getConfig() {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.all("SELECT * FROM config", [], (err, rows) => {
      if (err) reject(err);
      else {
        const config = {};
        rows.forEach(row => {
          config[row.key] = row.value === 'true' ? true : (row.value === 'false' ? false : row.value);
        });
        
        // Fetch registry overrides for installer settings
        config.githubUrl = getRegistryValue('GithubUrl', getRegistryValue('githubUrl', config.githubUrl || 'https://github.com/karansinghverma979/'));
        config.emailAddress = getRegistryValue('EmailAddress', getRegistryValue('emailAddress', getRegistryValue('Email', config.emailAddress || 'karansinghverma979@gmail.com')));
        config.linkedinUrl = getRegistryValue('LinkedinUrl', getRegistryValue('linkedinUrl', config.linkedinUrl || 'https://www.linkedin.com/in/karansinghverma979/'));
        
        resolve(config);
      }
    });
  });
}

export function setConfig(key, value) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    const valStr = String(value);
    db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, valStr], (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

export function insertMission(mission) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    const { title, temporal_boundary, threat_level, status, classifications } = mission;
    const tbUpper = (temporal_boundary || '').trim().toUpperCase();
    const hasDeadline = temporal_boundary && tbUpper !== '' && tbUpper !== 'TBD' && tbUpper !== 'READY' && tbUpper !== 'DEPLOYED' && tbUpper !== 'NO DEADLINE';
    const initiatedAt = hasDeadline ? new Date().toISOString() : null;

    const query = `
      INSERT INTO missions (title, temporal_boundary, threat_level, status, classifications, initiated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [title, temporal_boundary, threat_level, status, classifications || '', initiatedAt], function(err) {
      if (err) {
        reject(err);
      } else {
        const newId = this.lastID;
        appendAuditLog(newId, 'INITIALIZE_CORE', `Tactical operations center authorized covert operation: "${title.toUpperCase()}" with threat level: ${threat_level || 'MED'}.`)
          .then(() => resolve({ id: newId, ...mission }))
          .catch(() => resolve({ id: newId, ...mission }));
      }
    });
  });
}

export function updateMissionStatus(id, status) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.run(`UPDATE missions SET status = ? WHERE id = ?`, [status, id], (err) => {
      if (err) {
        reject(err);
      } else {
        appendAuditLog(id, 'STATUS_UPDATE', `Tactical sector state transitioned to status: ${status.toUpperCase()}`)
          .then(() => resolve({ success: true }))
          .catch(() => resolve({ success: true }));
      }
    });
  });
}

export function updateMissionThreatLevel(id, threatLevel) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.run(`UPDATE missions SET threat_level = ? WHERE id = ?`, [threatLevel, id], (err) => {
      if (err) {
        reject(err);
      } else {
        appendAuditLog(id, 'THREAT_RECALIBRATION', `Threat parameters recalibrated to classification: ${threatLevel.toUpperCase()}`)
          .then(() => resolve({ success: true }))
          .catch(() => resolve({ success: true }));
      }
    });
  });
}

export function updateMissionDetails(id, title, classifications, threatLevel, deadline, status) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.get("SELECT initiated_at, temporal_boundary FROM missions WHERE id = ?", [id], (err, row) => {
      if (err) { reject(err); return; }
      if (!row) { reject(new Error("Mission not found")); return; }

      const initiatedAt = row.initiated_at;
      const oldDeadline = row.temporal_boundary;
      
      const tbUpper = (deadline || '').trim().toUpperCase();
      const hasDeadline = deadline && tbUpper !== '' && tbUpper !== 'TBD' && tbUpper !== 'READY' && tbUpper !== 'DEPLOYED' && tbUpper !== 'NO DEADLINE' && tbUpper !== 'CLOSED';
      
      let targetStatus = status;
      let targetInitiatedAt = initiatedAt;
      
      if (hasDeadline) {
        targetStatus = 'EXECUTION';
        if (!initiatedAt || initiatedAt === 'null' || oldDeadline === 'NO DEADLINE' || !oldDeadline) {
          targetInitiatedAt = new Date().toISOString();
        }
      }

      db.run(
        `UPDATE missions SET title = ?, classifications = ?, threat_level = ?, temporal_boundary = ?, status = ?, initiated_at = ? WHERE id = ?`,
        [title, classifications, threatLevel, deadline, targetStatus, targetInitiatedAt, id],
        (err2) => {
          if (err2) {
            reject(err2);
          } else {
            appendAuditLog(id, 'WEAPONIZED_UPDATE', `Tactical protocol details synchronized: Title: "${title.toUpperCase()}", Threat: ${threatLevel}, Boundary: ${deadline || 'NO DEADLINE'}, Status: ${targetStatus}`)
              .then(() => resolve({ success: true }))
              .catch(() => resolve({ success: true }));
          }
        }
      );
    });
  });
}

export function fetchSectorMissions() {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.all(`SELECT * FROM missions ORDER BY created_at DESC`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function updateMissionAsRescheduled(id, newDeadline) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not initialized')); return; }
    db.get("SELECT initiated_at, temporal_boundary, is_rescheduled FROM missions WHERE id = ?", [id], (err, row) => {
      if (err) { reject(err); return; }
      if (!row) { reject(new Error("Mission not found")); return; }

      const initiatedAt = row.initiated_at;
      const oldDeadline = row.temporal_boundary;
      const isRescheduled = row.is_rescheduled;
      
      const nowStr = new Date().toISOString();

      if (!initiatedAt || initiatedAt === 'null' || oldDeadline === 'NO DEADLINE' || !oldDeadline) {
        db.run(
          `UPDATE missions SET status = 'EXECUTION', temporal_boundary = ?, initiated_at = ?, is_rescheduled = 0 WHERE id = ?`,
          [newDeadline, nowStr, id],
          (err2) => {
            if (err2) {
              reject(err2);
            } else {
              appendAuditLog(id, 'TEMPORAL_ALIGNMENT', `Mission temporal boundary aligned to: ${newDeadline}`)
                .then(() => resolve({ success: true }))
                .catch(() => resolve({ success: true }));
            }
          }
        );
      } else {
        if (isRescheduled === 1) {
          reject(new Error("CONGESTION AVOIDED: TASK HAS ALREADY BEEN RESCHEDULED ONCE AND CANNOT BE REALIGNED AGAIN"));
          return;
        }

        db.run(
          `UPDATE missions SET status = 'EXECUTION', temporal_boundary = ?, is_rescheduled = 1, rescheduled_at = ? WHERE id = ?`,
          [newDeadline, nowStr, id],
          (err2) => {
            if (err2) {
              reject(err2);
            } else {
              appendAuditLog(id, 'TEMPORAL_REALIGNMENT', `Emergency realignment: temporal boundary adjusted to: ${newDeadline}`)
                .then(() => resolve({ success: true }))
                .catch(() => resolve({ success: true }));
            }
          }
        );
      }
    });
  });
}

export function validateDatabase(filePath) {
  return new Promise((resolve) => {
    const tempDb = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) { resolve({ success: false, error: 'INVALID_SQLITE_FILE' }); return; }
      tempDb.serialize(() => {
        tempDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='missions'", (err, row) => {
          if (err || !row) { tempDb.close(); resolve({ success: false, error: 'MISSING_MISSIONS_TABLE' }); return; }
          tempDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='config'", (err, row) => {
            if (err || !row) { tempDb.close(); resolve({ success: false, error: 'MISSING_CONFIG_TABLE' }); return; }
            tempDb.all("PRAGMA table_info(missions)", (err, columns) => {
              const columnNames = columns.map(c => c.name);
              const requiredColumns = ['id', 'title', 'temporal_boundary', 'threat_level', 'status', 'classifications', 'created_at'];
              if (!requiredColumns.every(col => columnNames.includes(col))) {
                tempDb.close(); resolve({ success: false, error: 'SCHEMA_MISMATCH' });
              } else {
                tempDb.all("SELECT status, COUNT(*) as count FROM missions GROUP BY status", (err, rows) => {
                  const breakdown = {};
                  let total = 0;
                  if (rows) rows.forEach(r => { breakdown[r.status] = r.count; total += r.count; });
                  tempDb.close();
                  resolve({ success: true, missionCount: total, breakdown });
                });
              }
            });
          });
        });
      });
    });
  });
}

export function importDatabaseFile(sourcePath) {
  return new Promise(async (resolve, reject) => {
    const validation = await validateDatabase(sourcePath);
    if (!validation.success) { resolve({ success: false, error: validation.error }); return; }
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else {
          const dbPath = getDatabasePath();
          fs.copyFileSync(sourcePath, dbPath);
          initDatabase();
          resolve({ success: true, missionCount: validation.missionCount });
        }
      });
    } else {
      const dbPath = getDatabasePath();
      fs.copyFileSync(sourcePath, dbPath);
      initDatabase();
      resolve({ success: true, missionCount: validation.missionCount });
    }
  });
}

export function purgeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database connection is not open')); return; }
    db.run("DELETE FROM missions", (err) => {
      if (err) reject(err);
      else {
        db.run("DELETE FROM audit_log", (err2) => {
          if (err2) reject(err2);
          else resolve({ success: true });
        });
      }
    });
  });
}

export function deleteMission(id) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database connection is not open')); return; }
    db.run("DELETE FROM missions WHERE id = ?", [id], (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

export function appendAuditLog(missionId, action, description) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not open')); return; }
    db.run(
      `INSERT INTO audit_log (mission_id, action, description) VALUES (?, ?, ?)`,
      [missionId, action, description || ''],
      (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      }
    );
  });
}

export function getAuditLog(missionId) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not open')); return; }
    db.all(
      `SELECT * FROM audit_log WHERE mission_id = ? ORDER BY logged_at DESC`,
      [missionId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export function updateResolutionComment(id, comment) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not open')); return; }
    db.run(
      `UPDATE missions SET resolution_comment = ? WHERE id = ?`,
      [comment || '', id],
      (err) => {
        if (err) {
          reject(err);
        } else {
          appendAuditLog(id, 'DEBRIEF_SUBMISSION', `Operator debrief logged: "${comment}"`)
            .then(() => resolve({ success: true }))
            .catch(() => resolve({ success: true }));
        }
      }
    );
  });
}

export function getMissionById(id) {
  return new Promise((resolve, reject) => {
    if (!db) { reject(new Error('Database not open')); return; }
    db.get(`SELECT * FROM missions WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function runDatabaseDiagnostics() {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'DATABASE_NOT_INITIALIZED', message: 'The Antaryami SQLite connection is not open.' });
      return;
    }

    db.get("PRAGMA integrity_check", [], (err, row) => {
      if (err) {
        resolve({ success: false, error: 'INTEGRITY_CHECK_FAILED', message: err.message });
        return;
      }
      if (!row || row.integrity_check !== 'ok') {
        resolve({ success: false, error: 'DATABASE_CORRUPT', message: `Database integrity check failed: ${row ? row.integrity_check : 'Unknown status'}` });
        return;
      }

      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err2, rows) => {
        if (err2) {
          resolve({ success: false, error: 'TABLE_DISCOVERY_FAILED', message: err2.message });
          return;
        }
        const tableNames = rows.map(r => r.name);
        if (!tableNames.includes('missions')) {
          resolve({ success: false, error: 'MISSING_MISSIONS_TABLE', message: 'Missions registry table was not found in schema.' });
          return;
        }
        if (!tableNames.includes('config')) {
          resolve({ success: false, error: 'MISSING_CONFIG_TABLE', message: 'Configuration table was not found in schema.' });
          return;
        }
        if (!tableNames.includes('audit_log')) {
          resolve({ success: false, error: 'MISSING_AUDIT_LOG_TABLE', message: 'Kernel immutable audit log table was not found in schema.' });
          return;
        }

        db.get("SELECT COUNT(*) as count FROM missions", [], (err3) => {
          if (err3) {
            resolve({ success: false, error: 'READ_QUERY_FAILED', message: `Unable to read missions table: ${err3.message}` });
            return;
          }
          resolve({ success: true, message: 'All database integrity, schema validation, and storage channels are operational.' });
        });
      });
    });
  });
}

export function verifyCoreSystem() {
  return new Promise((resolve) => {
    if (!process.versions.node || !process.versions.electron) {
      resolve({ success: false, error: 'ENVIRONMENT_UNFEASIBLE', message: 'The underlying Javascript runtime is corrupted or missing essential dependencies.' });
    } else {
      resolve({ success: true });
    }
  });
}

export function verifySqliteMount() {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'SQLITE_NOT_MOUNTED', message: 'SQLite database connection object is null or failed to initialize.' });
      return;
    }
    db.get("PRAGMA integrity_check", [], (err, row) => {
      if (err) {
        resolve({ success: false, error: 'PRAGMA_CHECK_FAILED', message: `Database file block read failure: ${err.message}` });
        return;
      }
      if (!row || row.integrity_check !== 'ok') {
        resolve({ success: false, error: 'DB_INTEGRITY_COMPROMISED', message: `Database structure is corrupted: ${row ? row.integrity_check : 'unknown'}` });
        return;
      }
      resolve({ success: true });
    });
  });
}

export function verifyHandshake() {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'SQLITE_NOT_MOUNTED', message: 'SQLite database connection object is null.' });
      return;
    }
    db.get("SELECT COUNT(*) as count FROM config", [], (err) => {
      if (err) {
        resolve({ success: false, error: 'CONFIG_UNREADABLE', message: `System settings table is corrupted or inaccessible: ${err.message}` });
        return;
      }
      resolve({ success: true });
    });
  });
}

export function mergeDatabaseFile(sourcePath) {
  return new Promise((resolve) => {
    const tempDb = new sqlite3.Database(sourcePath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        resolve({ success: false, error: 'INVALID_SQLITE_FILE', message: err.message });
        return;
      }

      tempDb.all("SELECT * FROM missions", [], (err2, rows) => {
        if (err2) {
          tempDb.close();
          resolve({ success: false, error: 'QUERY_FAILED', message: err2.message });
          return;
        }

        if (!rows || rows.length === 0) {
          tempDb.close();
          resolve({ success: true, missionCount: 0 });
          return;
        }

        // Begin a transaction so the entire merge either succeeds or rolls back atomically.
        db.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) {
            tempDb.close();
            resolve({ success: false, error: 'TRANSACTION_FAILED', message: beginErr.message });
            return;
          }

          let mergedCount = 0;
          let processedCount = 0;
          let failed = false;

          const finish = () => {
            if (processedCount < rows.length) return;
            if (failed) {
              db.run('ROLLBACK', () => {
                tempDb.close();
                resolve({ success: false, error: 'MERGE_PARTIAL_FAILURE', message: 'One or more missions could not be inserted. Transaction rolled back.' });
              });
            } else {
              db.run('COMMIT', (commitErr) => {
                tempDb.close();
                if (commitErr) {
                  resolve({ success: false, error: 'COMMIT_FAILED', message: commitErr.message });
                } else {
                  resolve({ success: true, missionCount: mergedCount });
                }
              });
            }
          };

          rows.forEach((row) => {
            db.get(
              "SELECT id FROM missions WHERE title = ? AND temporal_boundary = ? AND status = ?",
              [row.title, row.temporal_boundary, row.status],
              (err3, activeRow) => {
                if (err3) {
                  failed = true;
                  processedCount++;
                  finish();
                  return;
                }

                if (activeRow) {
                  // Duplicate found — skip
                  processedCount++;
                  finish();
                  return;
                }

                db.run(
                  `INSERT INTO missions (title, temporal_boundary, threat_level, status, classifications, is_rescheduled, initiated_at, rescheduled_at, resolution_comment, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    row.title,
                    row.temporal_boundary,
                    row.threat_level,
                    row.status,
                    row.classifications || '',
                    row.is_rescheduled || 0,
                    row.initiated_at,
                    row.rescheduled_at,
                    row.resolution_comment,
                    row.created_at
                  ],
                  function(err4) {
                    if (err4) {
                      failed = true;
                      processedCount++;
                      finish();
                      return;
                    }
                    mergedCount++;
                    const newId = this.lastID;
                    // Copy audit log entries for this mission
                    tempDb.all("SELECT * FROM audit_log WHERE mission_id = ?", [row.id], (err5, auditRows) => {
                      if (err5 || !auditRows || auditRows.length === 0) {
                        processedCount++;
                        finish();
                        return;
                      }

                      let insertedLogs = 0;
                      auditRows.forEach((auditRow) => {
                        db.run(
                          `INSERT INTO audit_log (mission_id, action, description, logged_at) VALUES (?, ?, ?, ?)`,
                          [newId, auditRow.action, auditRow.description, auditRow.logged_at],
                          (err6) => {
                            if (err6) {
                              failed = true;
                            }
                            insertedLogs++;
                            if (insertedLogs === auditRows.length) {
                              processedCount++;
                              finish();
                            }
                          }
                        );
                      });
                    });
                  }
                );
              }
            );
          });
        });
      });
    });
  });
}

