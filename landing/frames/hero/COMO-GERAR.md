# Quadros do vídeo aéreo do herói

Quando o vídeo do Itamaraty estiver pronto (recomendado: 6 a 10 s, 24 qps, 1920 px de largura):

    ffmpeg -i itamaraty.mp4 -vf "fps=24,scale=1920:-2" -c:v libwebp -quality 78 landing/frames/hero/%04d.webp

Depois, em landing.html, ajuste `FRAMES.count` para o número de arquivos gerados.
A cena provisória desenhada em canvas some sozinha quando `count > 0`.
