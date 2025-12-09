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

    try:
        try:
            quality_value = int(quality)
        except:
            quality_value = 75  
        quality_value = max(10, min(100, quality_value))
        
        # Detect if running as PyInstaller bundle or from source
        if getattr(sys, 'frozen', False):
            # Running as compiled executable
            app_dir = os.path.dirname(sys.executable)
        else:
            # Running from source - try multiple paths
            script_dir = os.path.dirname(os.path.abspath(__file__))
            app_dir = os.path.dirname(script_dir)
        
        # Try multiple resource directory locations
        possible_resource_dirs = [
            os.path.join(app_dir, 'resources'),
            os.path.abspath(os.path.join(script_dir, '..', 'resources')),
            os.path.abspath(os.path.join(os.getcwd(), 'resources')),
            # Absolute fallback for development
            r'C:\Users\tigfi\Desktop\project\ocr\pdf-processor\resources',
        ]
        
        gs_paths = []
        for resources_dir in possible_resource_dirs:
            gs_paths.extend([
                os.path.join(resources_dir, 'ghostscript', 'bin', 'gswin64c.exe'),
                os.path.join(resources_dir, 'gs', 'bin', 'gswin64c.exe'),
            ])
        
        # Fallback to system Ghostscript if available
        gs_paths.append('gswin64c')
        
        # Use first found resource dir for debug info
        resources_dir = next((d for d in possible_resource_dirs if os.path.exists(d)), possible_resource_dirs[0])
        
        gs_exe = None
        gs_error = None
        gs_check_log = []
        
        for path in gs_paths:
            try:
                # Check if file exists first (skip version check for system command)
                if path == 'gswin64c':
                    # Try system command
                    try:
                        result = subprocess.run([path, '--version'], capture_output=True, timeout=5, shell=False)
                        if result.returncode == 0:
                            gs_exe = path
                            gs_check_log.append(f'{path}: FOUND (system)')
                            break
                        else:
                            gs_check_log.append(f'{path}: failed (returncode {result.returncode})')
                    except Exception as e:
                        gs_check_log.append(f'{path}: error ({str(e)})')
                else:
                    # Check if executable file exists
                    if os.path.isfile(path):
                        gs_exe = path
                        gs_check_log.append(f'{path}: FOUND')
                        break
                    else:
                        gs_check_log.append(f'{path}: not found')
            except Exception as e:
                gs_error = str(e)
                gs_check_log.append(f'{path}: exception ({str(e)})')
                continue
        
        if quality_value >= 85:
            gs_setting = '/prepress'
            image_quality = 95
            color_dpi = 300
            gray_dpi = 300
        elif quality_value >= 70:
            gs_setting = '/printer'
            image_quality = 85
            color_dpi = 300
            gray_dpi = 300
        elif quality_value >= 55:
            gs_setting = '/ebook'
            image_quality = 75
            color_dpi = 150
            gray_dpi = 150
        elif quality_value >= 40:
            gs_setting = '/screen'
            image_quality = 60
            color_dpi = 96
            gray_dpi = 96
        elif quality_value >= 25:
            gs_setting = '/screen'
            image_quality = 40
            color_dpi = 72
            gray_dpi = 72
        else:
            gs_setting = '/screen'
            image_quality = 25
            color_dpi = 50
            gray_dpi = 50
        
        if gs_exe:
            gs_command = [
                gs_exe,
                '-sDEVICE=pdfwrite',
                '-dCompatibilityLevel=1.4',
                f'-dPDFSETTINGS={gs_setting}',
                '-dNOPAUSE',
                '-dQUIET',
                '-dBATCH',
                '-dAutoRotatePages=/None',
                '-dColorImageDownsampleType=/Bicubic',
                f'-dColorImageResolution={color_dpi}',
                '-dEncodeColorImages=true',
                '-dColorImageFilter=/DCTEncode',
                '-dGrayImageDownsampleType=/Bicubic',
                f'-dGrayImageResolution={gray_dpi}',
                '-dEncodeGrayImages=true',
                '-dGrayImageFilter=/DCTEncode',
                '-dMonoImageDownsampleType=/Bicubic',
                f'-dMonoImageResolution={gray_dpi}',
                '-dEncodeMonoImages=true',
                '-dMonoImageFilter=/CCITTFaxEncode',
                f'-dJPEGQ={image_quality}',
                '-dDetectDuplicateImages=true',
                '-dCompressFonts=true',
                '-dSubsetFonts=true',
                '-dEmbedAllFonts=true',
                '-dFastWebView=true',
                '-dPrinted=false',
                '-dDownsampleColorImages=true',
                '-dDownsampleGrayImages=true',
                '-dDownsampleMonoImages=true',
                '-dOptimize=true',
                '-dCompressPages=true',
                '-dUseFlateCompression=true',
                f'-sOutputFile={output_path}',
                input_path
            ]
            
            try:
                result = subprocess.run(gs_command, capture_output=True, text=True, timeout=300)
                
                if result.returncode != 0:
                    gs_error = f"Ghostscript failed: returncode={result.returncode}, stderr={result.stderr}, stdout={result.stdout}"
                    raise Exception(gs_error)
                    
            except Exception as e:
                # Fallback to pikepdf if Ghostscript fails
                if not gs_error:
                    gs_error = f"Ghostscript execution error: {str(e)}"
                gs_exe = None
        
        if not gs_exe:
            # Fallback: Use pikepdf with aggressive settings
            with pikepdf.open(input_path) as pdf:
                # Apply aggressive optimization
                if quality_value >= 70:
                    pdf.save(output_path, 
                            compress_streams=True,
                            object_stream_mode=pikepdf.ObjectStreamMode.generate)
                else:
                    pdf.save(output_path,
                            compress_streams=True,
                            object_stream_mode=pikepdf.ObjectStreamMode.generate,
                            recompress_flate=True,
                            stream_decode_level=pikepdf.StreamDecodeLevel.generalized)
        
        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        ratio = (1 - compressed_size / original_size) * 100
        
        # Debug info
        debug_info = {
            'app_dir': app_dir if 'app_dir' in locals() else 'unknown',
            'resources_dir': resources_dir,
            'gs_paths_checked': gs_paths,
            'gs_found': gs_exe,
            'gs_error': gs_error if 'gs_error' in locals() else None,
            'cwd': os.getcwd(),
            'script_dir': os.path.dirname(os.path.abspath(__file__)) if not getattr(sys, 'frozen', False) else 'N/A',
            'gs_check_log': gs_check_log if 'gs_check_log' in locals() else []
        }
        
        return json.dumps({
            'type': 'success',
            'output': output_path,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': f'{ratio:.1f}%',
            'quality': quality_value,
            'method': 'ghostscript' if gs_exe else 'pikepdf',
            'debug': debug_info
        })
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

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
