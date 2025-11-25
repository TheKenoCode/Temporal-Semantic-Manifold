## Cultural Ancestry & Traits Explorer

**A research-driven 3D visualization tool** for exploring how cultural traits correlate with ancestral population distributions over time. Built on a temporal-semantic manifold where **x/y** encodes semantic similarity between traits and **z** captures temporal depth.

### ✨ NEW: AI-Powered Topic Visualization

Generate custom visualizations from any topic using GPT-4 and semantic embeddings! Type "Jazz Evolution", "Byzantine Empire", or "Quantum Computing" and watch AI create a complete relationship network with communities, traits, and connections.

### 🔬 Research Data Sources

This tool visualizes **real findings from ancient DNA research and ethnographic databases**:

**Ancient DNA & Population Genetics:**
- Lazaridis et al. (2016) — "Genomic insights into the origin of farming in the ancient Near East" *Nature*
- Mathieson et al. (2018) — "The genomic history of southeastern Europe" *Nature*
- Olalde et al. (2018) — "The Beaker phenomenon and the genomic transformation of northwest Europe" *Nature*
- Narasimhan et al. (2019) — "The formation of human populations in South and Central Asia" *Science*

**Cultural Trait Data:**
- **D-PLACE** (Max Planck Institute) — Database of Places, Language, Culture and Environment
- **Ethnographic Atlas** (Murdock 1967) — EA variable codes referenced throughout
- **HRAF** — Human Relations Area Files
- **SCCS** — Standard Cross-Cultural Sample

---

### Stack

- **Frontend**: Next.js App Router (TypeScript), Tailwind CSS, `@react-three/fiber`, `@react-three/drei`
- **State / Data**: React Query, custom hooks for REST APIs
- **Backend**: Next.js route handlers, Prisma ORM
- **Database**: PostgreSQL via Docker Compose
- **Data generation**: `prisma/seed.ts` with research-backed cultural traits

---

## Ancestry Model

This tool uses the **standard European ancient DNA ancestry framework** from Reich lab and collaborators:

| Component | Abbreviation | Description | Era |
| --- | --- | --- | --- |
| **Western Hunter-Gatherers** | WHG | Mesolithic foragers of Western Europe. Dark skin, blue eyes, forest-adapted | ~15,000–5,000 BCE |
| **Early European Farmers** | EEF | Neolithic farmers from Anatolia. Lighter skin, sedentary, agriculture | ~7,000–4,000 BCE |
| **Steppe Pastoralists** | Steppe | Yamnaya-related. Proto-Indo-European, patrilineal, horse/wagon culture | ~3,300–2,500 BCE |
| **Caucasus Hunter-Gatherers** | CHG | Ancient Caucasus/Iranian populations. Contributed to both Yamnaya and Near East | ~25,000–5,000 BCE |
| **Eastern Hunter-Gatherers** | EHG | Mesolithic Eastern Europeans. Steppe/taiga adapted, ANE ancestry | ~15,000–5,000 BCE |

### Modern Population Ancestry (from published research)

The seed data includes real qpAdm/ADMIXTURE percentages for modern populations:

| Population | WHG | EEF | Steppe | CHG | EHG | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Serbs | 5% | 42% | 38% | 10% | 5% | Mathieson 2018 |
| Croats | 6% | 45% | 35% | 9% | 5% | Mathieson 2018 |
| Bosniaks | 5% | 43% | 36% | 11% | 5% | Mathieson 2018 |
| Greeks | 3% | 58% | 22% | 14% | 3% | Lazaridis 2016 |
| Bulgarians | 4% | 48% | 32% | 12% | 4% | Mathieson 2018 |
| Ukrainians | 6% | 35% | 45% | 7% | 7% | Mathieson 2018 |

---

## Cultural Traits (D-PLACE / Ethnographic Atlas)

Traits are drawn from coded ethnographic variables:

| Category | Examples | EA Codes | Ancestry Correlation |
| --- | --- | --- | --- |
| 🌾 **Subsistence** | Hunting-Gathering, Intensive Agriculture, Pastoralism, Transhumance | EA001-EA005 | WHG: foraging; EEF: farming; Steppe: herding |
| 👥 **Kinship** | Bilateral vs Patrilineal Descent, Patrilocal Residence, Extended Households, Clan Organization | EA007-EA043 | Steppe: patrilineal; WHG: bilateral |
| 🔮 **Religion** | Sky God Worship, Earth/Fertility Goddess, Ancestor Veneration, Kurgan Burial | — | Steppe: sky father; EEF: goddess |
| ⚙️ **Material** | Wheeled Vehicles, Horse Domestication, Bronze Metallurgy, Tell Settlements | — | Steppe: horse/wagon; EEF: tells |
| 🎭 **Artistic** | Epic Heroic Poetry, South Slavic Epics, Sevdalinka Songs | — | Steppe: epic poetry |

### Ancestry Correlation

Each trait has **ancestry correlation weights** showing which population components are most associated with that trait:

```typescript
{
  name: 'Pastoral Nomadism',
  ancestryCorrelation: {
    Steppe: 0.70,  // Strong Yamnaya association
    EHG: 0.15,
    CHG: 0.10,
    EEF: 0.03,
    WHG: 0.02,
  },
  sources: ['D-PLACE EA002', 'Murdock 1967'],
}
```

---

## 3D Visualization Model

- **Semantic plane (x/y)**: Traits with similar meanings cluster together via embedding
- **Temporal axis (z)**: Older traits descend toward `z = -16`, newer rise to `z = 16`
- **Nodes**: Spheres representing cultural traits, colored by dominant ancestry
- **Clusters**: Ellipsoid volumes showing ancestral population influence zones
- **Trajectories**: Curves tracking how lineages transform through population admixture
- **Edges**: Lines showing influence relationships between traits

### Time Evolution

The visualization shows how ancestry and culture transform:

| Epoch | Period | Events |
| --- | --- | --- |
| **T0 (Mesolithic)** | ~15,000–7,000 BCE | Distinct WHG, EHG, CHG populations with separate trait clusters |
| **T1 (Neolithic)** | ~7,000–4,000 BCE | EEF farming expansion, mixing with WHG to form Neolithic Europeans |
| **T2 (Bronze Age)** | ~3,500–1,200 BCE | Steppe migrations, massive genetic & cultural transformation |
| **T3 (Iron Age+)** | ~1,200 BCE onwards | Regional diversification into Balkan, Nordic, and other variants |

---

## Getting Started

### Quick Start (Research Data Mode)

1. **Copy environment variables**

   ```bash
   cp env.sample .env
   ```

2. **Launch Postgres**

   ```bash
   docker compose up -d
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run migrations**

   ```bash
   npm run prisma:migrate
   ```

5. **Seed the research data**

   ```bash
   npm run db:seed
   ```

   This creates:
   - 5 ancestral components (WHG, EEF, Steppe, CHG, EHG)
   - 27 cultural traits with ancestry correlation weights
   - 135+ trait relationship edges

6. **Start the dev server**

   ```bash
   npm run dev
   ```

7. **Explore** at [http://localhost:3000](http://localhost:3000)

### AI-Powered Generation Setup

To enable AI-powered topic visualization:

1. **Get an OpenAI API key** from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

2. **Add to your `.env` file:**

   ```bash
   OPENAI_API_KEY="sk-your-actual-api-key-here"
   ```

3. **Validate your setup:**

   ```bash
   npm run validate-setup
   ```

   This checks:
   - ✅ OpenAI API key is configured
   - ✅ Database connection works
   - ✅ Schema migrations are applied
   - ✅ Embeddings are functional

4. **Start generating!**
   
   - Open the app and toggle to "AI Generated" mode
   - Enter any topic (e.g., "Renaissance Art", "Ancient Egypt", "Machine Learning")
   - Click "Generate Visualization"
   - Watch as GPT-4 creates a complete semantic network in ~10-15 seconds

---

## Using the Explorer

### Data Mode Selection

**Research Data Mode:**
- Curated cultural traits from peer-reviewed ancient DNA studies
- Ancestry model (WHG, EEF, Steppe, CHG, EHG)
- Real ethnographic data from D-PLACE and Murdock's Ethnographic Atlas

**AI Generated Mode:**
- Generate custom visualizations from any topic
- Automatic community detection (ancestry model or custom categories)
- Semantic embeddings for intelligent trait positioning
- 20-30 concepts with rich relationships

### Navigation

- **Orbit**: Click and drag to rotate the view
- **Zoom**: Scroll wheel to zoom in/out
- **Pan**: Right-click and drag to pan

### Time Controls

- **Play/Pause**: Animate through cultural epochs
- **Scrub**: Drag the timeline slider to any point
- **Speed**: Adjust playback speed (0.25× to 4×)
- **Epoch buttons**: Jump to Early, Expansion, Merge, Split phases

### Inspecting Traits

1. **Hover** over a node to see trait name and dominant ancestry
2. **Click** a node to open the Trait Inspector panel
3. The inspector shows:
   - Trait name and category
   - Time period
   - Ancestry contributions (like admixture percentages)
   - Academic sources (research mode) or AI-generated description
   - Incoming/outgoing influences

### Display Options

- **Show/Hide Edges**: Toggle relationship lines
- **Show/Hide Labels**: Toggle trait labels
- **Show/Hide Trajectories**: Toggle lineage path curves

### AI Generation Options

**Generation Modes:**

- **Hybrid** (Recommended): AI decides whether to use ancestry model or create custom categories
- **Ancestry**: Force mapping to WHG/EEF/Steppe/CHG/EHG (best for historical/cultural topics)
- **Custom**: Always create topic-specific categories (best for modern/abstract topics)

**Example Topics:**

| Topic | Mode | Result |
| --- | --- | --- |
| Ancient Rome | Hybrid → Ancestry | Maps to EEF/Steppe heritage with Roman-specific traits |
| Byzantine Empire | Ancestry | Shows EEF/Steppe/Iranian mixture in Byzantine culture |
| Jazz Evolution | Custom | Categories: Origins, Bebop, Cool Jazz, Fusion, Modern |
| Coffee Culture | Custom | Categories: Origins, Processing, Brewing Methods, Social |
| Silk Road Trade | Hybrid | Mix of ancestry populations + trade-specific communities |

---

## API Overview

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/communities` | GET | Returns ancestral populations with ancestry model metadata |
| `/api/nodes?from=&to=&communityId=` | GET | Returns cultural traits with ancestry correlations |
| `/api/edges?from=&to=&nodeIds=` | GET | Returns trait relationships (semantic, derived_from, diffusion) |
| `/api/generate` | POST | **NEW:** Generate visualization from topic using AI |
| `/api/generate?generated=true` | GET | **NEW:** List all AI-generated visualizations |

### AI Generation API

**POST /api/generate**

Request body:
```json
{
  "topic": "Ancient Rome",
  "mode": "hybrid" // or "ancestry" | "custom"
}
```

Response:
```json
{
  "success": true,
  "topic": "Ancient Rome",
  "stats": {
    "communities": 5,
    "nodes": 25,
    "edges": 48
  },
  "data": { ... }
}
```

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma         # Community / Node / Edge models
│   └── seed.ts               # Research-backed cultural traits
├── src/
│   ├── app/api/              # REST endpoints
│   ├── app/page.tsx          # Main explorer UI
│   ├── components/
│   │   ├── manifold-scene.tsx   # 3D React-Three-Fiber scene
│   │   └── trait-inspector.tsx  # Ancestry contribution panel
│   ├── data/
│   │   └── exampleTemporalManifold.ts  # Demo ancestry evolution
│   ├── hooks/use-manifold-data.ts
│   └── lib/culture-embedding.ts  # Trait embedding utilities
```

---

## AI Architecture

### Embedding System

The system now uses **OpenAI's text-embedding-3-small** (1536 dimensions) for real semantic embeddings:

- **Automatic fallback**: Uses deterministic embeddings if API key is missing
- **Batch processing**: Efficiently embeds multiple texts at once
- **Semantic clustering**: Similar concepts naturally group together in 3D space

### Generation Pipeline

1. **Topic Analysis** (GPT-4)
   - Analyzes the topic to determine if it relates to historical ancestry
   - Decides whether to use ancestry model or create custom communities
   
2. **Data Generation** (GPT-4 with JSON mode)
   - Creates 3-5 communities (population groups or categories)
   - Generates 20-30 nodes (cultural traits or concepts)
   - Defines 40-80 edges (relationships between concepts)
   - Assigns community weights (like genetic admixture)

3. **Embedding Creation** (text-embedding-3-small)
   - Generates semantic embeddings for each concept
   - Positions nodes in meaningful clusters
   
4. **Database Persistence**
   - Saves all generated data with `generatedFrom` topic tag
   - Creates Community → Node → NodeCommunity → Edge relationships
   - Enables future retrieval and comparison

### Cost Estimation

Per generation:
- GPT-4: ~3,000 tokens (~$0.03)
- Embeddings: ~25 texts (~$0.0001)
- **Total: ~$0.03 per visualization**

---

## Key Academic References

1. **Lazaridis I, et al.** (2016). Genomic insights into the origin of farming in the ancient Near East. *Nature* 536, 419–424.

2. **Mathieson I, et al.** (2018). The genomic history of southeastern Europe. *Nature* 555, 197–203.

3. **Olalde I, et al.** (2018). The Beaker phenomenon and the genomic transformation of northwest Europe. *Nature* 555, 190–196.

4. **Anthony DW.** (2007). *The Horse, the Wheel, and Language*. Princeton University Press.

5. **Kirby KR, et al.** (2016). D-PLACE: A Global Database of Cultural, Linguistic and Environmental Diversity. *PLOS ONE* 11(7): e0158391.

6. **Murdock GP.** (1967). Ethnographic Atlas: A Summary. *Ethnology* 6(2): 109–236.

---

## What Makes This Unique

This tool provides **novel visualization capabilities** not available elsewhere:

✅ **Ancestry-weighted trait positioning** — Cultural traits are positioned in semantic space based on their ancestral component correlations  
✅ **Temporal evolution animation** — Watch how ancestry patterns and traits transform through Bronze Age migrations  
✅ **Research-backed data** — All ancestry percentages come from peer-reviewed ancient DNA studies  
✅ **Ethnographic trait coding** — Cultural traits reference real EA/D-PLACE variable codes  
✅ **Interactive trait inspection** — Click any trait to see its full ancestry breakdown and influences  

---

Explore how cultural traits correlate with ancient ancestry across time! 🧬🌍
