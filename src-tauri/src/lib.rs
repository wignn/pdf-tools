mod database;
mod python;
mod pdf_ops;
mod pdf_compress;
mod pdf_security;

pub use database::DocumentRecord;


#[tauri::command]
async fn save_document(doc: DocumentRecord) -> Result<i64, String> {
    database::save_document(&doc)
}

#[tauri::command]
async fn get_documents(
    search: Option<String>,
    document_type: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<DocumentRecord>, String> {
    database::get_documents(search, document_type, limit, offset)
}

#[tauri::command]
async fn get_document_by_id(id: i64) -> Result<DocumentRecord, String> {
    database::get_document_by_id(id)
}

#[tauri::command]
async fn update_document(id: i64, doc: DocumentRecord) -> Result<(), String> {
    database::update_document(id, &doc)
}

#[tauri::command]
async fn delete_document(id: i64) -> Result<(), String> {
    database::delete_document(id)
}

#[tauri::command]
async fn get_document_stats() -> Result<serde_json::Value, String> {
    database::get_stats()
}


#[tauri::command]
async fn execute_python(script: String, args: Vec<String>) -> Result<String, String> {
    python::execute_python(script, args).await
}

#[tauri::command]
async fn ocr_pdf(
    pdf_path: String,
    languages: String,
    pages: Option<Vec<u32>>,
    output_format: String,
) -> Result<String, String> {
    let pages_json = match pages {
        Some(p) => serde_json::to_string(&p).unwrap(),
        None => "null".to_string(),
    };
    
    python::execute_python(
        "ocr_processor.py".to_string(),
        vec![
            "ocr_pdf".to_string(),
            pdf_path,
            languages,
            pages_json,
            output_format,
        ],
    )
    .await
}

#[tauri::command]
async fn merge_pdfs(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    let paths_json = serde_json::to_string(&input_paths).unwrap();
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["merge".to_string(), paths_json, output_path],
    )
    .await
}

#[tauri::command]
async fn split_pdf(
    input_path: String,
    output_dir: String,
    pages: Vec<u32>,
) -> Result<String, String> {
    let pages_json = serde_json::to_string(&pages).unwrap();
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["split".to_string(), input_path, output_dir, pages_json],
    )
    .await
}

#[tauri::command]
async fn rotate_pages(
    input_path: String,
    output_path: String,
    rotations: std::collections::HashMap<u32, i32>,
) -> Result<String, String> {
    let rotations_json = serde_json::to_string(&rotations).unwrap();
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec![
            "rotate".to_string(),
            input_path,
            output_path,
            rotations_json,
        ],
    )
    .await
}

#[tauri::command]
async fn delete_pages(
    input_path: String,
    output_path: String,
    pages: Vec<u32>,
) -> Result<String, String> {
    let pages_json = serde_json::to_string(&pages).unwrap();
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["delete".to_string(), input_path, output_path, pages_json],
    )
    .await
}

#[tauri::command]
async fn compress_pdf(
    input_path: String,
    output_path: String,
    quality: u32,
) -> Result<String, String> {
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["compress".to_string(), input_path, output_path, quality.to_string()],
    )
    .await
}

#[tauri::command]
async fn add_watermark(
    input_path: String,
    output_path: String,
    watermark_text: String,
    position: String,
) -> Result<String, String> {
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec![
            "watermark".to_string(),
            input_path,
            output_path,
            watermark_text,
            position,
        ],
    )
    .await
}

#[tauri::command]
async fn encrypt_pdf(
    input_path: String,
    output_path: String,
    password: String,
) -> Result<String, String> {
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["encrypt".to_string(), input_path, output_path, password],
    )
    .await
}

#[tauri::command]
async fn decrypt_pdf(
    input_path: String,
    output_path: String,
    password: String,
) -> Result<String, String> {
    python::execute_python(
        "pdf_editor.py".to_string(),
        vec!["decrypt".to_string(), input_path, output_path, password],
    )
    .await
}

#[tauri::command]
async fn pdf_to_word(input_path: String, output_path: String) -> Result<String, String> {
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec!["pdf_to_word".to_string(), input_path, output_path],
    )
    .await
}

#[tauri::command]
async fn pdf_to_images(
    input_path: String,
    output_dir: String,
    format: String,
    dpi: u32,
) -> Result<String, String> {
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec![
            "pdf_to_images".to_string(),
            input_path,
            output_dir,
            format,
            dpi.to_string(),
        ],
    )
    .await
}

#[tauri::command]
async fn images_to_pdf(image_paths: Vec<String>, output_path: String) -> Result<String, String> {
    let paths_json = serde_json::to_string(&image_paths).unwrap();
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec!["images_to_pdf".to_string(), paths_json, output_path],
    )
    .await
}

#[tauri::command]
async fn word_to_pdf(input_path: String, output_path: String) -> Result<String, String> {
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec!["word_to_pdf".to_string(), input_path, output_path],
    )
    .await
}


#[tauri::command]
async fn get_pdf_info(pdf_path: String) -> Result<String, String> {
    let info = pdf_ops::get_pdf_info(&pdf_path)?;
    serde_json::to_string(&info).map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
fn get_file_stats(path: String) -> Result<serde_json::Value, String> {
    use std::fs;
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get file stats: {}", e))?;
    
    Ok(serde_json::json!({
        "size": metadata.len(),
        "is_file": metadata.is_file(),
        "is_dir": metadata.is_dir(),
    }))
}

#[tauri::command]
async fn get_pdf_thumbnails(pdf_path: String) -> Result<String, String> {
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec!["get_thumbnails".to_string(), pdf_path],
    )
    .await
}

#[tauri::command]
async fn reorder_pdf_pages(
    input_path: String,
    output_path: String,
    page_order: Vec<u32>,
) -> Result<(), String> {
    let page_order_json = serde_json::to_string(&page_order)
        .map_err(|e| format!("JSON error: {}", e))?;
    
    let result = python::execute_python(
        "pdf_editor.py".to_string(),
        vec![
            "reorder".to_string(),
            input_path,
            output_path,
            page_order_json,
        ],
    )
    .await?;
    
    let parsed: serde_json::Value = serde_json::from_str(&result)
        .map_err(|e| format!("Parse error: {}", e))?;
    
    if parsed["type"] == "error" {
        return Err(parsed["message"].as_str().unwrap_or("Unknown error").to_string());
    }
    
    Ok(())
}

#[tauri::command]
async fn get_pdf_page_image(
    pdf_path: String,
    page_number: u32,
    scale: f32,
) -> Result<String, String> {
    python::execute_python(
        "pdf_converter.py".to_string(),
        vec![
            "get_page_image".to_string(),
            pdf_path,
            page_number.to_string(),
            scale.to_string(),
        ],
    )
    .await
}

#[tauri::command]
async fn update_pdf_text(
    input_path: String,
    output_path: String,
    old_content: String,
    new_content: String,
) -> Result<String, String> {
    python::execute_python(
        "pdf_text_editor.py".to_string(),
        vec![
            "smart_replace".to_string(),
            input_path,
            output_path,
            old_content,
            new_content,
        ],
    )
    .await
}

#[tauri::command]
async fn get_pdf_security_info(pdf_path: String) -> Result<String, String> {
    let info = pdf_security::get_security_info(&pdf_path)?;
    serde_json::to_string(&info).map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
async fn validate_pdf_file(pdf_path: String) -> Result<bool, String> {
    pdf_security::validate_pdf(&pdf_path)
}

#[tauri::command]
async fn get_pdf_version_info(pdf_path: String) -> Result<String, String> {
    pdf_security::get_pdf_version(&pdf_path)
}

#[tauri::command]
async fn compress_pdf_native(
    input_path: String,
    output_path: String,
    quality: String,
) -> Result<String, String> {
    // Try native Rust compression first
    match pdf_compress::compress_pdf(&input_path, &output_path, &quality) {
        Ok(msg) => {
            // Get compression ratio
            if let Ok(ratio) = pdf_compress::calculate_compression_ratio(&input_path, &output_path) {
                Ok(format!("{} (Reduced by {:.1}%)", msg, ratio))
            } else {
                Ok(msg)
            }
        }
        Err(_) => {
            // Fallback to Python
            python::execute_python(
                "pdf_editor.py".to_string(),
                vec!["compress".to_string(), input_path, output_path, quality],
            )
            .await
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Database
            save_document,
            get_documents,
            get_document_by_id,
            update_document,
            delete_document,
            get_document_stats,
            // Python execution
            execute_python,
            ocr_pdf,
            merge_pdfs,
            split_pdf,
            rotate_pages,
            delete_pages,
            compress_pdf,
            add_watermark,
            encrypt_pdf,
            decrypt_pdf,
            pdf_to_word,
            pdf_to_images,
            images_to_pdf,
            word_to_pdf,
            // Native PDF ops
            get_pdf_info,
            get_file_stats,
            get_pdf_thumbnails,
            reorder_pdf_pages,
            get_pdf_page_image,
            update_pdf_text,
            // Security & Validation
            get_pdf_security_info,
            validate_pdf_file,
            get_pdf_version_info,
            compress_pdf_native,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
