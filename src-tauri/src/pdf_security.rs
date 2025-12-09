use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize)]
pub struct EncryptionParams {
    pub user_password: String,
    pub owner_password: Option<String>,
    pub allow_printing: bool,
    pub allow_copy: bool,
    pub allow_modification: bool,
    pub encryption_level: u8, // 40, 128, 256 bit
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PDFSecurityInfo {
    pub is_encrypted: bool,
    pub has_user_password: bool,
    pub has_owner_password: bool,
    pub permissions: PDFPermissions,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PDFPermissions {
    pub can_print: bool,
    pub can_copy: bool,
    pub can_modify: bool,
    pub can_annotate: bool,
}

impl Default for PDFPermissions {
    fn default() -> Self {
        Self {
            can_print: true,
            can_copy: true,
            can_modify: true,
            can_annotate: true,
        }
    }
}

pub fn get_security_info(pdf_path: &str) -> Result<PDFSecurityInfo, String> {
    let path = Path::new(pdf_path);
    if !path.exists() {
        return Err("PDF file not found".to_string());
    }

    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut buffer = vec![0; 8192]; // Read first 8KB
    
    reader
        .read(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let content = String::from_utf8_lossy(&buffer);
    let is_encrypted = content.contains("/Encrypt");

    Ok(PDFSecurityInfo {
        is_encrypted,
        has_user_password: is_encrypted,
        has_owner_password: is_encrypted,
        permissions: PDFPermissions::default(),
    })
}

pub fn validate_pdf(pdf_path: &str) -> Result<bool, String> {
    let path = Path::new(pdf_path);
    if !path.exists() {
        return Err("PDF file not found".to_string());
    }

    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut header = vec![0; 8];
    
    reader
        .read_exact(&mut header)
        .map_err(|e| format!("Failed to read header: {}", e))?;

    let header_str = String::from_utf8_lossy(&header);
    if header_str.starts_with("%PDF-") {
        Ok(true)
    } else {
        Err("Invalid PDF file: Missing PDF header".to_string())
    }
}

pub fn get_pdf_version(pdf_path: &str) -> Result<String, String> {
    let path = Path::new(pdf_path);
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut reader = BufReader::new(file);
    let mut header = vec![0; 8];
    
    reader
        .read_exact(&mut header)
        .map_err(|e| format!("Failed to read header: {}", e))?;

    let header_str = String::from_utf8_lossy(&header);
    if let Some(version_part) = header_str.strip_prefix("%PDF-") {
        Ok(version_part.trim().to_string())
    } else {
        Err("Could not determine PDF version".to_string())
    }
}
