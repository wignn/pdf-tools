import sys
import json
from pdf2docx import Converter
from PyPDF2 import PdfReader, PdfWriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PIL import Image
from pdf2image import convert_from_path
import os
import io
import base64

def get_pdf_thumbnails(pdf_path):
    try:

        from concurrent.futures import ThreadPoolExecutor
        import multiprocessing
        
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        
        max_initial_pages = 20
        pages_to_load = min(total_pages, max_initial_pages)
        
        images = convert_from_path(
            pdf_path, 
            dpi=72,  
            first_page=1, 
            last_page=pages_to_load,
            thread_count=multiprocessing.cpu_count() 
        )
        
        thumbnails = []
        
        def process_thumbnail(idx_image):
            idx, image = idx_image
            thumbnail = image.copy()
            thumbnail.thumbnail((150, 212), Image.Resampling.LANCZOS)
            
            buffered = io.BytesIO()
            thumbnail.save(buffered, format="JPEG", quality=75, optimize=True)
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return {
                'page': idx,
                'thumbnail': f'data:image/jpeg;base64,{img_str}'
            }
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(process_thumbnail, enumerate(images, start=1)))
        
        thumbnails = sorted(results, key=lambda x: x['page'])
        
        return json.dumps({
            'type': 'success', 
            'thumbnails': thumbnails,
            'total_pages': total_pages,
            'loaded_pages': pages_to_load
        })
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def get_pdf_page_image(pdf_path, page_number, scale=1.0):
    try:
        dpi = int(150 * scale)
        images = convert_from_path(
            pdf_path, 
            first_page=page_number, 
            last_page=page_number,
            dpi=dpi
        )
        
        if not images:
            return json.dumps({'type': 'error', 'message': 'Page not found'})
        
        buffered = io.BytesIO()
        images[0].save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return json.dumps({
            'type': 'success',
            'image': f'data:image/png;base64,{img_str}'
        })
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def pdf_to_word(pdf_path, output_path):
    try:
        cv = Converter(pdf_path)
        cv.convert(output_path)
        cv.close()
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def pdf_to_images(pdf_path, output_dir, format='png', dpi=200):
    try:
        from pdf2image import convert_from_path
        
        images = convert_from_path(pdf_path, dpi=dpi)
        output_files = []
        
        for idx, image in enumerate(images, start=1):
            output_file = os.path.join(output_dir, f'page_{idx}.{format}')
            image.save(output_file, format.upper())
            output_files.append(output_file)
            
            progress = (idx / len(images)) * 100
            print(json.dumps({
                'type': 'progress',
                'progress': progress
            }), flush=True)
        
        return json.dumps({'type': 'success', 'files': output_files})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def images_to_pdf(image_paths, output_path):
    try:
        images = []
        for img_path in image_paths:
            img = Image.open(img_path)
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            images.append(img)
        
        if images:
            images[0].save(output_path, save_all=True, append_images=images[1:])
        
        return json.dumps({'type': 'success', 'output': output_path})
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

def word_to_pdf(docx_path, output_path):
    try:
        import docx2pdf
        docx2pdf.convert(docx_path, output_path)
        return json.dumps({'type': 'success', 'output': output_path})
    except ImportError:
        return json.dumps({
            'type': 'error', 
            'message': 'docx2pdf not installed. Install with: pip install docx2pdf'
        })
    except Exception as e:
        return json.dumps({'type': 'error', 'message': str(e)})

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'type': 'error', 'message': 'Missing arguments'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'get_thumbnails':
        pdf_path = sys.argv[2]
        print(get_pdf_thumbnails(pdf_path))
    
    elif command == 'get_page_image':
        pdf_path = sys.argv[2]
        page_number = int(sys.argv[3])
        scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
        print(get_pdf_page_image(pdf_path, page_number, scale))
    
    elif command == 'pdf_to_word':
        pdf_path = sys.argv[2]
        output_path = sys.argv[3]
        print(pdf_to_word(pdf_path, output_path))
    
    elif command == 'pdf_to_images':
        pdf_path = sys.argv[2]
        output_dir = sys.argv[3]
        format = sys.argv[4] if len(sys.argv) > 4 else 'png'
        dpi = int(sys.argv[5]) if len(sys.argv) > 5 else 200
        print(pdf_to_images(pdf_path, output_dir, format, dpi))
    
    elif command == 'images_to_pdf':
        image_paths = json.loads(sys.argv[2])
        output_path = sys.argv[3]
        print(images_to_pdf(image_paths, output_path))
    
    elif command == 'word_to_pdf':
        docx_path = sys.argv[2]
        output_path = sys.argv[3]
        print(word_to_pdf(docx_path, output_path))
