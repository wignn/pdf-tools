use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentRecord {
    pub id: Option<i64>,
    pub title: String,
    pub file_path: String,
    pub file_name: String,
    pub file_size: i64,
    pub page_count: i32,
    pub archive_serial: Option<String>,
    pub date_created: String,
    pub correspondent: Option<String>,
    pub document_type: Option<String>,
    pub storage_path: String,
    pub tags: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn init_database() -> Result<Connection, rusqlite::Error> {
    let app_dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    
    let db_path = app_dir.join("documents.db");
    let conn = Connection::open(db_path)?;
    
    conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -64000;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 30000000000;
        PRAGMA busy_timeout = 5000;
    ")?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            file_path TEXT NOT NULL UNIQUE,
            file_name TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            page_count INTEGER NOT NULL,
            archive_serial TEXT,
            date_created TEXT NOT NULL,
            correspondent TEXT,
            document_type TEXT,
            storage_path TEXT NOT NULL DEFAULT 'Default',
            tags TEXT NOT NULL DEFAULT '[]',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    
    conn.execute("CREATE INDEX IF NOT EXISTS idx_title ON documents(title)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_name ON documents(file_name)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_date_created ON documents(date_created)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_document_type ON documents(document_type)", [])?;
    
    Ok(conn)
}

pub fn get_db() -> Result<Connection, String> {
    init_database().map_err(|e| format!("Database error: {}", e))
}

pub fn save_document(doc: &DocumentRecord) -> Result<i64, String> {
    let conn = get_db()?;
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "INSERT INTO documents (
            title, file_path, file_name, file_size, page_count,
            archive_serial, date_created, correspondent, document_type,
            storage_path, tags, notes, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
        ON CONFLICT(file_path) DO UPDATE SET
            title = ?1,
            file_name = ?3,
            file_size = ?4,
            page_count = ?5,
            archive_serial = ?6,
            date_created = ?7,
            correspondent = ?8,
            document_type = ?9,
            storage_path = ?10,
            tags = ?11,
            notes = ?12,
            updated_at = ?14",
        params![
            doc.title,
            doc.file_path,
            doc.file_name,
            doc.file_size,
            doc.page_count,
            doc.archive_serial,
            doc.date_created,
            doc.correspondent,
            doc.document_type,
            doc.storage_path,
            doc.tags,
            doc.notes,
            now,
            now,
        ],
    ).map_err(|e| format!("Failed to save document: {}", e))?;
    
    Ok(conn.last_insert_rowid())
}

pub fn get_documents(
    search: Option<String>,
    document_type: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<DocumentRecord>, String> {
    let conn = get_db()?;
    
    let mut query = String::from(
        "SELECT id, title, file_path, file_name, file_size, page_count,
                archive_serial, date_created, correspondent, document_type,
                storage_path, tags, notes, created_at, updated_at
         FROM documents WHERE 1=1"
    );
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(s) = &search {
        query.push_str(" AND (title LIKE ?1 OR file_name LIKE ?1 OR tags LIKE ?1)");
        params.push(Box::new(format!("%{}%", s)));
    }
    
    if let Some(dt) = &document_type {
        query.push_str(&format!(" AND document_type = ?{}", params.len() + 1));
        params.push(Box::new(dt.clone()));
    }
    
    query.push_str(" ORDER BY updated_at DESC");
    
    if let Some(l) = limit {
        query.push_str(&format!(" LIMIT {}", l));
    }
    
    if let Some(o) = offset {
        query.push_str(&format!(" OFFSET {}", o));
    }
    
    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    
    let docs = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(DocumentRecord {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            file_path: row.get(2)?,
            file_name: row.get(3)?,
            file_size: row.get(4)?,
            page_count: row.get(5)?,
            archive_serial: row.get(6)?,
            date_created: row.get(7)?,
            correspondent: row.get(8)?,
            document_type: row.get(9)?,
            storage_path: row.get(10)?,
            tags: row.get(11)?,
            notes: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    })
    .map_err(|e| format!("Failed to query documents: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect documents: {}", e))?;
    
    Ok(docs)
}

/// Get single document by ID
pub fn get_document_by_id(id: i64) -> Result<DocumentRecord, String> {
    let conn = get_db()?;
    
    let doc = conn.query_row(
        "SELECT id, title, file_path, file_name, file_size, page_count,
                archive_serial, date_created, correspondent, document_type,
                storage_path, tags, notes, created_at, updated_at
         FROM documents WHERE id = ?1",
        params![id],
        |row| {
            Ok(DocumentRecord {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                file_path: row.get(2)?,
                file_name: row.get(3)?,
                file_size: row.get(4)?,
                page_count: row.get(5)?,
                archive_serial: row.get(6)?,
                date_created: row.get(7)?,
                correspondent: row.get(8)?,
                document_type: row.get(9)?,
                storage_path: row.get(10)?,
                tags: row.get(11)?,
                notes: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        },
    ).map_err(|e| format!("Document not found: {}", e))?;
    
    Ok(doc)
}

/// Update existing document
pub fn update_document(id: i64, doc: &DocumentRecord) -> Result<(), String> {
    let conn = get_db()?;
    let now = Utc::now().to_rfc3339();
    
    conn.execute(
        "UPDATE documents SET
            title = ?1,
            file_name = ?2,
            file_size = ?3,
            page_count = ?4,
            archive_serial = ?5,
            date_created = ?6,
            correspondent = ?7,
            document_type = ?8,
            storage_path = ?9,
            tags = ?10,
            notes = ?11,
            updated_at = ?12
         WHERE id = ?13",
        params![
            doc.title,
            doc.file_name,
            doc.file_size,
            doc.page_count,
            doc.archive_serial,
            doc.date_created,
            doc.correspondent,
            doc.document_type,
            doc.storage_path,
            doc.tags,
            doc.notes,
            now,
            id,
        ],
    ).map_err(|e| format!("Failed to update document: {}", e))?;
    
    Ok(())
}

/// Delete document by ID
pub fn delete_document(id: i64) -> Result<(), String> {
    let conn = get_db()?;
    
    conn.execute(
        "DELETE FROM documents WHERE id = ?1",
        params![id],
    ).map_err(|e| format!("Failed to delete document: {}", e))?;
    
    Ok(())
}

/// Get database statistics
pub fn get_stats() -> Result<serde_json::Value, String> {
    let conn = get_db()?;
    
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM documents",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to get stats: {}", e))?;
    
    let total_size: i64 = conn.query_row(
        "SELECT COALESCE(SUM(file_size), 0) FROM documents",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to get stats: {}", e))?;
    
    Ok(serde_json::json!({
        "total_documents": total,
        "total_size_bytes": total_size,
    }))
}
