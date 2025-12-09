import sys
import json
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import os

def ocr_pdf(pdf_path, languages='eng+ind', pages=None, output_format='txt'):
    try:
        if pages:
            images = convert_from_path(pdf_path, first_page=min(pages), last_page=max(pages), dpi=100)
        else:
            images = convert_from_path(pdf_path, dpi=100)
        
        results = []
        
        for idx, image in enumerate(images, start=1):
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(image, lang=languages, config=custom_config)
            
            cleaned_text = '\n'.join(line.rstrip() for line in text.split('\n'))
            cleaned_text = '\n'.join(line for line in cleaned_text.split('\n') if line.strip())
            
            results.append({
                'page': idx,
                'text': cleaned_text
            })
        
        if output_format == 'txt':
            formatted_pages = []
            for r in results:
                if r['text']:
                    page_num = str(r['page']).center(55)
                    separator = '─' * 55
                    header = f"\n╔{'═' * 55}╗\n║{page_num}║\n╚{'═' * 55}╝\n"
                    formatted_pages.append(f"{header}\n{r['text']}")
            return '\n\n'.join(formatted_pages)
        else:
            return json.dumps(results, ensure_ascii=False)
            
    except Exception as e:
        raise Exception(str(e))

def ocr_image(image_path, languages='eng+ind'):
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image, lang=languages)
        return text.strip()
    except Exception as e:
        raise Exception(str(e))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'type': 'error', 'message': 'Missing arguments'}))
        sys.exit(1)
    
    try:
        command = sys.argv[1]
        
        if command == 'ocr_pdf':
            pdf_path = sys.argv[2]
            languages = sys.argv[3] if len(sys.argv) > 3 else 'eng+ind'
            pages = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            output_format = sys.argv[5] if len(sys.argv) > 5 else 'txt'
            
            result = ocr_pdf(pdf_path, languages, pages, output_format)
            print(json.dumps({'type': 'success', 'data': result}))
        
        elif command == 'ocr_image':
            image_path = sys.argv[2]
            languages = sys.argv[3] if len(sys.argv) > 3 else 'eng+ind'
            
            result = ocr_image(image_path, languages)
            print(json.dumps({'type': 'success', 'data': result}))
    
    except Exception as e:
        print(json.dumps({'type': 'error', 'message': str(e)}))
        sys.exit(1)
