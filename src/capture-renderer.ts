export {};

const canvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const toolbarEl = document.getElementById('toolbar') as HTMLElement;
const captureCountEl = document.getElementById('capture-count')!;
const btnCapture = document.getElementById('btn-capture') as HTMLButtonElement;
const btnDone = document.getElementById('btn-done') as HTMLButtonElement;
const btnCancel = document.getElementById('btn-cancel') as HTMLButtonElement;

const api = window.captureAPI!;

type Phase = 'selecting' | 'ready';

let phase: Phase = 'selecting';
let sel = { x: 0, y: 0, w: 0, h: 0 };
let isSelecting = false;
let startX = 0, startY = 0;
const captures: string[] = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (sel.w > 0 && sel.h > 0) {
    // Punch a hole so the screen shows through the transparent window
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(sel.x - 1, sel.y - 1, sel.w + 2, sel.h + 2);
    ctx.setLineDash([]);

    if (phase === 'selecting' && isSelecting) {
      const label = `${Math.round(sel.w)} × ${Math.round(sel.h)}`;
      ctx.font = 'bold 12px -apple-system, sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = sel.x + sel.w / 2;
      const ly = sel.y > 26 ? sel.y - 8 : sel.y + sel.h + 18;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (...args: unknown[]) => void })
        .roundRect(lx - tw / 2 - 7, ly - 15, tw + 14, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, lx, ly);
      ctx.textAlign = 'left';
    }
  }

  if (phase === 'selecting' && !isSelecting && sel.w === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drag to select an area  ·  ESC to cancel', canvas.width / 2, 30);
    ctx.textAlign = 'left';
  }
}

function updateCount() {
  const n = captures.length;
  captureCountEl.textContent = n === 0 ? 'No captures' : `${n} capture${n !== 1 ? 's' : ''}`;
  btnDone.disabled = n === 0;
}

function positionToolbar() {
  requestAnimationFrame(() => {
    const tbRect = toolbarEl.getBoundingClientRect();
    const margin = 10;
    let left = sel.x + sel.w / 2 - tbRect.width / 2;
    let top = sel.y + sel.h + margin;
    if (top + tbRect.height > window.innerHeight - margin) {
      top = sel.y - tbRect.height - margin;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - tbRect.width - margin));
    top = Math.max(margin, top);
    toolbarEl.style.left = `${left}px`;
    toolbarEl.style.top = `${top}px`;
  });
}

canvas.addEventListener('mousedown', e => {
  if (phase !== 'selecting') return;
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;
  sel = { x: startX, y: startY, w: 0, h: 0 };
  toolbarEl.classList.remove('visible');
});

canvas.addEventListener('mousemove', e => {
  if (!isSelecting) return;
  sel = {
    x: Math.min(e.clientX, startX),
    y: Math.min(e.clientY, startY),
    w: Math.abs(e.clientX - startX),
    h: Math.abs(e.clientY - startY),
  };
  draw();
});

canvas.addEventListener('mouseup', () => {
  if (!isSelecting) return;
  isSelecting = false;
  if (sel.w < 10 || sel.h < 10) {
    sel = { x: 0, y: 0, w: 0, h: 0 };
    draw();
    return;
  }
  phase = 'ready';
  canvas.classList.add('ready');
  draw();
  toolbarEl.classList.add('visible');
  updateCount();
  positionToolbar();
  // Let scroll events pass through to the underlying window by default.
  // Mouse events are re-enabled only while the cursor is over the toolbar.
  api.setIgnoreMouseEvents(true);
});

// While in ready phase, toggle click-through based on whether the cursor is
// over the toolbar. `forward: true` keeps mousemove firing even when ignored.
document.addEventListener('mousemove', e => {
  if (phase !== 'ready') return;
  const r = toolbarEl.getBoundingClientRect();
  const overToolbar = e.clientX >= r.left && e.clientX <= r.right &&
                      e.clientY >= r.top  && e.clientY <= r.bottom;
  api.setIgnoreMouseEvents(!overToolbar);
});

async function stitchAndSend() {
  const images = await Promise.all(
    captures.map(url => new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    }))
  );
  const w = images[0].naturalWidth;
  const h = images.reduce((s, img) => s + img.naturalHeight, 0);
  const sc = document.createElement('canvas');
  sc.width = w;
  sc.height = h;
  const sctx = sc.getContext('2d')!;
  let y = 0;
  for (const img of images) {
    sctx.drawImage(img, 0, y);
    y += img.naturalHeight;
  }
  api.updateCapture(sc.toDataURL('image/png'));
}

btnCapture.addEventListener('click', async () => {
  btnCapture.disabled = true;
  btnCapture.textContent = 'Capturing…';
  try {
    const dataUrl = await api.captureArea({ x: sel.x, y: sel.y, width: sel.w, height: sel.h });
    captures.push(dataUrl);
    updateCount();
    await stitchAndSend();
  } catch (err) {
    console.error('Capture failed:', err);
  } finally {
    btnCapture.disabled = false;
    btnCapture.textContent = 'Capture';
  }
});

btnDone.addEventListener('click', () => api.close());

btnCancel.addEventListener('click', () => api.close());

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') api.close();
});

window.addEventListener('resize', resize);
resize();
