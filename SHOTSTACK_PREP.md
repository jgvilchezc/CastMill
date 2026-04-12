# Preparacion - Developer Advocate @ Shotstack

## 1. Que es Shotstack

**Shotstack** es una plataforma de creacion de video impulsada por IA, orientada a desarrolladores. Permite automatizar y escalar la produccion de video mediante una API RESTful basada en JSON y un SDK de editor de video white-label.

### Datos clave
- **+50,000 desarrolladores** en 119 paises
- **+1.1M videos renderizados/mes**
- **7x mas rapido** que alternativas
- Clientes: Spotify, IKEA, Nike, McDonald's, Coca-Cola, Twitter/X, Randstad
- Sede: Australia (fundada ~2019)

### Productos principales

| Producto | Descripcion |
|----------|-------------|
| **Edit API** | API de edicion de video/imagen/audio via JSON. Trimming, stitching, transiciones, filtros, overlays, text, chroma key, speed control |
| **Create API** | Generacion de assets con IA: text-to-speech, text-to-image, image-to-video, AI avatars |
| **Ingest API** | Upload, almacenamiento y transformacion de material fuente |
| **Serve API** | Hosting y gestion de assets generados |
| **Studio SDK** | Editor de video white-label embeddable (React, Vue, Angular, Next.js). Licencia Polyform Shield (gratis si no compites con Shotstack) |
| **Workflows** | Automatizacion sin codigo via webhooks o CSV |

### Como funciona (flujo basico)
1. Disenar template en Shotstack Studio o escribir JSON manualmente
2. POST del JSON al endpoint de render (`https://api.shotstack.io/v1/render`)
3. Poll del API para verificar estado (~10 seg para video de 30 seg)
4. Video disponible en URL temporal (24h) o transferido a hosting propio/Shotstack

### SDKs disponibles
- **Node.js**: `npm install shotstack-sdk` (36 stars GitHub)
- **TypeScript**: `@shotstack/shotstack-sdk` (beta)
- **PHP**: SDK con 15 stars
- **Studio SDK**: `npm install @shotstack/shotstack-studio` (25 stars)
- Demos y cookbooks en GitHub org: github.com/shotstack

### Pricing
- **Pay As You Go**: $0.30/min (creditos desde $75)
- **Subscription**: $0.20/min (desde $39/mes por 200 creditos)
- **High Volume**: pricing custom desde 50,000 min/year
- Sandbox gratuito para desarrollo (sin tarjeta de credito)
- Todos los planes incluyen 1080p, SDK white-label, render de hasta 3 horas

### Competidores
| Competidor | Diferenciacion vs Shotstack |
|------------|----------------------------|
| **Creatomate** | Mas orientado a marketing/social media. Solo suscripcion. Shotstack es mas rapido y mas barato por minuto |
| **Bannerbear** | Especialista en imagenes, no video. Complementario mas que competidor |
| **FFmpeg (DIY)** | Requiere infraestructura propia, meses de desarrollo. Shotstack elimina esa complejidad |
| **Remotion** | Open-source React video. Requiere gestion propia de rendering/infra |

### Verticales actuales con case studies
- **Spotify**: 30,000 videos/dia para Instagram sharing
- **IKEA** (via Grupo W): Videos personalizados on-demand durante pandemia
- **MY VIVENDA**: Videos de listings inmobiliarios en <20 segundos de render

---

## 2. Guia por Pregunta

---

### PREGUNTA 1: Plan de distribucion para demo app (video social media con subtitulos)

**Contexto**: Acabas de crear una app demo que muestra como Shotstack genera automaticamente videos para redes sociales con subtitulos.

#### Estrategia sugerida (secuencia de 2 semanas)

**Dia 1-2: Lanzamiento tecnico**
- Publicar el repositorio en GitHub con README detallado, instrucciones claras, y demo GIF/video
- Blog post tecnico en shotstack.io/learn: "How I Built an Automated Social Media Video Generator with Captions Using Shotstack" (tutorial paso a paso)
- Thread en Twitter/X con video demo corto mostrando el resultado final y enlace al repo

**Dia 3-5: Distribucion en comunidades de desarrolladores**
- Articulo en Dev.to y Hashnode (reformateado para SEO de cada plataforma)
- Post en r/webdev, r/node, r/SideProject, r/programming (participar genuinamente antes de postear)
- Post en Hacker News (Show HN: Open-source tool to auto-generate captioned social videos)
- Compartir en comunidades de Discord relevantes (JavaScript, Node.js, AI builders)

**Dia 5-7: Contenido visual y video**
- Video corto de YouTube (3-5 min): walkthrough de la demo
- Clip de 60 segundos para TikTok/Reels/Shorts mostrando el "antes y despues" (texto plano → video con subtitulos)
- LinkedIn post orientado a product managers y marketers que necesitan automatizar contenido

**Dia 7-14: Amplificacion y engagement**
- Responder a TODOS los comentarios y issues en GitHub
- Newsletter de Shotstack destacando la demo
- Buscar newsletters de terceros (TLDR, Bytes, JavaScript Weekly) para inclusion
- Cross-post en Product Hunt (como herramienta gratuita/open-source)

#### Como medir que funciona
- **Metricas de awareness**: GitHub stars, forks, page views del blog, impresiones en redes
- **Metricas de engagement**: Clones del repo, tiempo en pagina del tutorial, comentarios, preguntas
- **Metricas de activacion**: Signups a Shotstack dashboard desde UTM links de la demo, primeros renders exitosos rastreables via API key creation
- **Metricas de conversion**: Cuantos usuarios de sandbox pasan a produccion en 30 dias

**Herramientas**: UTM parameters en cada enlace, Google Analytics en el blog, GitHub traffic insights, Shotstack dashboard analytics para correlacionar signups.

**Punto clave para el video**: Enfatizar que la distribucion NO es "publicar y rezar". Es una secuencia deliberada donde cada canal alimenta al siguiente. El blog post es el "hub" de contenido; todo lo demas apunta a el. Y la medicion conecta awareness → signup → primer render → conversion.

---

### PREGUNTA 2: Vertical para Shotstack + validacion + primer lanzamiento

#### Vertical recomendado: EdTech (Tecnologia Educativa)

**Por que EdTech:**
- Explosion de contenido educativo en video post-pandemia (MOOCs, microlearning, corporate training)
- Los creadores de cursos y plataformas LMS necesitan producir MUCHOS videos con estructura repetitiva (intro, contenido, outro, subtitulos)
- El pain point es claro: crear un video educativo toma horas manualmente; con Shotstack podria ser minutos
- El mercado global de EdTech vale $400B+ y crece ~16% anual
- Los subtitulos automaticos son un requisito de accesibilidad (ADA/WCAG) - Shotstack ya resuelve esto
- Alta repetibilidad: templates de curso se reusan cientos de veces con diferente contenido

**Otros verticales viables** (por si prefieres otro):
- **E-commerce**: Videos de producto automatizados desde feeds de Shopify/WooCommerce (ya hay traccion con Zapier)
- **Real Estate**: Ya validado con MY VIVENDA pero expandible masivamente (Zillow, Realtor APIs)
- **Recruitment/HR**: Videos de ofertas de trabajo personalizados (Randstad ya es cliente)

#### Como validar antes de asignar recursos

1. **Investigacion cuantitativa rapida (1-2 semanas)**
   - Analizar busquedas: Google Trends para "automated course video", "bulk video creation education", "LMS video API"
   - Revisar volumen de busqueda con Ahrefs/SEMrush para keywords de la interseccion EdTech + video automation
   - Scrape de G2/Capterra: que herramientas de video usan las plataformas EdTech? Que pain points mencionan?

2. **Investigacion cualitativa (2-3 semanas, en paralelo)**
   - 10-15 conversaciones con CTOs/devs de plataformas EdTech (Teachable, Thinkific, Udemy clones, corporate LMS)
   - Preguntas clave: "Como crean videos hoy?", "Cuanto gastan?", "Que integrarian si existiera?"
   - Monitorear comunidades: r/edtech, r/instructionaldesign, foros de Moodle/Canvas
   - Revisar integraciones existentes de competidores en EdTech

3. **Validacion tecnica (1 semana)**
   - Prototipo rapido: demo que toma un script de leccion en texto → genera video con slides, voiceover AI, subtitulos
   - Testearlo con 3-5 prospects para ver si la reaccion es "wow, necesito esto" vs "interesante pero..."

4. **Senales de go/no-go**
   - GO: 6+/10 entrevistados dicen que pagarian; volumen de busqueda > 1K/mes; 2+ plataformas LMS dispuestas a pilotear
   - NO-GO: El pain point es real pero el presupuesto va a otros rubros; ya existen soluciones entrenched

#### Lo primero que construiria y lanzaria

**"Lesson Video Generator" - Template + Tutorial + Integration Guide**

1. **Template pre-diseñado** en Shotstack Studio optimizado para educacion:
   - Intro con titulo del curso/leccion
   - Slides con bullet points + narrador AI (Create API text-to-speech)
   - Subtitulos automaticos
   - Outro con CTA y branding del creador

2. **Tutorial completo**: "Build an Automated Course Video Generator in 30 Minutes with Shotstack"

3. **Integration guide** para las 3 LMS mas populares (Moodle, Canvas, Teachable) mostrando como conectar via API

4. **Landing page** en shotstack.io/solutions/edtech con el pitch especifico para este vertical

Esto es minimo viable: un template + tutorial + integration guide. Si genera traccion, escalas a un SDK de integracion nativa.

---

### PREGUNTA 3: Explica un concepto tecnico interesante

**Sugerencia de concepto: "Rendering as a Service" o alternativamente:**

#### Opcion A: Rendering Pipelines (como funcionan por dentro)

"Cuando le das Play a un video en tu editor, lo que pasa por detras es una cosa fascinante..."

**Script sugerido (2-3 min):**

Imagina que tienes 50 fotos de un departamento y quieres convertirlas en un video de 60 segundos con transiciones, musica, texto con el precio, y subtitulos. Si lo haces a mano: abres Premiere, importas todo, arrastras, ajustas, exportas... 30 minutos minimo.

Ahora imagina que eres una inmobiliaria con 500 listings nuevos al dia. Necesitas 500 videos. Contratar a alguien? Imposible. Usar FFmpeg? Te armas un script... y funciona para 1 video. Pero cuando 200 agentes piden su video al mismo tiempo, tu servidor se cae.

Aqui es donde entra el concepto de **Rendering Pipeline distribuido**. Es la misma idea que un CI/CD pipeline pero para video:

1. **Intake**: Recibes el "receta" del video (un JSON con las instrucciones: que fotos, que texto, que musica, que transiciones)
2. **Queue**: Esa receta entra a una cola de trabajo (como un mesero que toma ordenes)
3. **Worker Pool**: Un pool de workers toma recetas de la cola. Cada worker es un container con FFmpeg + las herramientas de composicion. Pueden escalar horizontalmente: 10 videos o 10,000 videos
4. **Compositing**: Cada worker ensambla el video frame por frame. Aqui esta la ciencia: combinar layers (video base + texto overlay + audio) requiere decodificar, procesar pixels, re-encodificar
5. **Output**: El video final se encodifica (H.264, H.265, VP9 segun destino) y se sube a storage

Lo interesante es que esto es EXACTAMENTE lo que hace Shotstack por debajo. Tu envias un JSON, y toda esa maquinaria de colas, workers, scaling, encoding... ya esta resuelta. Eso es lo que tardaria 2-6 meses construir in-house (como dijo el equipo de Spotify).

**Por que esto importa**: Cada vez que ves un video "auto-generado" - el resumen de tu ano en Spotify, el video del listing de Zillow, el recap de un partido - detras hay un rendering pipeline. Y la tendencia es que CADA aplicacion va a necesitar generar video programaticamente, igual que hoy cada app genera PDFs.

#### Opcion B: JSON como lenguaje de edicion de video

Concepto mas sencillo pero muy visual: la idea de que un video se puede describir completamente como un documento JSON, igual que una pagina web se describe con HTML. Tracks = layers, clips = elementos, assets = contenido. Es edicion de video declarativa.

---

### PREGUNTA 4: 500 desarrolladores con primer render exitoso en 1 semana

#### Estrategia: "Zero to Render" Campaign

**El objetivo no es awareness. Es ACTIVACION.** 500 desarrolladores que realmente hagan un render. Eso requiere eliminar TODA friccion.

#### Plan dia por dia

**Pre-lanzamiento (Dia -2 a 0): Preparar la maquinaria**

1. **Crear un "1-Click Starter"**: Template en GitHub (o boton "Deploy to Replit/CodeSandbox") que con UNA accion te da un proyecto funcional que hace un render. El developer solo necesita pegar su API key
2. **Landing page dedicada**: shotstack.io/first-render con:
   - Sign up → API key (sandbox gratuito, sin tarjeta)
   - "Copy this code" (3 lineas para tu primer render)
   - Video de 90 segundos mostrando el resultado
3. **Definir "render exitoso"**: Status 200 del endpoint de render + video descargable. Trackeable via API analytics

**Dia 1-2: Blitz de contenido**

4. **Blog post**: "Your First Video Render in Under 5 Minutes" (titulo aspiracional y concreto)
5. **Twitter/X thread**: Live-coding thread: "I just rendered a video with 3 lines of code. Here's how 🧵" con el JSON pegado inline
6. **YouTube Short / TikTok**: Speedrun visual "Code → Video in 60 seconds"
7. **Dev.to + Hashnode**: Articulo con tutorial paso a paso

**Dia 2-4: Activacion via comunidad**

8. **Challenge en Twitter/X**: "#FirstRender Challenge - Muestra tu primer video generado con Shotstack. Los mejores 10 ganan creditos de produccion ($50 cada uno)"
9. **Reddit engagement**: Posts genuinos en r/webdev, r/node, r/Python con el angulo "acabo de descubrir que puedes generar videos con una API"
10. **Discord / Slack communities**: Compartir en comunidades de JS, Python, AI builders
11. **Partnership rapido**: Contactar 5-10 dev influencers de YouTube/Twitter con >10K followers. Ofrecerles early access + creditos. Solo necesitas que 2-3 hagan un tweet o video

**Dia 4-6: Email + Retargeting**

12. **Email a base existente de Shotstack**: "Did you know you can render your first video in 5 minutes?" con CTA directo
13. **Drip de onboarding**: Para los que se registraron pero no hicieron render: email a las 24h con "You're 1 step away from your first render" + link directo al starter
14. **Retargeting ads**: A quienes visitaron /first-render pero no se registraron (bajo presupuesto, ~$200-500 en 3 dias)

**Dia 6-7: Push final + hackathon relampago**

15. **Mini-hackathon de 48h**: "Build anything with Shotstack - best demo wins $500 in credits". Requisito: al menos 1 render exitoso
16. **Leaderboard publico**: Mostrar en tiempo real cuantos renders van (gamification)
17. **Direct outreach**: Contactar 50-100 developers de la base que tienen API key pero 0 renders con mensaje personalizado

#### Por que esta estrategia

- **Friccion cero**: El "1-Click Starter" elimina la barrera #1 (setup). Si un dev tarda mas de 5 minutos en su primer render, lo pierdes
- **Multi-canal pero concentrado**: No estoy en 20 canales. Estoy en los 5-6 donde viven los developers, con un mensaje UNICO: "tu primer render en 5 minutos"
- **Incentivos alineados**: El challenge y hackathon no premian signups vacios sino renders reales
- **La base existente es oro**: Shotstack tiene 50,000+ developers registrados. Muchos probablemente nunca hicieron un render. Reactivar un % de ellos es el quick win mas grande
- **Medible en tiempo real**: Cada render es un API call trackeable. Puedo ver el progreso minuto a minuto y ajustar

#### Matematica de la confianza
- Base existente reactivada (email blast): ~100-150 renders
- Contenido organico (blog, Twitter, Dev.to, Reddit): ~100-150 renders
- Challenge #FirstRender + influencers: ~100-150 renders
- Mini-hackathon + push final: ~50-100 renders
- **Total estimado: 400-550 renders** (el rango alto si los influencers enganchan)

Si se queda corto, dia 5-6 puedo invertir $300-500 en Twitter/Reddit ads apuntando a developers con el mensaje "render your first video in 5 min" y el starter link.

---

## 3. Tips para el Video

### Formato y delivery
- **Loom** es perfecto (ya lo sugirieron)
- **2-3 minutos** por pregunta. No te pases. Mejor quedarte corto y conciso
- Activa la webcam. Es Developer Advocate - quieren ver como comunicas
- Screencast + cara en esquina es ideal para las preguntas 1 y 4 si quieres mostrar algo visual

### Actitud
- **No buscan respuestas "correctas"**, buscan tu forma de pensar
- Se honesto: "No conozco el EdTech market en profundidad, pero asi es como lo validaria..." es mejor que fingir expertise
- Muestra entusiasmo genuino por el producto. Menciona algo especifico que te parecio cool (ej: que Spotify genera 30K videos/dia con Shotstack)
- Usa datos concretos cuando puedas (los numeros de esta guia)

### Errores a evitar
- No leer un script. Ten bullet points y habla naturalmente
- No hablar solo de "que harias" sino tambien de "por que" y "como sabrias si funciona"
- No ser generico ("publicar en redes sociales"). Se especifico ("Thread en Twitter/X con el JSON inline del render, mostrando que son 15 lineas de codigo")
- No olvidar mencionar metricas. Un DevRel que no mide, no escala

### Estructura recomendada para cada respuesta
1. **Hook** (10 seg): Posiciona el problema o la oportunidad
2. **Framework** (30 seg): Explica tu enfoque a alto nivel (3-4 pasos)
3. **Detalle** (1-1.5 min): Profundiza en los pasos mas importantes con especificos
4. **Medicion** (20 seg): Como sabrias que funciona
5. **Cierre** (10 seg): Por que esto es lo correcto para Shotstack

---

## 4. Referencia Rapida del Producto

### Endpoints principales
```
POST https://api.shotstack.io/v1/render     → Iniciar render
GET  https://api.shotstack.io/v1/render/{id} → Status del render
POST https://api.shotstack.io/v1/ingest      → Subir assets
GET  https://api.shotstack.io/v1/serve/{id}  → Assets hosteados
POST https://api.shotstack.io/v1/create      → AI asset generation
```

### Autenticacion
Header: `x-api-key: YOUR_API_KEY`

### Entornos
- Sandbox (staging): Para desarrollo, gratis
- Production (v1): Para uso real, con creditos

### JSON basico de un render
```json
{
  "timeline": {
    "tracks": [
      {
        "clips": [
          {
            "asset": {
              "type": "video",
              "src": "https://example.com/video.mp4"
            },
            "start": 0,
            "length": 5
          }
        ]
      },
      {
        "clips": [
          {
            "asset": {
              "type": "title",
              "text": "Hello World"
            },
            "start": 0,
            "length": 5
          }
        ]
      }
    ]
  },
  "output": {
    "format": "mp4",
    "resolution": "hd"
  }
}
```

### Concepto clave: Tracks y Clips
- **Tracks** = layers (como Photoshop). Track 0 es el fondo, Track N esta encima
- **Clips** = elementos dentro de un track con posicion temporal (start + length)
- **Assets** = el contenido del clip (video, image, title, audio, html, luma)
- **Transitions** = efectos entre clips (fade, slideLeft, slideRight, etc.)

---

## 5. Links Utiles para Revisar

- [Documentacion API](https://shotstack.io/docs/api/)
- [Tutoriales y Guias](https://shotstack.io/learn/how-to)
- [Hello World Tutorial](https://shotstack.io/learn/hello-world/)
- [Case Study Spotify](https://shotstack.io/learn/spotify-case-study/)
- [Case Study IKEA](https://shotstack.io/learn/grupo-w-case-study/)
- [Case Study MY VIVENDA](https://shotstack.io/learn/tradepending-creates-thousands-videos-daily-with-shotstack/)
- [GitHub - Shotstack org](https://github.com/shotstack)
- [Pricing](https://shotstack.io/pricing/)
- [Vertical: Real Estate](https://shotstack.io/solutions/industries/real-estate/)
- [Vertical: Ecommerce](https://shotstack.io/solutions/automated-video/)
- [Competidores](https://shotstack.io/vs/)
- [Create API (AI)](https://shotstack.io/product/create-api/)
- [Studio SDK](https://shotstack.io/product/sdk/video-editor-sdk/)
