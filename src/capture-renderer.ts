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
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const HANDLE_HIT = 8;
const HANDLE_SIZE = 7;

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize', n: 'ns-resize',  ne: 'nesw-resize',
  w:  'ew-resize',                     e: 'ew-resize',
  sw: 'nesw-resize', s: 'ns-resize',  se: 'nwse-resize',
};

let phase: Phase = 'selecting';
let sel = { x: 0, y: 0, w: 0, h: 0 };
let isSelecting = false;
let startX = 0, startY = 0;
const captures: string[] = [];

let isResizing = false;
let activeHandle: ResizeHandle | null = null;
let resizeDragStart = { x: 0, y: 0, sel: { x: 0, y: 0, w: 0, h: 0 } };

function getHandlePositions(): Record<ResizeHandle, { x: number; y: number }> {
  return {
    nw: { x: sel.x,             y: sel.y             },
    n:  { x: sel.x + sel.w / 2, y: sel.y             },
    ne: { x: sel.x + sel.w,     y: sel.y             },
    w:  { x: sel.x,             y: sel.y + sel.h / 2 },
    e:  { x: sel.x + sel.w,     y: sel.y + sel.h / 2 },
    sw: { x: sel.x,             y: sel.y + sel.h     },
    s:  { x: sel.x + sel.w / 2, y: sel.y + sel.h     },
    se: { x: sel.x + sel.w,     y: sel.y + sel.h     },
  };
}

function getHandleAtPoint(mx: number, my: number): ResizeHandle | null {
  if (sel.w === 0 || sel.h === 0) return null;
  const positions = getHandlePositions();
  for (const [key, pos] of Object.entries(positions) as [ResizeHandle, { x: number; y: number }][]) {
    if (Math.abs(mx - pos.x) <= HANDLE_HIT && Math.abs(my - pos.y) <= HANDLE_HIT) {
      return key;
    }
  }
  return null;
}

function applyResize(handle: ResizeHandle, dx: number, dy: number) {
  const o = resizeDragStart.sel;
  let x = o.x, y = o.y, w = o.w, h = o.h;

  if (handle === 'e' || handle === 'ne' || handle === 'se') w = Math.max(10, o.w + dx);
  if (handle === 's' || handle === 'sw' || handle === 'se') h = Math.max(10, o.h + dy);
  if (handle === 'w' || handle === 'nw' || handle === 'sw') {
    const newW = Math.max(10, o.w - dx);
    x = o.x + (o.w - newW);
    w = newW;
  }
  if (handle === 'n' || handle === 'nw' || handle === 'ne') {
    const newH = Math.max(10, o.h - dy);
    y = o.y + (o.h - newH);
    h = newH;
  }

  sel = { x: Math.max(0, x), y: Math.max(0, y), w, h };
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function drawHandles() {
  const positions = getHandlePositions();
  const hs = HANDLE_SIZE;
  ctx.lineWidth = 1.5;
  for (const pos of Object.values(positions)) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
    ctx.strokeStyle = '#007AFF';
    ctx.strokeRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (sel.w > 0 && sel.h > 0) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = '#007AFF';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(sel.x - 1, sel.y - 1, sel.w + 2, sel.h + 2);
    ctx.setLineDash([]);

    if (phase === 'ready') drawHandles();

    if ((phase === 'selecting' && isSelecting) || isResizing) {
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
  if (phase === 'selecting') {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    sel = { x: startX, y: startY, w: 0, h: 0 };
    toolbarEl.classList.remove('visible');
  } else if (phase === 'ready') {
    const handle = getHandleAtPoint(e.clientX, e.clientY);
    if (handle) {
      isResizing = true;
      activeHandle = handle;
      resizeDragStart = { x: e.clientX, y: e.clientY, sel: { ...sel } };
      toolbarEl.classList.remove('visible');
    }
  }
});

canvas.addEventListener('mousemove', e => {
  if (isSelecting) {
    sel = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      w: Math.abs(e.clientX - startX),
      h: Math.abs(e.clientY - startY),
    };
    draw();
  } else if (isResizing && activeHandle) {
    applyResize(activeHandle, e.clientX - resizeDragStart.x, e.clientY - resizeDragStart.y);
    draw();
  }
});

canvas.addEventListener('mouseup', () => {
  if (isSelecting) {
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
    api.setIgnoreMouseEvents(true);
  } else if (isResizing) {
    isResizing = false;
    activeHandle = null;
    toolbarEl.classList.add('visible');
    positionToolbar();
    api.setIgnoreMouseEvents(true);
  }
});

// In ready phase, enable mouse events over toolbar or height handles; otherwise pass through.
document.addEventListener('mousemove', e => {
  if (phase !== 'ready') return;
  if (isResizing) return;

  const r = toolbarEl.getBoundingClientRect();
  const overToolbar = e.clientX >= r.left && e.clientX <= r.right &&
                      e.clientY >= r.top  && e.clientY <= r.bottom;
  const handle = getHandleAtPoint(e.clientX, e.clientY);

  if (overToolbar) {
    canvas.style.cursor = '';
    api.setIgnoreMouseEvents(false);
  } else if (handle) {
    canvas.style.cursor = HANDLE_CURSORS[handle];
    api.setIgnoreMouseEvents(false);
  } else {
    canvas.style.cursor = '';
    api.setIgnoreMouseEvents(true);
  }
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
