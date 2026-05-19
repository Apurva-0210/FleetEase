import React from 'react';

// SeatMap supports three layouts
// layoutType: '2x2' | '2x1_sleeper' | '2x1_luxury'
// rows: number of rows per deck (default 10)
// upperDeck: whether to show upper deck (for sleeper types)
export default function SeatMap({ layoutType='2x2', rows=10, upperDeck=false, selected=[], onToggle=()=>{}, disabledSeats=[] }){
  const buildLayout = (type, rows, deckLabel='L') => {
    const items = [];
    if (type === '2x2') {
      // seats per row: Aisle between 2 | 2
      for (let r=1; r<=rows; r++) {
        items.push(`${deckLabel}${r}A`);
        items.push(`${deckLabel}${r}B`);
        items.push(null); // aisle spacer
        items.push(`${deckLabel}${r}C`);
        items.push(`${deckLabel}${r}D`);
      }
      return { cols:5, items };
    }
    // 2x1 sleeper (two on left, one on right)
    if (type === '2x1_sleeper' || type === '2x1_luxury') {
      for (let r=1; r<=rows; r++) {
        items.push(`${deckLabel}${r}A`);
        items.push(`${deckLabel}${r}B`);
        items.push(null);
        items.push(`${deckLabel}${r}U`);
      }
      return { cols:4, items };
    }
    // fallback grid
    const total = rows*4;
    return { cols:4, items: Array.from({length: total}, (_,i)=> `${deckLabel}${i+1}`) };
  };

  const lower = buildLayout(layoutType, rows, 'L');
  const upper = upperDeck ? buildLayout(layoutType, rows, 'U') : null;

  const ds = new Set((disabledSeats||[]).map(s=> String(s).toUpperCase()));
  const SeatButton = ({label}) => {
    const isSel = selected.includes(label);
    const isDis = ds.has(String(label).toUpperCase());
    return (
      <button
        className={`btn ${isDis? 'btn-secondary' : (isSel? 'btn-success' : 'btn-outline-secondary')}`}
        style={{height:42, opacity: isDis ? 0.6 : 1, cursor: isDis ? 'not-allowed' : 'pointer'}}
        onClick={()=>{ if (!isDis) onToggle(label); }}
        disabled={isDis}
      >{label}</button>
    );
  };

  const Grid = ({layout}) => (
    <div className="d-grid mb-3" style={{gridTemplateColumns:`repeat(${layout.cols}, 56px)`, gap:8}}>
      {layout.items.map((lab, idx)=> lab ? <SeatButton key={lab} label={lab}/> : <div key={`sp${idx}`} />)}
    </div>
  );

  return (
    <div>
      <div className="d-flex align-items-center mb-2">
        <span className="badge bg-secondary me-2">Layout</span>
        <code>{layoutType}{upperDeck? ' (upper/lower)' : ''}</code>
      </div>
      <Grid layout={lower} />
      {upper && (
        <>
          <div className="text-muted mb-1">Upper Deck</div>
          <Grid layout={upper} />
        </>
      )}
    </div>
  );
}
