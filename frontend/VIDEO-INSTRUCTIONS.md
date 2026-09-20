# Video Assets for DukaanPilot Hero

## Gemini/ImageFX Prompt for Video Generation

Use this prompt in **Google ImageFX** or **Veo** to generate the hero video:

```
A cinematic sequence of a traditional Indian kirana store (small neighborhood shop) at dawn. 
The metal rolling shutter is slowly opening from bottom to top, revealing warm golden light 
from inside. Inside the shop, you can see colorful product packages on wooden shelves - 
Parle-G biscuits, Maggi packets, Amul milk cartons, and other familiar Indian grocery items 
neatly arranged. The shopkeeper's silhouette is visible arranging products. Warm, inviting 
atmosphere with soft morning sunlight streaming in. Photorealistic, 4K quality, smooth 
cinematic motion. The shutter opens progressively to reveal "DukaanPilot" illuminated 
signage inside. Duration: 5-8 seconds.
```

## Alternative Prompt (More Detailed)

```
Cinematic establishing shot of an Indian kirana store exterior at golden hour. Start with 
a closed metal rolling shutter with peeling paint and a small sign. Slowly, the shutter 
begins to roll up from the bottom, revealing the warm, glowing interior. Inside: wooden 
shelves packed with colorful Indian FMCG products (Britannia, Parle, Amul, Maggi visible), 
a friendly shopkeeper in a kurta arranging items, warm tungsten lighting creating a cozy 
atmosphere. Camera slowly pushes in as the shutter opens. Photorealistic, 4K, professional 
color grading with orange-teal tones. Final reveal shows "DukaanPilot" neon sign glowing 
inside. 6-8 seconds total.
```

## Video Specifications

- **Format**: MP4 (H.264)
- **Resolution**: 1920x1080 (Full HD) minimum
- **Duration**: 5-8 seconds
- **Frame Rate**: 30fps or 60fps
- **Aspect Ratio**: 16:9
- **File Size**: Under 10MB (optimize for web)

## File Placement

1. Generate the video using the prompts above
2. Export as `dukaan-opening.mp4`
3. Place in: `/Users/aashishjha/Desktop/Hackathon/Zero-Click-Store/frontend/public/`
4. Also create a poster frame (screenshot at ~40% through the video)
5. Export poster as `hero-poster.jpg` and place in the same directory

## Fallback

The current implementation includes a fallback gradient animation if the video isn't loaded.
The shutter opening effect is simulated with CSS transforms for instant deployment.

## Video Processing Tips

If the generated video is too large:
```bash
# Use ffmpeg to compress
ffmpeg -i dukaan-opening.mp4 -vcodec h264 -b:v 2M -acodec aac -b:a 128k dukaan-opening-compressed.mp4
```

## Mobile Considerations

- Video will autoplay on scroll (muted)
- Uses `playsInline` attribute for iOS compatibility
- Preload set to "auto" for instant playback
- Falls back to gradient if video fails to load
