"""
PDF Text Editor - Advanced text manipulation while preserving layout
Uses PyMuPDF (fitz) for precise text replacement in PDF documents
"""

import fitz  # PyMuPDF
import json
import sys
import os
from typing import List, Dict, Tuple, Optional


def replace_text_in_pdf(input_path: str, output_path: str, replacements: List[Dict[str, str]]) -> Dict:
    try:
        doc = fitz.open(input_path)
        total_replacements = 0
        page_details = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_replacements = 0
            
            for replacement in replacements:
                old_text = replacement.get('old_text', '')
                new_text = replacement.get('new_text', '')
                
                if not old_text:
                    continue
                
                text_instances = page.search_for(old_text)
                
                for inst in text_instances:
                    page.add_redact_annot(inst, text=new_text, fill=(1, 1, 1))
                    page_replacements += 1
            
            if page_replacements > 0:
                page.apply_redactions()
                page_details.append({
                    'page': page_num + 1,
                    'replacements': page_replacements
                })
            
            total_replacements += page_replacements
        
        # Save modified PDF
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()
        
        return {
            'type': 'success',
            'message': f'Text replaced successfully. Total replacements: {total_replacements}',
            'total_replacements': total_replacements,
            'pages_modified': len(page_details),
            'page_details': page_details,
            'output_path': output_path
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'message': f'Failed to replace text: {str(e)}'
        }


def update_pdf_content(input_path: str, output_path: str, new_content: str) -> Dict:
    try:
        doc = fitz.open(input_path)
        new_lines = new_content.split('\n')
        line_index = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text blocks with position information
            blocks = page.get_text("dict")["blocks"]
            
            for block in blocks:
                if "lines" not in block:
                    continue
                
                for line in block["lines"]:
                    if line_index >= len(new_lines):
                        break
                    
                    for span in line["spans"]:
                        original_rect = fitz.Rect(span["bbox"])
                        font_size = span["size"]
                        font_name = span["font"]
                        color = span["color"]
                        
                        page.add_redact_annot(original_rect, fill=(1, 1, 1))
                        page.apply_redactions()
                        
                        if line_index < len(new_lines):
                            new_text = new_lines[line_index]
                            
                            insert_point = fitz.Point(original_rect.x0, original_rect.y1)
                            
                            try:
                                page.insert_text(
                                    insert_point,
                                    new_text,
                                    fontsize=font_size,
                                    fontname=font_name,
                                    color=color
                                )
                            except:
                                page.insert_text(
                                    insert_point,
                                    new_text,
                                    fontsize=font_size,
                                    color=color
                                )
                            
                            line_index += 1
        
        # Save modified PDF
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()
        
        return {
            'type': 'success',
            'message': 'PDF content updated successfully',
            'lines_processed': line_index,
            'output_path': output_path
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'message': f'Failed to update PDF content: {str(e)}'
        }


def overlay_text_on_pdf(input_path: str, output_path: str, new_content: str) -> Dict:

    try:
        doc = fitz.open(input_path)
        new_lines = new_content.split('\n')
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            rect = page.rect
            
            white_rect = fitz.Rect(50, 50, rect.width - 50, rect.height - 50)
            page.draw_rect(white_rect, color=(1, 1, 1), fill=(1, 1, 1))
            
            y_position = 70
            line_height = 14
            
            for line in new_lines:
                if y_position > rect.height - 70:
                    break
                
                insert_point = fitz.Point(60, y_position)
                page.insert_text(
                    insert_point,
                    line,
                    fontsize=11,
                    fontname="helv",
                    color=(0, 0, 0)
                )
                y_position += line_height
        
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()
        
        return {
            'type': 'success',
            'message': 'Text overlay applied successfully',
            'output_path': output_path
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'message': f'Failed to overlay text: {str(e)}'
        }


def smart_replace_pdf_text(input_path: str, output_path: str, old_content: str, new_content: str) -> Dict:
    """
    Smart text replacement using word-level diff detection.
    Finds specific words/phrases that changed and replaces only those.
    """
    try:
        # If content is identical, no changes needed
        if old_content.strip() == new_content.strip():
            return {
                'type': 'success',
                'message': 'No changes detected',
                'total_replacements': 0
            }
        
        doc = fitz.open(input_path)
        
        old_words = old_content.split()
        new_words = new_content.split()
        

        replacements = []
        seen_replacements = set()
        
        old_lines = old_content.split('\n')
        new_lines = new_content.split('\n')
        
        for i in range(min(len(old_lines), len(new_lines))):
            old_line = old_lines[i].strip()
            new_line = new_lines[i].strip()
            
            if old_line != new_line and old_line and new_line:
                prefix_len = 0
                while (prefix_len < min(len(old_line), len(new_line)) and 
                       old_line[prefix_len] == new_line[prefix_len]):
                    prefix_len += 1
                
                suffix_len = 0
                while (suffix_len < min(len(old_line) - prefix_len, len(new_line) - prefix_len) and
                       old_line[-(suffix_len+1)] == new_line[-(suffix_len+1)]):
                    suffix_len += 1
                
                old_changed = old_line[prefix_len:len(old_line)-suffix_len if suffix_len > 0 else len(old_line)].strip()
                new_changed = new_line[prefix_len:len(new_line)-suffix_len if suffix_len > 0 else len(new_line)].strip()
                
                if old_changed and old_changed not in seen_replacements:
                    replacements.append({
                        'old_text': old_changed,
                        'new_text': new_changed
                    })
                    seen_replacements.add(old_changed)
        
        total_replacements = 0
        pages_modified = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_replacements = 0
            
            for replacement in replacements:
                old_text = replacement['old_text']
                new_text = replacement['new_text']
                
                text_instances = page.search_for(old_text)
                
                for inst in text_instances:
                    page.add_redact_annot(inst, text=new_text, fill=(1, 1, 1))
                    page_replacements += 1
            
            if page_replacements > 0:
                page.apply_redactions()
                pages_modified += 1
            
            total_replacements += page_replacements
        
        doc.save(output_path, garbage=4, deflate=True, clean=True)
        doc.close()
        
        return {
            'type': 'success',
            'message': f'PDF updated successfully. {total_replacements} replacements made.',
            'total_replacements': total_replacements,
            'pages_modified': pages_modified,
            'output_path': output_path
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'message': f'Smart replace failed: {str(e)}'
        }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'type': 'error', 'message': 'No command provided'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == 'replace_text':
            input_path = sys.argv[2]
            output_path = sys.argv[3]
            replacements = json.loads(sys.argv[4])
            
            result = replace_text_in_pdf(input_path, output_path, replacements)
            print(json.dumps(result))
            
        elif command == 'update_content':
            input_path = sys.argv[2]
            output_path = sys.argv[3]
            new_content = sys.argv[4]
            
            result = update_pdf_content(input_path, output_path, new_content)
            print(json.dumps(result))
            
        elif command == 'smart_replace':
            input_path = sys.argv[2]
            output_path = sys.argv[3]
            old_content_file = sys.argv[4]
            new_content_file = sys.argv[5]
            
            with open(old_content_file, 'r', encoding='utf-8') as f:
                old_content = f.read()
            with open(new_content_file, 'r', encoding='utf-8') as f:
                new_content = f.read()
            
            result = smart_replace_pdf_text(input_path, output_path, old_content, new_content)
            print(json.dumps(result))
            
            try:
                os.remove(old_content_file)
                os.remove(new_content_file)
            except:
                pass
            
        elif command == 'overlay_text':
            input_path = sys.argv[2]
            output_path = sys.argv[3]
            new_content = sys.argv[4]
            
            result = overlay_text_on_pdf(input_path, output_path, new_content)
            print(json.dumps(result))
            
        else:
            print(json.dumps({'type': 'error', 'message': f'Unknown command: {command}'}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({'type': 'error', 'message': str(e)}))
        sys.exit(1)
