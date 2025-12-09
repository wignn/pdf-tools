use std::path::{Path, PathBuf};
use std::process::Command;
use std::env;

pub fn compress_pdf(input_path: &str, output_path: &str, quality: &str) -> Result<String, String> {
    let quality_setting = match quality {
        "low" => "/screen",
        "medium" => "/ebook",
        "high" => "/printer",
        _ => "/ebook",
    };

    if !Path::new(input_path).exists() {
        return Err(format!("Input file not found: {}", input_path));
    }

    let exe_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    
    let gs_path = exe_dir.join("resources").join("ghostscript").join("bin").join("gswin64c.exe");
    
    let gs_command = if gs_path.exists() {
        gs_path.to_str().unwrap()
    } else {
        #[cfg(target_os = "windows")]
        { "gswin64c" }
        #[cfg(not(target_os = "windows"))]
        { "gs" }
    };

    let output = Command::new(gs_command)
        .args(&[
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            &format!("-dPDFSETTINGS={}", quality_setting),
            "-dNOPAUSE",
            "-dQUIET",
            "-dBATCH",
            &format!("-sOutputFile={}", output_path),
            input_path,
        ])
        .output();

    match output {
        Ok(result) => {
            if result.status.success() {
                Ok(format!("PDF compressed successfully: {}", output_path))
            } else {
                let error = String::from_utf8_lossy(&result.stderr);
                Err(format!("Ghostscript compression failed: {}", error))
            }
        }
        Err(_) => {
            Err("Ghostscript not found. Using Python fallback.".to_string())
        }
    }
}

pub fn get_file_size(path: &str) -> Result<u64, String> {
    std::fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| format!("Failed to get file size: {}", e))
}

pub fn calculate_compression_ratio(original_path: &str, compressed_path: &str) -> Result<f64, String> {
    let original_size = get_file_size(original_path)?;
    let compressed_size = get_file_size(compressed_path)?;
    
    if original_size == 0 {
        return Err("Original file is empty".to_string());
    }
    
    let ratio = (1.0 - (compressed_size as f64 / original_size as f64)) * 100.0;
    Ok(ratio)
}
