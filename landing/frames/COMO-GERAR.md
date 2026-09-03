# Quadros do herói (vídeo aéreo do Itamaraty)

Fonte: `drone itamaraty.mp4` (3840x2160, 23,976 fps, 13,93 s), versão de 2 set 2026
(take distante + rasante + lago + Meteoro + fachada + jardim).

## Como gerar
```
ffmpeg -i "drone itamaraty.mp4" -vf "fps=15,scale=1920:-2" -start_number 1 png/%04d.png
ffmpeg -i "drone itamaraty.mp4" -vf "fps=15,scale=960:-2"  -start_number 1 png-m/%04d.png
```
Depois Pillow: `im.save(x, 'WEBP', quality=74)` para `hero/` e `quality=78` para `hero-m/`
(o ffmpeg do brew não tem libwebp). 15 fps → 209 quadros por tamanho.
O build (`landing/build-landing.py`) conta os `.webp` de `hero/` e injeta em FRAMES.count.

## Atos (pontos de troca das placas)
`HERO_ATOS = [0.40, 0.61]` em `landing/build-landing.py` (fração do voo):
- 0 → 40 %: take distante, rasante sobre o gramado, travessia do lago (ato I, "O espelho d'água")
- 40 → 61 %: o Meteoro vira o assunto, cresce e é atravessado (ato II, "O Meteoro")
- 61 → 100 %: subida pela fachada e chegada ao jardim de Burle Marx (ato III, "O jardim")
Escolhidos olhando folhas de contato (20 quadros espaçados + 20 ao redor do Meteoro).
