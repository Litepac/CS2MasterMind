"""
CS2 Highlight Report Generator — Interactive HTML
"""

import json
from pathlib import Path
from datetime import datetime


def generate_report(highlights: list, demo_info: dict, output_dir: str | Path = "output") -> dict[str, Path]:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    demo_name = demo_info.get("demo_name", "unknown")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"{demo_name}_{timestamp}"

    highlights_data = [h.to_dict() for h in highlights]

    json_path = output_dir / f"{base_name}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "demo": demo_name,
            "map": demo_info.get("map", "unknown"),
            "generated_at": datetime.now().isoformat(),
            "total_highlights": len(highlights_data),
            "players": demo_info.get("players", []),
            "highlights": highlights_data,
        }, f, indent=2, ensure_ascii=False, default=str)

    html_path = output_dir / f"{base_name}.html"
    html = _build_html(highlights_data, demo_info)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n  Report saved:")
    print(f"    HTML: {html_path}")
    print(f"    JSON: {json_path}")

    return {"html": html_path, "json": json_path}


def _build_html(highlights: list, demo_info: dict) -> str:
    demo_name = demo_info.get("demo_name", "unknown")
    map_name = demo_info.get("map", "unknown")
    ticks = demo_info.get("duration_ticks", 0)
    duration_min = round(ticks / 64 / 60, 1)
    players = demo_info.get("players", [])

    highlights_json = json.dumps(highlights, ensure_ascii=False, default=str)
    players_json = json.dumps(players, ensure_ascii=False, default=str)

    return f"""<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CS2 Highlights — {demo_name}</title>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #05090f;
    --bg2: #0a1420;
    --bg3: #0f1e2e;
    --border: #1a3a5c;
    --accent: #ff6b00;
    --accent2: #00c8ff;
    --gold: #ffd700;
    --green: #00e87a;
    --purple: #a855f7;
    --red: #ff3c3c;
    --text: #c8dcea;
    --muted: #4a7fa5;
    --font-display: 'Rajdhani', sans-serif;
    --font-mono: 'Share Tech Mono', monospace;
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-display);
    font-size: 15px;
    min-height: 100vh;
    overflow-x: hidden;
  }}

  body::before {{
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.015) 2px, rgba(0,200,255,0.015) 4px);
    pointer-events: none;
    z-index: 0;
  }}

  .wrap {{ position: relative; z-index: 1; max-width: 1400px; margin: 0 auto; padding: 24px; }}

  /* HEADER */
  .header {{
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
    gap: 20px;
    flex-wrap: wrap;
  }}
  .header-left h1 {{
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2px;
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 6px;
  }}
  .header-left h1 span {{ color: var(--accent); }}
  .header-meta {{
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-top: 8px;
  }}
  .meta-item {{
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--muted);
  }}
  .meta-item strong {{ color: var(--accent2); }}
  .total-badge {{
    background: var(--accent);
    color: #000;
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 700;
    padding: 8px 20px;
    border-radius: 4px;
    text-align: center;
    line-height: 1;
    min-width: 80px;
  }}
  .total-badge small {{ display: block; font-size: 10px; letter-spacing: 1px; margin-top: 2px; }}

  /* STATS ROW */
  .stats-row {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
    margin-bottom: 24px;
  }}
  .stat-card {{
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }}
  .stat-card::before {{
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--player-color, var(--accent2));
  }}
  .stat-card:hover {{ border-color: var(--player-color, var(--accent2)); transform: translateY(-1px); }}
  .stat-card.active {{ border-color: var(--player-color, var(--accent2)); background: var(--bg3); }}
  .stat-card .player-name {{
    font-size: 14px;
    font-weight: 700;
    color: var(--player-color, var(--text));
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }}
  .stat-card .player-stats {{
    display: flex;
    gap: 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--muted);
  }}
  .stat-card .stat-num {{ font-size: 20px; font-weight: 700; color: #fff; display: block; }}

  /* TIMELINE */
  .timeline-wrap {{
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 14px 16px;
    margin-bottom: 24px;
  }}
  .timeline-label {{ font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin-bottom: 10px; letter-spacing: 1px; }}
  .timeline {{
    position: relative;
    height: 40px;
    background: var(--bg);
    border-radius: 3px;
    overflow: hidden;
  }}
  .timeline-bar {{
    position: absolute;
    top: 0; bottom: 0;
    background: var(--border);
    width: 1px;
  }}
  .timeline-dot {{
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px; height: 10px;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.15s;
    z-index: 2;
  }}
  .timeline-dot:hover {{ transform: translate(-50%, -50%) scale(1.8); }}
  .timeline-dot .tip {{
    display: none;
    position: absolute;
    bottom: 140%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 4px 8px;
    border-radius: 3px;
    white-space: nowrap;
    z-index: 10;
  }}
  .timeline-dot:hover .tip {{ display: block; }}

  /* FILTERS */
  .filters {{ display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }}
  .filter-label {{ font-family: var(--font-mono); font-size: 11px; color: var(--muted); letter-spacing: 1px; padding-right: 4px; }}
  .filter-btn {{
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: 0.05em;
    transition: all 0.15s;
    text-transform: uppercase;
  }}
  .filter-btn:hover {{ border-color: var(--accent); color: var(--accent); }}
  .filter-btn.active {{ background: var(--accent); border-color: var(--accent); color: #000; font-weight: 700; }}

  /* HIGHLIGHT LIST */
  .list-header {{
    display: grid;
    grid-template-columns: 40px 130px 70px 70px 140px 1fr 90px;
    gap: 8px;
    padding: 8px 14px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }}
  .highlight-row {{
    display: grid;
    grid-template-columns: 40px 130px 70px 70px 140px 1fr 90px;
    gap: 8px;
    padding: 11px 14px;
    background: var(--bg2);
    border: 1px solid transparent;
    border-left: 3px solid var(--row-color, var(--border));
    border-radius: 5px;
    margin-bottom: 5px;
    cursor: pointer;
    transition: all 0.15s;
    align-items: center;
    animation: fadeIn 0.3s ease both;
  }}
  .highlight-row:hover {{ border-color: var(--row-color, var(--accent)); background: var(--bg3); }}
  .highlight-row.expanded {{ border-color: var(--row-color, var(--accent)); background: var(--bg3); border-radius: 5px 5px 0 0; margin-bottom: 0; }}
  @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(4px); }} to {{ opacity: 1; transform: translateY(0); }} }}

  .row-emoji {{ font-size: 20px; text-align: center; }}
  .row-type {{
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--row-color);
    background: color-mix(in srgb, var(--row-color) 15%, transparent);
    padding: 3px 8px;
    border-radius: 3px;
    text-align: center;
    letter-spacing: 0.05em;
  }}
  .row-time {{ font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: #fff; }}
  .row-round {{ font-family: var(--font-mono); font-size: 12px; color: var(--muted); }}
  .row-player {{ font-size: 14px; font-weight: 700; color: var(--player-color, var(--text)); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
  .row-desc {{ font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
  .row-score {{ display: flex; align-items: center; gap: 8px; }}
  .score-bar-wrap {{ flex: 1; height: 4px; background: var(--bg); border-radius: 2px; overflow: hidden; }}
  .score-bar {{ height: 100%; background: var(--row-color); border-radius: 2px; transition: width 0.5s ease; }}
  .score-num {{ font-family: var(--font-mono); font-size: 12px; color: var(--row-color); font-weight: 700; min-width: 24px; text-align: right; }}

  /* COPY BUTTON */
  .copy-btn {{
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.5px;
  }}
  .copy-btn:hover {{ border-color: var(--accent2); color: var(--accent2); }}
  .copy-btn.copied {{ border-color: var(--green); color: var(--green); }}

  /* EXPAND PANEL */
  .expand-panel {{
    background: var(--bg3);
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 5px 5px;
    padding: 14px 16px;
    margin-bottom: 5px;
    display: none;
  }}
  .expand-panel.open {{ display: block; }}
  .expand-panel .kill-list {{ display: flex; flex-direction: column; gap: 6px; }}
  .kill-item {{
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 10px;
    background: var(--bg);
    border-radius: 3px;
    border-left: 2px solid var(--border);
  }}
  .kill-item .kill-weapon {{ color: var(--accent); min-width: 140px; }}
  .kill-item .kill-victim {{ color: var(--text); }}
  .kill-item .kill-hs {{ color: var(--gold); font-size: 10px; }}
  .kill-item .kill-tick {{ color: var(--muted); margin-left: auto; }}
  .extra-info {{ margin-top: 10px; font-family: var(--font-mono); font-size: 11px; color: var(--muted); display: flex; gap: 16px; flex-wrap: wrap; }}
  .extra-info span {{ color: var(--accent2); }}

  /* EMPTY */
  .empty {{ text-align: center; padding: 60px; color: var(--border); font-family: var(--font-mono); font-size: 14px; }}

  /* RESULT COUNT */
  .result-count {{ font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin-bottom: 10px; }}
  .result-count strong {{ color: var(--accent2); }}
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <div class="header-left">
      <h1>CS2 <span>HIGHLIGHTS</span></h1>
      <div class="header-meta">
        <div class="meta-item">DEMO: <strong id="demoName">{demo_name}</strong></div>
        <div class="meta-item">MAP: <strong id="mapName">{map_name.upper()}</strong></div>
        <div class="meta-item">VARIGHED: <strong>{duration_min} MIN</strong></div>
      </div>
    </div>
    <div class="total-badge">
      <span id="totalCount">{len(highlights)}</span>
      <small>HIGHLIGHTS</small>
    </div>
  </div>

  <div class="stats-row" id="playerStats"></div>

  <div class="timeline-wrap">
    <div class="timeline-label">HIGHLIGHT TIDSLINJE — {duration_min} MIN</div>
    <div class="timeline" id="timeline"></div>
  </div>

  <div class="filters">
    <span class="filter-label">TYPE:</span>
    <button class="filter-btn active" data-type="ALL" onclick="setTypeFilter('ALL', this)">ALLE</button>
    <button class="filter-btn" data-type="ACE" onclick="setTypeFilter('ACE', this)">ACE</button>
    <button class="filter-btn" data-type="MULTIKILL" onclick="setTypeFilter('MULTIKILL', this)">MULTIKILL</button>
    <button class="filter-btn" data-type="CLUTCH" onclick="setTypeFilter('CLUTCH', this)">CLUTCH</button>
    <button class="filter-btn" data-type="KNIFE_KILL" onclick="setTypeFilter('KNIFE_KILL', this)">KNIFE</button>
    <button class="filter-btn" data-type="DEAGLE_HEADSHOT" onclick="setTypeFilter('DEAGLE_HEADSHOT', this)">DEAGLE HS</button>
    <button class="filter-btn" data-type="FAST_SPRAY" onclick="setTypeFilter('FAST_SPRAY', this)">FAST SPRAY</button>
    <button class="filter-btn" data-type="QUICK_REACTION" onclick="setTypeFilter('QUICK_REACTION', this)">QUICK RXN</button>
  </div>

  <div class="list-header">
    <div></div>
    <div>TYPE</div>
    <div>TID</div>
    <div>RUNDE</div>
    <div>SPILLER</div>
    <div>BESKRIVELSE</div>
    <div>SCORE</div>
  </div>

  <div class="result-count" id="resultCount"></div>
  <div id="highlightList"></div>

</div>

<script>
const ALL_HIGHLIGHTS = {highlights_json};
const PLAYERS = {players_json};

const TYPE_CONFIG = {{
  "ACE":             {{ emoji: "🏆", label: "ACE",        color: "#ffd700" }},
  "MULTIKILL_4K":    {{ emoji: "💥", label: "4K",         color: "#ff4444" }},
  "MULTIKILL_3K":    {{ emoji: "🎯", label: "3K",         color: "#ff8c00" }},
  "CLUTCH_1v4":      {{ emoji: "😤", label: "1v4 CLUTCH", color: "#c084fc" }},
  "CLUTCH_1v3":      {{ emoji: "😤", label: "1v3 CLUTCH", color: "#c084fc" }},
  "CLUTCH_1v2":      {{ emoji: "💪", label: "1v2 CLUTCH", color: "#818cf8" }},
  "KNIFE_KILL":      {{ emoji: "🔪", label: "KNIFE",      color: "#34d399" }},
  "DEAGLE_HEADSHOT": {{ emoji: "💀", label: "DEAGLE HS",  color: "#f87171" }},
  "FAST_SPRAY":      {{ emoji: "⚡", label: "FAST SPRAY", color: "#22d3ee" }},
  "QUICK_REACTION":  {{ emoji: "⏱️", label: "QUICK RXN", color: "#94a3b8" }},
}};

const PLAYER_COLORS = ["#22d3ee","#ffd700","#34d399","#f87171","#c084fc","#fb923c","#a3e635","#f472b6"];
const playerColorMap = {{}};
PLAYERS.forEach((p, i) => {{ playerColorMap[p.name] = PLAYER_COLORS[i % PLAYER_COLORS.length]; }});

let activeType = "ALL";
let activePlayer = "ALL";
let expandedIdx = null;

function getCfg(type) {{
  return TYPE_CONFIG[type] || {{ emoji: "🎮", label: type.replace(/_/g,' '), color: "#94a3b8" }};
}}

function setTypeFilter(type, btn) {{
  activeType = type;
  document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  expandedIdx = null;
  render();
}}

function setPlayerFilter(name) {{
  activePlayer = activePlayer === name ? "ALL" : name;
  expandedIdx = null;
  renderPlayerStats();
  render();
}}

function filtered() {{
  return ALL_HIGHLIGHTS.filter(h => {{
    const typeOk = activeType === "ALL" || h.type === activeType || h.type.startsWith(activeType);
    const playerOk = activePlayer === "ALL" || h.attacker === activePlayer;
    return typeOk && playerOk;
  }});
}}

function renderPlayerStats() {{
  const container = document.getElementById('playerStats');
  const playerHighlights = {{}};
  ALL_HIGHLIGHTS.forEach(h => {{
    if (!playerHighlights[h.attacker]) playerHighlights[h.attacker] = {{ count: 0, topScore: 0 }};
    playerHighlights[h.attacker].count++;
    if (h.score > playerHighlights[h.attacker].topScore) playerHighlights[h.attacker].topScore = h.score;
  }});

  const sorted = Object.entries(playerHighlights).sort((a,b) => b[1].count - a[1].count);
  container.innerHTML = sorted.map(([name, stats]) => {{
    const color = playerColorMap[name] || '#94a3b8';
    const isActive = activePlayer === name;
    return `<div class="stat-card ${{isActive ? 'active' : ''}}" style="--player-color:${{color}}" onclick="setPlayerFilter('${{name}}')">
      <div class="player-name">${{name}}</div>
      <div class="player-stats">
        <div><span class="stat-num">${{stats.count}}</span>highlights</div>
        <div><span class="stat-num">${{stats.topScore}}</span>top score</div>
      </div>
    </div>`;
  }}).join('');
}}

function renderTimeline() {{
  const timeline = document.getElementById('timeline');
  const maxTick = Math.max(...ALL_HIGHLIGHTS.map(h => h.tick || 0), 1);

  // Round markers every 10%
  let bars = '';
  for (let i = 1; i < 10; i++) {{
    bars += `<div class="timeline-bar" style="left:${{i*10}}%"></div>`;
  }}

  const dots = ALL_HIGHLIGHTS.map(h => {{
    const cfg = getCfg(h.type);
    const pct = Math.min(99, (h.tick / maxTick) * 100);
    return `<div class="timeline-dot" style="left:${{pct}}%;background:${{cfg.color}}">
      <div class="tip">${{h.timestamp_fmt}} R${{h.round}} — ${{cfg.label}} (${{h.attacker}})</div>
    </div>`;
  }}).join('');

  timeline.innerHTML = bars + dots;
}}

function copyTimestamp(ts, btn) {{
  navigator.clipboard.writeText(ts).then(() => {{
    btn.textContent = 'KOPIERET';
    btn.classList.add('copied');
    setTimeout(() => {{ btn.textContent = 'KOPIER TID'; btn.classList.remove('copied'); }}, 1500);
  }});
}}

function toggleExpand(idx) {{
  expandedIdx = expandedIdx === idx ? null : idx;
  render();
}}

function renderKills(h) {{
  if (!h.kills || !h.kills.length) return '<div style="color:var(--muted);font-family:var(--font-mono);font-size:12px">Ingen kill-detaljer tilgængelige</div>';
  return h.kills.map(k => {{
    const weapon = k.weapon || 'unknown';
    const victim = k.victim_name || k.user_name || '?';
    const hs = k.headshot ? '<span class="kill-hs">★ HEADSHOT</span>' : '';
    const tick = k.tick ? `tick ${{k.tick}}` : '';
    return `<div class="kill-item">
      <span class="kill-weapon">${{weapon.replace('weapon_','')}}</span>
      <span class="kill-victim">→ ${{victim}}</span>
      ${{hs}}
      <span class="kill-tick">${{tick}}</span>
    </div>`;
  }}).join('');
}}

function renderExtra(h) {{
  const parts = [];
  if (h.extra) {{
    if (h.extra.enemies_at_clutch_start) parts.push(`Clutch mod <span>${{h.extra.enemies_at_clutch_start}} spillere</span>`);
    if (h.extra.time_between_kills_sec) parts.push(`Tid mellem kills: <span>${{h.extra.time_between_kills_sec}}s</span>`);
    if (h.extra.reaction_ms) parts.push(`Reaktionstid: <span>${{h.extra.reaction_ms}}ms</span>`);
  }}
  if (h.kill_count) parts.push(`Kills: <span>${{h.kill_count}}</span>`);
  return parts.length ? `<div class="extra-info">${{parts.join(' &nbsp;·&nbsp; ')}}</div>` : '';
}}

function render() {{
  const list = document.getElementById('highlightList');
  const data = filtered();

  document.getElementById('resultCount').innerHTML = `Viser <strong>${{data.length}}</strong> af ${{ALL_HIGHLIGHTS.length}} highlights`;

  if (!data.length) {{
    list.innerHTML = '<div class="empty">// INGEN HIGHLIGHTS MATCHER FILTERET</div>';
    return;
  }}

  list.innerHTML = data.map((h, i) => {{
    const cfg = getCfg(h.type);
    const pcolor = playerColorMap[h.attacker] || '#94a3b8';
    const isExp = expandedIdx === i;
    const scorePct = Math.min(100, h.score);

    const row = `<div class="highlight-row ${{isExp ? 'expanded' : ''}}" 
      style="--row-color:${{cfg.color}};--player-color:${{pcolor}}" 
      onclick="toggleExpand(${{i}})">
      <div class="row-emoji">${{cfg.emoji}}</div>
      <div class="row-type">${{cfg.label}}</div>
      <div class="row-time">${{h.timestamp_fmt}}</div>
      <div class="row-round">RND ${{h.round}}</div>
      <div class="row-player">${{h.attacker}}</div>
      <div class="row-desc">${{h.description}}</div>
      <div class="row-score">
        <div class="score-bar-wrap"><div class="score-bar" style="width:${{scorePct}}%"></div></div>
        <span class="score-num">${{h.score}}</span>
      </div>
    </div>`;

    const panel = `<div class="expand-panel ${{isExp ? 'open' : ''}}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted)">
          ${{cfg.emoji}} ${{h.description}}
        </div>
        <button class="copy-btn" onclick="event.stopPropagation();copyTimestamp('${{h.timestamp_fmt}}', this)">KOPIER TID</button>
      </div>
      <div class="kill-list">${{renderKills(h)}}</div>
      ${{renderExtra(h)}}
    </div>`;

    return row + panel;
  }}).join('');
}}

// Init
renderPlayerStats();
renderTimeline();
render();
</script>
</body>
</html>"""
