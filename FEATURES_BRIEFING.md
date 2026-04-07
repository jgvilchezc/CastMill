# Castmill — Feature Development Briefing

> Este documento sirve como contexto completo para planificar e implementar nuevas features en el proyecto Castmill.
> Léelo todo antes de escribir cualquier código o plan.

---

## 1. Qué es el proyecto

ExpandCast es una plataforma SaaS de generación de contenido para podcasters. El flujo principal es:

1. Usuario sube un archivo de audio o video
2. Se transcribe con Groq Whisper (modelo `whisper-large-v3-turbo`)
3. Con el transcript, el usuario genera contenido derivado en múltiples formatos
4. Puede detectar momentos virales del episodio para clips de TikTok/Reels

**URL de producción implícita:** `expandcast.com` (aparece en headers de OpenRouter).

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router (React 19, TypeScript) |
| Estilos | Tailwind CSS 4 + shadcn/ui (new-york, neutral) |
| Backend/DB | Supabase (Postgres + Auth + Storage) |
| Transcripción | Groq Whisper (`whisper-large-v3-turbo`) — límite 25MB |
| AI Generation | OpenRouter (`stepfun/step-3.5-flash:free` con fallbacks) |
| Imágenes AI | FLUX.1-schnell (para thumbnails) |
| Video en browser | FFmpeg WASM (`@ffmpeg/ffmpeg`) |
| Pagos | LemonSqueezy (webhook en `/api/webhooks/lemonsqueezy`) |
| Animaciones | Framer Motion |
| Path alias | `@/*` → `./src/*` |

**Variables de entorno clave:**
- `GROQ_API_KEY` — transcripción
- `OPENROUTER_API_KEY` — generación de contenido
- `USE_REAL_AI=true` — flag para activar AI real (sin esto devuelve mock)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — para admin client

---

## 3. Estructura de archivos clave

```
src/
├── app/
│   ├── (app)/                          # Rutas autenticadas
│   │   ├── dashboard/page.tsx          # Lista de episodios (grid)
│   │   ├── upload/page.tsx             # Subida + transcripción
│   │   ├── episode/[id]/page.tsx       # Vista de episodio (Transcript | Content | Clips tabs)
│   │   ├── channel/page.tsx            # Lista de canales YouTube
│   │   ├── channel/[channelId]/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx                  # Sidebar + Header
│   ├── api/
│   │   ├── ai/
│   │   │   ├── generate/route.ts       # Genera blog/tweets/linkedin/newsletter/youtube_desc
│   │   │   ├── generate-thumbnail/route.ts
│   │   │   ├── transcribe/route.ts     # Groq Whisper
│   │   │   ├── detect-moments/route.ts # Viral moments para clips
│   │   │   ├── generate-hooks/route.ts # Hook Lab
│   │   │   ├── analyze-voice/route.ts  # Voice profile
│   │   │   └── inspire/route.ts
│   │   ├── auth/{tiktok,instagram}/    # OAuth para publicación directa
│   │   ├── publish/{tiktok,instagram}/ # Publicación directa
│   │   ├── trends/digest/route.ts      # Trend digest (Pro)
│   │   ├── youtube/                    # Importar/analizar canales YT
│   │   ├── checkout/route.ts           # LemonSqueezy checkout
│   │   └── webhooks/lemonsqueezy/      # Webhook de pagos
│   └── admin/                          # Panel admin (users, stats, preview)
│
├── components/
│   ├── content/
│   │   ├── ContentHub.tsx              # Tabs de formatos de contenido
│   │   ├── ContentPanel.tsx            # Panel individual por formato (render-only, sin edición)
│   │   └── GenerationSettingsBar.tsx   # Controles: tone, language, length, format options
│   ├── transcript/
│   │   └── TranscriptView.tsx          # Vista read-only del transcript con segmentos
│   ├── clips/
│   │   ├── ClipsHub.tsx                # Contenedor de clips (detect moments + Hook Lab + Clip gen)
│   │   ├── MomentCard.tsx              # Card de momento viral
│   │   ├── HookLab.tsx                 # Generador de hooks
│   │   ├── EpisodeClipGenerator.tsx    # Generador de clips
│   │   └── TrendBanner.tsx             # Banner de tendencias (Pro)
│   ├── channel/                        # Todo lo relacionado con canales YouTube
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileSidebar.tsx
│   └── upload/DropZone.tsx
│
└── lib/
    ├── context/
    │   ├── episode-context.tsx         # Estado global de episodios, transcripts, generations
    │   └── user-context.tsx            # Estado de usuario, plan, créditos
    ├── plans.ts                        # Definición de planes y sus features
    ├── generation-params.ts            # Parámetros de generación (tone, length, language, formatOptions)
    └── supabase/
        ├── client.ts
        ├── server.ts
        ├── admin.ts
        └── types.ts                    # Tipos generados de la DB
```

---

## 4. Modelos de datos (Supabase)

### Tablas principales

**`episodes`**
```
id, user_id, title, description, duration, topics[], guests[], 
status (ready|processing|failed), generation_count, thumbnail_url, 
viral_moments (jsonb), created_at
```

**`transcripts`**
```
id, episode_id, user_id, text (full transcript), segments (jsonb array), created_at
```
> Los `segments` de Whisper tienen: `{ speaker: string, text: string, startTime: number, endTime: number }`

**`generations`**
```
id, episode_id, user_id, format (blog|tweet_thread|linkedin|newsletter|youtube_desc|thumbnail), 
content (text), status (ready|generating), created_at
-- UNIQUE constraint: (episode_id, format) — solo 1 generation por formato por episodio
```

**`profiles`**
```
id, name, email, plan (free|starter|pro), credits, avatar_url,
episodes_used_this_month, billing_period_start
```

**`voice_profiles`**
```
id, user_id, tone[], vocabulary[], pacing[], commonHooks[], created_at
```

---

## 5. Sistema de planes actual

| Feature | Free | Starter ($19/mo) | Pro ($49/mo) |
|---------|------|-----------------|-------------|
| Episodios/mes | 2 | 8 | 25 |
| Formatos | blog, tweets, linkedin | + newsletter, youtube, thumbnail | mismo |
| Canales YouTube | 1 | 2 | 5 |
| Voice Profile | ❌ | ✅ | ✅ |
| Clips enabled | ❌ | ✅ (3/episodio) | ✅ (8/episodio) |
| Trend Digest | ❌ | ❌ | ✅ |
| Channel Optimizer | ❌ | ❌ | ✅ |
| Publish Direct (TikTok/Instagram) | ❌ | ❌ | ✅ |

El archivo de planes está en `src/lib/plans.ts`. Para añadir features a planes, se agrega la propiedad en `PlanConfig` y se usa en los componentes via `PLANS[user.plan].nuevaFeature`.

---

## 6. Patrones de código a seguir

### API route (server)
```typescript
// src/app/api/ai/nueva-feature/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.USE_REAL_AI !== 'true') {
    return NextResponse.json({ error: "AI not configured" }, { status: 501 });
  }
  // ...
}
```

### Nuevo formato de contenido
1. Añadir el literal al tipo `ContentFormat` en `episode-context.tsx` y en `plans.ts`
2. Añadir al array `formats` de los planes correspondientes en `plans.ts`
3. Añadir a `TABS` en `ContentHub.tsx` con `requiredPlan`
4. Añadir `buildFormatInstructions` case en `generate/route.ts`
5. Añadir `FormatOptions` interface en `generation-params.ts` si tiene opciones propias

### Componente nuevo
- Usar `"use client"` si tiene estado o event handlers
- Usar `cn()` de `@/lib/utils` para clases condicionales
- Usar shadcn/ui components de `@/components/ui/`
- Usar Lucide icons
- Estilos: Tailwind CSS 4, seguir el estilo visual del proyecto (borders `border-border`, texto `text-muted-foreground`, etc.)

---

## 7. Features a implementar — Lista completa

A continuación están las **10 features** identificadas como mejoras prioritarias basadas en investigación de mercado (comparativa con Descript, Castmagic, Riverside) y análisis del código actual.

---

### FEATURE 1: Transcript editable con búsqueda
**Prioridad:** 🔥 Alta | **Esfuerzo:** Medio

**Problema actual:** `TranscriptView` es completamente read-only. Los podcasters necesitan corregir nombres propios, términos técnicos y errores de Whisper. No hay forma de buscar dentro del transcript.

**Implementación:**

1. **Modificar `TranscriptView.tsx`** para añadir:
   - Estado `isEditing: boolean` por segmento (click-to-edit inline)
   - `<textarea>` que reemplaza el `<p>` al hacer click en un segmento
   - Botón "Save" que llama a `updateTranscript(episodeId, newText, newSegments)` del EpisodeContext
   - Input de búsqueda en la parte superior que filtra/resalta segmentos coincidentes
   - Botón para salir de edición sin guardar

2. **El transcript.text** debe reconstruirse concatenando todos los `segments[].text` al guardar.

3. **No requiere cambios en la API** — `updateTranscript` en el contexto ya hace upsert.

**UX:** El segmento en edición muestra un textarea con el texto del segmento. Los demás segmentos muestran texto normal. Botones "Save all changes" y "Cancel" al footer de la sección de edición.

---

### FEATURE 2: Chapters / Timestamps como formato de contenido
**Prioridad:** 🔥 Alta | **Esfuerzo:** Bajo

**Problema actual:** El formato `youtube_desc` tiene una opción para incluir capítulos estimados, pero lo hace con timestamps *aproximados* por LLM. Los `segments` de Whisper tienen timestamps **reales**. No existe un formato dedicado de capítulos.

**Implementación:**

1. **Nuevo formato `chapters`** — Añadir a `ContentFormat`:
   ```typescript
   // plans.ts
   export type ContentFormat = "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail" | "chapters";
   ```

2. **Añadir a planes** (todos, incluyendo free — es un hook de valor):
   ```typescript
   formats: ["blog", "tweet_thread", "linkedin", "chapters"]  // free
   ```

3. **Nueva API route** `src/app/api/ai/generate-chapters/route.ts`:
   - Recibe `transcript`, `segments` (array con `startTime` y `text`)
   - Usa LLM para agrupar segmentos en 5-10 capítulos semánticos (por cambio de tema, no por silencios)
   - Devuelve formato: `00:00 Introducción\n02:34 Tema 1...\n`
   - Incluir timestamps reales de los segmentos, no estimados

4. **Alternativa más simple (sin LLM):** Dividir el transcript en chunks de ~5 minutos usando los timestamps de los segmentos y pedir al LLM un título para cada chunk. Más rápido y predecible.

5. **ContentPanel para chapters:** Mostrar la lista de capítulos en un formato limpio. Añadir botón "Copy for YouTube" que genera el formato `00:00 Título`.

6. **Añadir a `GenerationSettingsBar`** las opciones: `chapterCount` (5, 7, 10, auto) y `includeDescriptions` (boolean).

---

### FEATURE 3: Quote Puller — extractor de citas destacadas
**Prioridad:** 🔥 Alta | **Esfuerzo:** Bajo

**Problema actual:** No hay forma de extraer las mejores citas del episodio. Es la feature más usada de Castmagic y falta en Castmill.

**Implementación:**

1. **Nuevo formato `quotes`** — Añadir a `ContentFormat`.

2. **Disponible en plan Free** (para mejorar conversión a paid).

3. **En `generate/route.ts`**, añadir case `"quotes"`:
   ```
   "Extract 6-8 of the most impactful, quotable, or thought-provoking statements from this transcript.
   Each quote should be standalone (makes sense without context), under 280 characters, and shareable.
   Format each quote as:
   > [Quote text]
   — [Speaker if identifiable, otherwise omit]
   ```

4. **ContentPanel para quotes:** Renderizar las citas en tarjetas individuales, cada una con su propio botón "Copy". Las citas en cards con borde izquierdo de color (style de blockquote).

5. **No requiere cambios en la API de generate** si se añade el case en `buildFormatInstructions`.

---

### FEATURE 4: Show Notes — formato dedicado
**Prioridad:** 📈 Media | **Esfuerzo:** Bajo

**Problema actual:** No existe un formato de "show notes" — el output estructurado que va en la descripción de la plataforma de podcast (Spotify, Apple Podcasts). Diferente del blog y del youtube_desc.

**Implementación:**

1. **Nuevo formato `show_notes`** — Añadir a `ContentFormat`.

2. **Disponible desde Starter.**

3. **En `generate/route.ts`**, case `"show_notes"`:
   ```
   Write professional podcast show notes. Structure:
   1. Episode summary (2-3 sentences)
   2. Key topics covered (bullet list with timestamps if available)
   3. Guest information (name + 1-sentence bio if guest mentioned)
   4. Key resources/links mentioned (extract URLs or books mentioned, list as [Title])
   5. Timestamps/chapters (5-8 key moments with approximate times)
   6. Connect section (placeholder for social links)
   ```

4. **FormatOptions para show_notes:**
   - `includeGuestBio: boolean` (default: true)
   - `includeResources: boolean` (default: true)
   - `includeTimestamps: boolean` (default: true)

---

### FEATURE 5: Paste-your-transcript (input directo de texto)
**Prioridad:** 🔥 Alta | **Esfuerzo:** Bajo

**Problema actual:** El único modo de entrada es subir un archivo de audio/video. Usuarios con transcripts existentes (de Zoom, Otter.ai, Rev, etc.) no pueden usarlos. También sirve como workaround para el límite de 25MB.

**Implementación:**

1. **Modificar `upload/page.tsx`** para añadir un segundo modo de entrada:
   - Toggle/tabs en la página: "Upload file" | "Paste transcript"
   - En modo "Paste transcript": un `<textarea>` grande para pegar el texto
   - Campos adicionales: título del episodio (requerido), duración en minutos (opcional)
   - Botón "Create episode from transcript"

2. **Flujo al enviar:**
   - Llama a `addEpisode()` con los datos básicos
   - Llama directamente a `updateTranscript(episodeId, pastedText, [])` — sin pasar por `/api/ai/transcribe`
   - Consume un episodeCredit igual
   - Redirige a `/episode/[id]`

3. **Los segments quedarán vacíos `[]`** al pegar texto plano — el TranscriptView tiene el fallback para mostrar el `transcript.text` raw. Esto es aceptable.

4. **No requiere cambios en la API.**

---

### FEATURE 6: Compresión de audio para superar el límite de 25MB
**Prioridad:** 🔥 Alta | **Esfuerzo:** Bajo

**Problema actual:** Groq Whisper acepta máximo 25MB. Un episodio de 1 hora en MP3 a 128kbps = ~57MB. Los usuarios obtienen un error frustrante. El código ya usa FFmpeg WASM para extraer audio de video.

**Implementación:**

1. **Modificar `extractAudio()` en `upload/page.tsx`** para que siempre comprima:
   - Cambiar el bitrate de salida: actualmente `-q:a 5` (equivale a ~128kbps)
   - Usar `-b:a 32k -ar 16000 -ac 1` para mono 32kbps (calidad suficiente para voz)
   - A 32kbps, 2 horas de audio = ~14MB. Cubre la gran mayoría de episodios.

2. **Aplicar esta compresión siempre**, no solo para video:
   - Crear función `compressAudioForWhisper(file: File): Promise<File>` que usa FFmpeg WASM
   - Llamarla antes de subir si el archivo supera ~20MB (para dar margen)
   - Mostrar en el progress: "Compressing audio for upload..."

3. **Actualizar el mensaje de error** para explicar mejor qué hacer si aún falla (episodios >4h).

4. **No requiere cambios en la API.**

---

### FEATURE 7: Content editor inline — editar antes de copiar
**Prioridad:** 📈 Media | **Esfuerzo:** Medio

**Problema actual:** `ContentPanel` muestra el contenido generado con `MarkdownContent` (render read-only). Los usuarios quieren tweakear el texto antes de copiarlo/publicarlo. La versión editada no se puede guardar en DB.

**Implementación:**

1. **Añadir modo edición en `ContentPanel.tsx`:**
   - Botón "Edit" en la action bar (junto a Copy y Download)
   - Al hacer click: switch de `MarkdownContent` a un `<textarea>` con el mismo contenido (o mejor: rich text editor mínimo)
   - En modo edición: botones "Save" y "Cancel"
   - "Save" llama a un nuevo `updateGeneration(episodeId, format, newContent)` en el contexto

2. **Añadir `updateGeneration` al EpisodeContext:**
   ```typescript
   updateGeneration: (episodeId: string, format: ContentFormat, content: string) => Promise<void>
   ```
   - Hace upsert en la tabla `generations` con el nuevo content
   - Actualiza el estado local

3. **Indicador visual:** Mostrar un badge "Edited" cuando el contenido ha sido modificado manualmente.

4. **Los contenidos editados no deben regenerarse automáticamente** en `handleGenerateAll` si ya tienen el badge "Edited" (a menos que el usuario lo confirme).

---

### FEATURE 8: Generación paralela de todos los formatos
**Prioridad:** 📈 Media | **Esfuerzo:** Bajo — solo refactor

**Problema actual:** En `ContentHub.tsx`, `handleGenerateAll` genera los formatos **secuencialmente** con un `await` por formato dentro de un `for...of`. Con 6 formatos y ~20-40s cada uno, "Generate All" puede tomar 2-4 minutos.

**Implementación:**

1. **Refactorizar `handleGenerateAll` en `ContentHub.tsx`:**
   ```typescript
   // Antes (secuencial):
   for (const format of formats) {
     await generateContent(episodeId, format, params)
   }

   // Después (paralelo):
   await Promise.allSettled(
     formats.map(format => generateContent(episodeId, format, params))
   )
   ```

2. **Ajustar el estado de `pendingFormats`** para que todos los formatos se marquen como "generating" antes de iniciar las llamadas paralelas.

3. **Nota:** `generateContent` en el contexto llama a `/api/ai/generate` que tiene `maxDuration = 60`. Verificar que el servidor (Vercel/local) soporta múltiples requests concurrentes.

---

### FEATURE 9: Búsqueda full-text en episodios y transcripts
**Prioridad:** 📈 Media | **Esfuerzo:** Medio

**Problema actual:** Con muchos episodios no hay forma de buscar "¿en qué episodio hablé de X?". El dashboard solo muestra la grid de episodios sin búsqueda.

**Implementación:**

1. **Input de búsqueda en `dashboard/page.tsx`:**
   - Search input en la parte superior de la página
   - Búsqueda local sobre `episodes[].title` y `episodes[].topics` (instantánea, sin API)
   - Para búsqueda en transcript: botón "Search in transcripts" que hace una llamada a la API

2. **Nueva API route `src/app/api/search/route.ts`:**
   - Usa Supabase full-text search: `supabase.from('transcripts').select('episode_id').textSearch('text', query)`
   - Devuelve los `episode_id` que contienen la query
   - Los resalta en la UI

3. **Supabase full-text search** requiere un índice en la columna `text` de `transcripts`:
   ```sql
   CREATE INDEX transcripts_text_fts ON transcripts USING gin(to_tsvector('english', text));
   ```
   Incluir esta migración en `supabase/schema.sql` (o en una nota de migración).

4. **UX:** Resaltar los episodios que coinciden. Mostrar el fragmento del transcript donde aparece la búsqueda.

---

### FEATURE 10: RSS feed auto-import
**Prioridad:** 🗓 Larga | **Esfuerzo:** Alto

**Problema actual:** Los podcasters tienen sus episodios en plataformas (Spotify, Apple, Buzzsprout). Subir manualmente cada episodio es el mayor punto de fricción. Un RSS import eliminaría este paso completamente.

**Implementación:**

1. **Nueva sección en `settings/page.tsx`** — "RSS Feed":
   - Input para pegar URL de RSS feed
   - Botón "Import" y "Auto-sync (Pro)"

2. **Nueva API route `src/app/api/rss/import/route.ts`:**
   - Parsea el feed XML con `fast-xml-parser` o similar
   - Extrae episodios: `<item>` con `<title>`, `<enclosure url>` (audio), `<pubDate>`, `<description>`, `<itunes:duration>`
   - Para cada episodio nuevo (que no exista ya en DB por título+fecha): descarga el audio via URL, sube a Supabase Storage, llama a `/api/ai/transcribe`
   - Respeta los límites del plan

3. **Auto-sync (Pro):** Guardar la URL del feed en el perfil del usuario. Un cron job (o webhook de Vercel) llama periódicamente al endpoint para importar nuevos episodios.

4. **Nueva tabla en Supabase:** `rss_feeds(id, user_id, feed_url, last_synced_at, episode_guids[])`

5. **Consideraciones:** Los archivos de audio de feeds suelen ser >25MB. Necesita la feature 6 (compresión) para funcionar bien. También requiere descargar el audio server-side (no client-side), lo cual es diferente al flujo actual.

---

## 8. Orden de implementación recomendado

| Orden | Feature | Por qué primero |
|-------|---------|----------------|
| 1 | **Feature 6** — Compresión de audio | Desbloquea a todos los usuarios con episodios largos, mínimo esfuerzo |
| 2 | **Feature 5** — Paste transcript | Elimina fricción de onboarding, no requiere API |
| 3 | **Feature 3** — Quote Puller | Nuevo formato free, mejora conversión, ~1h de trabajo |
| 4 | **Feature 2** — Chapters | Nuevo formato muy pedido, usa timestamps reales de Whisper |
| 5 | **Feature 4** — Show Notes | Nuevo formato dedicado, complementa chapters |
| 6 | **Feature 8** — Generación paralela | Mejora UX significativa, refactor simple |
| 7 | **Feature 1** — Transcript editable | Más trabajo pero muy diferenciador |
| 8 | **Feature 7** — Content editor | Requiere nuevo método en contexto |
| 9 | **Feature 9** — Búsqueda full-text | Requiere migración de DB |
| 10 | **Feature 10** — RSS import | Mayor esfuerzo, más infraestructura |

---

## 9. Constraints y notas técnicas

- **No modificar ni eliminar comentarios existentes** en el código. No añadir comentarios nuevos salvo que sean estrictamente necesarios para explicar lógica no obvia.
- **El único constraint de DB existente importante:** `generations` tiene unique constraint en `(episode_id, format)` — una sola generation por formato por episodio. Al añadir `chapters`, `quotes`, `show_notes`, asegurarse de que estos valores literales coincidan exactamente con lo que se guarda.
- **Los nuevos formatos** deben añadirse al tipo `ContentFormat` en **dos archivos**: `src/lib/context/episode-context.tsx` y `src/lib/plans.ts`. Ambos definen el tipo independientemente.
- **Supabase types** en `src/lib/supabase/types.ts` son generados automáticamente. Si se añaden columnas a la DB, regenerar con `npx supabase gen types typescript`.
- **La tabla `generations.format`** es de tipo `text` en la DB (no enum), así que añadir nuevos valores no requiere migración de DB para ese campo.
- **shadcn/ui:** Instalar nuevos componentes con `npx shadcn@latest add <component>` si hacen falta.
- **FFmpeg WASM** se carga lazy en el primer uso y queda cacheado en el ref. Reutilizar el mismo patrón para la compresión.

---

## 10. Contexto de investigación de mercado

La investigación realizada (Reddit, HN, comparativas de herramientas 2026) reveló:

- **71% de podcasters** ahora produce video además de audio pero el proceso manual es insostenible
- **1 de cada 3 podcasters** abandona por el tiempo requerido en post-producción
- Las herramientas más solicitadas: show notes automáticas, chapters/timestamps, quote puller, y RSS auto-import
- Competidores directos: **Castmagic** (strong en show notes y timestamps), **Descript** (text-based editing), **Riverside** (recording + AI clips)
- El gap principal de Castmill vs. competencia: falta de transcript editable, capítulos semánticos, y quote puller
- Precio de Castmill (Free/$19/$49) está bien posicionado vs. competencia ($0-$29/$49)
- El límite de 25MB es un bloqueador real para episodios de 1h+

---

*Este documento fue generado el 6 de abril de 2026 basado en análisis del código fuente de Castmill y research de mercado sobre herramientas AI para podcasts.*
