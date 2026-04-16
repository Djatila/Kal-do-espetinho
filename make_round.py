from PIL import Image, ImageDraw

def mask_circle_transparent(pil_img):
    # Dimensões quadradas
    size = min(pil_img.size)
    # Recorte central quadrado
    img = pil_img.crop(((pil_img.size[0] - size) // 2,
                        (pil_img.size[1] - size) // 2,
                        (pil_img.size[0] + size) // 2,
                        (pil_img.size[1] + size) // 2))
    
    # Criar máscara circular
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Aplicar transparência
    result = img.convert('RGBA')
    result.putalpha(mask)
    return result

try:
    img = Image.open('public/og-image.jpg')
    
    # Logo circular principal (PNG)
    img_round = mask_circle_transparent(img)
    img_round.save('public/og-logo.png', format='PNG')
    
    # App Icon (ícone da aba)
    img_app = img_round.copy()
    img_app.thumbnail((512, 512))
    img_app.save('app/icon.png', format='PNG')
    
    print("Sucesso: Imagens circulares criadas em public/og-logo.png e app/icon.png")
except Exception as e:
    print(f"Erro: {e}")
