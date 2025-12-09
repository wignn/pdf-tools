use lopdf::Document;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PDFInfo {
    pub page_count: u32,
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
    pub producer: Option<String>,
    pub creation_date: Option<String>,
    pub modification_date: Option<String>,
    pub file_name: String,
}


pub fn get_pdf_info(pdf_path: &str) -> Result<PDFInfo, String> {
    let doc = Document::load(pdf_path)
        .map_err(|e| format!("Failed to load PDF: {}", e))?;
    
    let page_count = doc.get_pages().len() as u32;
    
    let file_name = std::path::Path::new(pdf_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown.pdf")
        .to_string();
    
    Ok(PDFInfo {
        page_count,
        title: None,
        author: None,
        subject: None,
        creator: None,
        producer: None,
        creation_date: None,
        modification_date: None,
        file_name,
    })
}
