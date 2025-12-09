"""
PDF Editor Module
Handles PDF manipulation operations
"""
import sys
import json
import subprocess
from PyPDF2 import PdfReader, PdfWriter, PdfMerger
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image
from pdf2image import convert_from_path
import pikepdf
import io
import os
import base64

def get_pdf_thumbnails(pdf_path, output_dir=None):
    try:
        images = convert_from_path(pdf_path, dpi=150, first_page=1, last_page=None)
        thumbnails = []
        
        for idx, image in enumerate(images, start=1):
            thumbnail = image.copy()
            thumbnail.thumbnail((200, 283), Image.Resampling.LANCZOS)
            
            buffered = io.BytesIO()
            thumbnail.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            thumbnails.append({
                'page': idx,
                'thumbnail': f'data:image/png;base64,{img_str}'
            })
        
        return json.dumps({'type': 'success', 'thumbnails': thumbnails})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def get_pdf_page_image(pdf_path, page_number, dpi=150):
    """Get a single page as base64 encoded image for preview"""
    try:
        # Convert only the specific page
        images = convert_from_path(
            pdf_path, 
            first_page=page_number, 
            last_page=page_number,
            dpi=dpi
        )
        
        if not images:
            return json.dumps({'type': 'error', 'message': 'Failed to convert page'})
        
        image = images[0]
        
        # Convert to base64
        buffered = io.BytesIO()
        image.save(buffered, format='PNG')
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return json.dumps({
            'type': 'success',
            'page': page_number,
            'image': f'data:image/png;base64,{img_str}'
        })
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def merge_pdfs(input_paths, output_path):
    try:
        merger = PdfMerger()
        
        for pdf_path in input_paths:
            merger.append(pdf_path)
        
        merger.write(output_path)
        merger.close()
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def split_pdf(input_path, output_dir, pages):
    try:
        reader = PdfReader(input_path)
        output_files = []
        
        for page_num in pages:
            if page_num < 1 or page_num > len(reader.pages):
                continue
            
            writer = PdfWriter()
            writer.add_page(reader.pages[page_num - 1])
            
            output_file = os.path.join(output_dir, f'page_{page_num}.pdf')
            with open(output_file, 'wb') as f:
                writer.write(f)
            
            output_files.append(output_file)
        
        return json.dumps({'type': 'success', 'files': output_files})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def rotate_pages(input_path, output_path, rotations):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            if page_num in rotations:
                page.rotate(rotations[page_num])
            writer.add_page(page)
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def delete_pages(input_path, output_path, pages_to_delete):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            if page_num not in pages_to_delete:
                writer.add_page(page)
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def reorder_pages(input_path, output_path, page_order):
    """Reorder PDF pages according to the given order"""
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for page_num in page_order:
            if page_num < 1 or page_num > len(reader.pages):
                return json.dumps({
                    'type': 'error', 
                    'message': f'Invalid page number: {page_num}'
                })
            
            writer.add_page(reader.pages[page_num - 1])
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def add_watermark(input_path, output_path, watermark_text, position='center'):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for page in reader.pages:
            packet = io.BytesIO()
            can = canvas.Canvas(packet, pagesize=letter)
            
            can.setFont("Helvetica", 36)
            can.setFillColorRGB(0.5, 0.5, 0.5, alpha=0.3)
            
            if position == 'center':
                can.drawCentredString(300, 400, watermark_text)
            
            can.save()
            packet.seek(0)
            
            watermark = PdfReader(packet)
            page.merge_page(watermark.pages[0])
            writer.add_page(page)
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def compress_pdf(input_path, output_path, quality='75'):
    """
    DEPRECATED: Compression is now handled by Rust implementation.
    This function is kept for backward compatibility but will return an error.
    """
    return json.dumps({
        'type': 'error', 
        'message': 'PDF compression is now handled by Rust. Please use the native compress_pdf command.'
    })

def encrypt_pdf(input_path, output_path, password):
    try:
        with pikepdf.open(input_path) as pdf:
            pdf.save(output_path, encryption=pikepdf.Encryption(
                owner=password,
                user=password
            ))
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def decrypt_pdf(input_path, output_path, password):
    try:
        with pikepdf.open(input_path, password=password) as pdf:
            pdf.save(output_path)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def reorder_pages(input_path, output_path, page_order):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()
        
        for page_num in page_order:
            if 1 <= page_num <= len(reader.pages):
                writer.add_page(reader.pages[page_num - 1])
        
        with open(output_path, 'wb') as f:
            writer.write(f)
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'type': 'error', 'message': 'Missing arguments'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'merge':
        input_paths = json.loads(sys.argv[2])
        output_path = sys.argv[3]
        print(merge_pdfs(input_paths, output_path))
    
    elif command == 'split':
        input_path = sys.argv[2]
        output_dir = sys.argv[3]
        pages = json.loads(sys.argv[4])
        print(split_pdf(input_path, output_dir, pages))
    
    elif command == 'rotate':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        rotations = json.loads(sys.argv[4])
        print(rotate_pages(input_path, output_path, rotations))
    
    elif command == 'delete':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        pages_to_delete = json.loads(sys.argv[4])
        print(delete_pages(input_path, output_path, pages_to_delete))
    
    elif command == 'reorder':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        page_order = json.loads(sys.argv[4])
        print(reorder_pages(input_path, output_path, page_order))
    
    elif command == 'watermark':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        text = sys.argv[4]
        position = sys.argv[5] if len(sys.argv) > 5 else 'center'
        print(add_watermark(input_path, output_path, text, position))
    
    elif command == 'compress':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        quality = sys.argv[4] if len(sys.argv) > 4 else 'medium'
        print(compress_pdf(input_path, output_path, quality))
    
    elif command == 'encrypt':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        password = sys.argv[4]
        print(encrypt_pdf(input_path, output_path, password))
    
    elif command == 'decrypt':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        password = sys.argv[4]
        print(decrypt_pdf(input_path, output_path, password))
    
    elif command == 'thumbnails':
        pdf_path = sys.argv[2]
        print(get_pdf_thumbnails(pdf_path))
    
    elif command == 'reorder':
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        page_order = json.loads(sys.argv[4])
        print(reorder_pages(input_path, output_path, page_order))
    
    elif command == 'page_image':
        pdf_path = sys.argv[2]
        page_number = int(sys.argv[3])
        dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 150
        print(get_pdf_page_image(pdf_path, page_number, dpi))
